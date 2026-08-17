// GameHub TTS Test v0.10
//
// Key change from v0.9:
// use the SAME matched Sherpa browser build for every runtime component.
//
// v0.9 mixed model-package glue with runtime exports and produced:
// "call_indirect to a signature that does not match".
//
// v0.10 points sherpa-onnx-wasm-main-tts.js, sherpa-onnx-tts.js,
// sherpa-onnx-wasm-main-tts.wasm and sherpa-onnx-wasm-main-tts.data
// at the official k2-fsa WebAssembly TTS Space repository so all pieces
// come from one build.

var SHERPA_BASE =
  "https://huggingface.co/spaces/k2-fsa/web-assembly-tts-sherpa-onnx-en/resolve/main/";

var sentences = [
  "Hello, how are you?",
  "The little fox looked up at the moon and wondered what adventures tomorrow might bring.",
  "There are twelve apples in the basket. If we use four, how many apples are left?",
  "Maya has three boxes with five pencils in each box. How many pencils does she have altogether?",
  "Please read this sentence carefully, then choose the word that makes the most sense.",
  "At half past seven in the morning, Sam packed a blue coat, two sandwiches, and a bottle of water for the journey."
];

var installState = document.querySelector("#installState");
var engineState = document.querySelector("#engineState");
var sentenceNumber = document.querySelector("#sentenceNumber");
var sentenceText = document.querySelector("#sentenceText");
var previousSentence = document.querySelector("#previousSentence");
var nextSentence = document.querySelector("#nextSentence");
var speakButton = document.querySelector("#speakButton");
var speedInput = document.querySelector("#speedInput");
var speedReadout = document.querySelector("#speedReadout");
var statusText = document.querySelector("#statusText");
var statusDetail = document.querySelector("#statusDetail");
var meterFill = document.querySelector("#meterFill");
var loadTime = document.querySelector("#loadTime");
var generationTime = document.querySelector("#generationTime");
var audioLength = document.querySelector("#audioLength");
var detailsToggle = document.querySelector("#detailsToggle");
var details = document.querySelector("#details");
var diagnosticLog = document.querySelector("#diagnosticLog");
var copyLogButton = document.querySelector("#copyLogButton");

var sentenceIndex = 0;
var loadStarted = 0;
var diagnosticLines = [];
var firstFailure = null;
var currentSource = null;
var audioContext = null;
var initStarted = false;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}
installState.textContent = isStandalone() ? "Home Screen" : "Web page";

function diag(label, value) {
  var elapsed = loadStarted ? ((performance.now() - loadStarted) / 1000).toFixed(2) : "0.00";
  var text = "[" + elapsed + "s] " + label;
  if (value !== undefined) {
    if (value instanceof Error) {
      text += ": " + value.name + ": " + value.message;
      if (value.stack) text += "\n" + value.stack;
    } else if (typeof value === "object") {
      try { text += ": " + JSON.stringify(value); }
      catch (_) { text += ": " + String(value); }
    } else {
      text += ": " + String(value);
    }
  }
  diagnosticLines.push(text);
  if (diagnosticLog) {
    diagnosticLog.textContent = diagnosticLines.join("\n");
    diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
  }
  console.log("[TTS diagnostic]", text);
}

if (copyLogButton) {
  copyLogButton.addEventListener("click", async function() {
    try {
      await navigator.clipboard.writeText(diagnosticLines.join("\n"));
      copyLogButton.textContent = "Copied";
      setTimeout(function(){ copyLogButton.textContent = "Copy"; }, 1200);
    } catch (_) {
      copyLogButton.textContent = "Screenshot";
    }
  });
}

