// GameHub TTS Test v0.8
// Direct Sherpa-ONNX WASM integration.
// No npm package and no third-party JS TTS wrapper.
//
// This mirrors the successful Sherpa demo architecture:
//   Module.locateFile -> packed model directory
//   sherpa-onnx-wasm-main-tts.js
//   sherpa-onnx-tts.js
//   createOfflineTts(...)
//   tts.generate(...)

var MODEL_KEY = "piper-en-libritts_r-medium";
var PRECISION = "fp32";
var CDN_BASE =
  "https://huggingface.co/datasets/jiangzhuo9357/sherpa-onnx-tts-models/resolve/main/";

// The public demo stores each packed Piper build by model + precision.
var precisionSuffix = PRECISION === "fp32" ? "" : "-" + PRECISION;
var wasmDir = CDN_BASE + "wasm-" + MODEL_KEY + precisionSuffix + "/";

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

var sentenceIndex = 0;
var loadStarted = 0;
var currentSource = null;
var audioContext = null;
var initStarted = false;
var runtimeReady = false;
var helperReady = false;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

installState.textContent = isStandalone() ? "Home Screen" : "Web page";

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

previousSentence.addEventListener("click", function() { moveSentence(-1); });
nextSentence.addEventListener("click", function() { moveSentence(1); });

speedInput.addEventListener("input", function() {
  speedReadout.textContent = Number(speedInput.value).toFixed(2) + "×";
});

detailsToggle.addEventListener("click", function() {
  var show = details.hidden;
  details.hidden = !show;
  detailsToggle.textContent = show ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(show));
});

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

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  var buffer = audioContext.createBuffer(
    1,
    result.samples.length,
    result.sampleRate
  );
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

function failLoad(message) {
  console.error(message);
  setEngineState("Load failed", "error");
  setStatus("Voice failed to load", message, 0);
  speakButton.disabled = true;
  speakButton.textContent = "Voice failed to load";
}

// Emscripten reads this global object when its generated script starts.
var Module = {
  locateFile: function(path) {
    return wasmDir + path;
  },

  setStatus: function(text) {
    console.log("Sherpa:", text);

    // Emscripten can clear its status before sherpa-onnx-tts.js has finished
    // loading. v0.7 tried to initialise at that moment, which created a race.
    if (!text) {
      runtimeReady = true;
      tryStartTts();
      return;
    }

    var match = text.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
    if (match) {
      var loaded = parseInt(match[1], 10);
      var total = parseInt(match[2], 10);
      var pct = total ? Math.round((loaded / total) * 100) : 0;
      setEngineState("Loading voice " + pct + "%", "loading");
      setStatus(
        "Loading voice in background…",
        "You can choose a sentence while the model downloads.",
        15 + pct * 0.7
      );
    } else {
      setEngineState("Preparing voice…", "loading");
      setStatus("Preparing Sherpa…", text, 12);
    }
  },

  onRuntimeInitialized: function() {
    console.log("Sherpa WASM runtime initialized");
    runtimeReady = true;
    tryStartTts();
  },

  onAbort: function(reason) {
    failLoad("Sherpa stopped: " + reason + " | Model path: " + wasmDir);
  }
};

window.Module = Module;

function tryStartTts() {
  // We need BOTH pieces:
  // 1. Emscripten/WASM runtime has finished starting.
  // 2. sherpa-onnx-tts.js has defined createOfflineTts().
  //
  // In v0.7 condition 1 could happen first, causing a false load failure.
  if (initStarted) return;
  if (!runtimeReady) return;
  if (!helperReady) return;
  if (typeof window.createOfflineTts !== "function" &&
      typeof createOfflineTts !== "function") {
    return;
  }

  initTts();
}

function initTts() {
  if (initStarted) return;
  initStarted = true;

  try {
    setEngineState("Starting voice…", "loading");
    setStatus(
      "Starting voice…",
      "Runtime and Sherpa helper are both ready. Creating the reusable TTS engine.",
      90
    );

    var createFn = window.createOfflineTts ||
      (typeof createOfflineTts === "function" ? createOfflineTts : null);

    if (!createFn) {
      // This should no longer happen, but don't permanently poison the retry.
      initStarted = false;
      setStatus(
        "Waiting for Sherpa helper…",
        "The WASM runtime is ready; waiting for the TTS helper script.",
        86
      );
      return;
    }

    var t0 = performance.now();

    window._tts = createFn(Module, {
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
        debug: 0,
        provider: "cpu"
      },
      ruleFsts: "",
      ruleFars: "",
      maxNumSentences: 1
    });

    var initMs = performance.now() - t0;
    var totalMs = performance.now() - loadStarted;

    loadTime.textContent = (totalMs / 1000).toFixed(2) + " s";

    console.log(
      "Sherpa ready:",
      window._tts.sampleRate,
      "Hz,",
      window._tts.numSpeakers,
      "speaker(s), init",
      initMs.toFixed(0),
      "ms"
    );

    speakButton.disabled = false;
    speakButton.textContent = "Speak sentence";
    setEngineState("Voice ready", "ready");
    setStatus(
      "Ready",
      "Direct Sherpa is loaded. Cycle through the sentences and compare generation times.",
      100
    );
  } catch (error) {
    initStarted = false;
    failLoad(
      (error && error.message ? error.message : String(error)) +
      " | runtimeReady=" + runtimeReady +
      " helperReady=" + helperReady
    );
  }
}

function loadScript(url) {
  return new Promise(function(resolve, reject) {
    var script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.onload = resolve;
    script.onerror = function() {
      reject(new Error("Could not load Sherpa asset: " + url));
    };
    document.body.appendChild(script);
  });
}

async function prepareDirectSherpa() {
  loadStarted = performance.now();

  try {
    setEngineState("Loading engine…", "loading");
    setStatus(
      "Loading Sherpa in background…",
      "The page is already usable while the WASM runtime and voice are prepared.",
      8
    );

    // Same two scripts as the working demo. The important v0.8 change is
    // that we DO NOT try to create OfflineTts until both are independently ready.
    await loadScript(wasmDir + "sherpa-onnx-wasm-main-tts.js");

    setStatus(
      "Sherpa runtime loaded…",
      "Loading the small TTS helper script next.",
      82
    );

    await loadScript(wasmDir + "sherpa-onnx-tts.js");
    helperReady = true;
    console.log("Sherpa TTS helper loaded");

    tryStartTts();

    // A delayed retry is harmless and protects against Safari delivering
    // runtime callbacks in an unusual order.
    setTimeout(tryStartTts, 250);
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

  setStatus(
    "Generating speech…",
    "This part is running locally on the device.",
    74
  );

  // Yield one frame before the synchronous WASM generation starts.
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

      setStatus(
        "Playing",
        duration.toFixed(2) + " seconds of audio generated in " +
          (elapsed / 1000).toFixed(2) + " seconds.",
        100
      );

      playAudio(result);
    } catch (error) {
      console.error(error);
      setStatus(
        "Generation failed",
        error && error.message ? error.message : String(error),
        0
      );
    } finally {
      speakButton.disabled = false;
      speakButton.textContent = "Speak sentence";
    }
  }, 50);
});

renderSentence();

// Let the GameHub UI paint first. Then begin the large download without the
// user having to press a model-load button.
requestAnimationFrame(function() {
  setTimeout(prepareDirectSherpa, 200);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async function() {
    try {
      var reg = await navigator.serviceWorker.register("./sw.js?v=0.8", {
        updateViaCache: "none"
      });
      await reg.update();
    } catch (error) {
      console.error("Service worker:", error);
    }
  });
}