window.addEventListener("error", function(event) {
  diag("WINDOW ERROR", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener("unhandledrejection", function(event) {
  diag("UNHANDLED PROMISE", event.reason instanceof Error ? event.reason : String(event.reason));
});

function setStatus(title, detail, progress) {
  statusText.textContent = title;
  statusDetail.textContent = detail;
  if (typeof progress === "number") {
    meterFill.style.width = Math.max(0, Math.min(100, progress)) + "%";
  }
}

function setEngineState(text, stateClass) {
  engineState.textContent = text;
  engineState.classList.remove("loading", "ready", "error");
  engineState.classList.add(stateClass);
}

function renderSentence() {
  sentenceText.textContent = sentences[sentenceIndex];
  sentenceNumber.textContent = (sentenceIndex + 1) + " / " + sentences.length;
}
function moveSentence(delta) {
  sentenceIndex = (sentenceIndex + delta + sentences.length) % sentences.length;
  renderSentence();
}
previousSentence.addEventListener("click", function(){ moveSentence(-1); });
nextSentence.addEventListener("click", function(){ moveSentence(1); });

speedInput.addEventListener("input", function() {
  speedReadout.textContent = Number(speedInput.value).toFixed(2) + "×";
});

detailsToggle.addEventListener("click", function() {
  var show = details.hidden;
  details.hidden = !show;
  detailsToggle.textContent = show ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(show));
});

function failLoad(message) {
  if (!firstFailure) firstFailure = message;
  diag("FIRST LOAD FAILURE", message);
  setEngineState("Load failed", "error");
  setStatus("Could not prepare Sherpa", message, 0);
  speakButton.disabled = true;
  speakButton.textContent = "Voice failed to load";
}

function stopAudio() {
  if (currentSource) {
    try { currentSource.stop(); } catch (_) {}
    currentSource = null;
  }
}

function playAudio(result) {
  stopAudio();
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: result.sampleRate
    });
  }
  if (audioContext.state === "suspended") audioContext.resume();

  var buffer = audioContext.createBuffer(1, result.samples.length, result.sampleRate);
  buffer.getChannelData(0).set(result.samples);
  currentSource = audioContext.createBufferSource();
  currentSource.buffer = buffer;
  currentSource.connect(audioContext.destination);
  currentSource.start();
  currentSource.onended = function() {
    currentSource = null;
    setStatus("Ready", "Choose another sentence or play this one again.", 100);
  };
}

// This is deliberately simple and mirrors the official demo pattern.
// Emscripten asks locateFile() for both the .wasm and the packed .data file.
var Module = {
  locateFile: function(path) {
    var resolved = SHERPA_BASE + path;
    diag("locateFile", path + " -> " + resolved);
    return resolved;
  },

  setStatus: function(text) {
    diag("Module.setStatus", text || "(empty)");

    if (!text) {
      initTts();
      return;
    }

    var m = text.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
    if (m) {
      var loaded = parseInt(m[1], 10);
      var total = parseInt(m[2], 10);
      var pct = total ? (loaded / total * 100) : 0;
      setEngineState("Loading voice " + pct.toFixed(0) + "%", "loading");
      setStatus(
        "Loading matched Sherpa bundle…",
        "The model is downloading in the background while you choose a sentence.",
        10 + pct * 0.75
      );
    } else {
      setEngineState("Preparing voice…", "loading");
      setStatus("Preparing Sherpa…", text, 8);
    }
  },

  onAbort: function(reason) {
    failLoad("Sherpa stopped: " + reason);
  }
};
window.Module = Module;

function initTts() {
  if (initStarted || window._tts) return;
  initStarted = true;

  try {
    diag("Creating OfflineTts", {
      createOfflineTts: typeof window.createOfflineTts,
      calledRun: !!Module.calledRun
    });

    setEngineState("Starting voice…", "loading");
    setStatus(
      "Starting voice…",
      "All runtime files are from the same official Sherpa browser build.",
      92
    );

    var t0 = performance.now();

    // Configuration follows sherpa-onnx's standard WASM Piper/VITS example.
    window._tts = createOfflineTts(Module, {
      offlineTtsModelConfig: {
        offlineTtsVitsModelConfig: {
          model: "./model.onnx",
          lexicon: "",
          tokens: "./tokens.txt",
          dataDir: "./espeak-ng-data",
          dictDir: "",
          noiseScale: 0.667,
          noiseScaleW: 0.8,
          lengthScale: 1.0
        },
        numThreads: 1,
        debug: 1,
        provider: "cpu"
      },
      ruleFsts: "",
      ruleFars: "",
      maxNumSentences: 1
    });

    var createMs = performance.now() - t0;
    var totalMs = performance.now() - loadStarted;

    diag("OfflineTts ready", {
      sampleRate: window._tts.sampleRate,
      numSpeakers: window._tts.numSpeakers,
      createMs: Math.round(createMs)
    });

    loadTime.textContent = (totalMs / 1000).toFixed(2) + " s";
    speakButton.disabled = false;
    speakButton.textContent = "Speak sentence";
    setEngineState("Voice ready", "ready");
    setStatus(
      "Ready",
      "The official matched Sherpa build is loaded. Try the sentences below.",
      100
    );
  } catch (error) {
    initStarted = false;
    failLoad(error && error.message ? error.message : String(error));
  }
}

function loadScript(url) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement("script");
    s.src = url;
    s.async = false;
    s.onload = function(){ diag("Loaded script", url); resolve(); };
    s.onerror = function(){ reject(new Error("Could not load " + url)); };
    document.body.appendChild(s);
  });
}

async function prepareSherpa() {
  loadStarted = performance.now();
  diagnosticLines.length = 0;
  diag("START v0.10");
  diag("Matched build base", SHERPA_BASE);

  try {
    setEngineState("Loading engine…", "loading");
    setStatus(
      "Loading Sherpa in background…",
      "The page is usable while the official matched runtime starts.",
      6
    );

    await loadScript(SHERPA_BASE + "sherpa-onnx-wasm-main-tts.js");
    await loadScript(SHERPA_BASE + "sherpa-onnx-tts.js");

    // The Emscripten setStatus('') callback normally initializes TTS.
    // If it already happened before the helper script finished loading,
    // retry now only if the engine is not already present.
    setTimeout(function() {
      if (!window._tts &&
          typeof window.createOfflineTts === "function" &&
          Module.calledRun) {
        diag("Post-helper init retry");
        initTts();
      }
    }, 100);
  } catch (error) {
    failLoad(error && error.message ? error.message : String(error));
  }
}

speakButton.addEventListener("click", function() {
  if (!window._tts) return;

  stopAudio();
  speakButton.disabled = true;
  speakButton.textContent = "Generating…";
  generationTime.textContent = "—";
  audioLength.textContent = "—";
  setStatus("Generating speech…", "Running locally on this device.", 76);

  setTimeout(function() {
    try {
      var t0 = performance.now();
      var result = window._tts.generate({
        text: sentences[sentenceIndex],
        sid: 0,
        speed: Number(speedInput.value)
      });
      var elapsed = performance.now() - t0;
      var duration = result.samples.length / result.sampleRate;

      generationTime.textContent = (elapsed / 1000).toFixed(2) + " s";
      audioLength.textContent = duration.toFixed(2) + " s";
      diag("Generated", {
        sentence: sentenceIndex + 1,
        ms: Math.round(elapsed),
        audioSeconds: Number(duration.toFixed(2)),
        samples: result.samples.length,
        sampleRate: result.sampleRate
      });

      setStatus(
        "Playing",
        duration.toFixed(2) + " seconds of audio generated in " +
          (elapsed / 1000).toFixed(2) + " seconds.",
        100
      );
      playAudio(result);
    } catch (error) {
      diag("GENERATION FAILURE", error);
      setStatus("Generation failed", error.message || String(error), 0);
    } finally {
      speakButton.disabled = false;
      speakButton.textContent = "Speak sentence";
    }
  }, 50);
});

renderSentence();

requestAnimationFrame(function() {
  setTimeout(prepareSherpa, 200);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async function() {
    try {
      var reg = await navigator.serviceWorker.register("./sw.js?v=0.10", {
        updateViaCache: "none"
      });
      await reg.update();
    } catch (error) {
      console.error(error);
    }
  });
}
