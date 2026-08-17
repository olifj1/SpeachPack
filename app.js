import { SherpaOnnxWasmTTSClient } from "https://cdn.jsdelivr.net/npm/js-tts-wrapper@0.1.81/js-tts-wrapper.browser.js";

const WASM_PATH =
  "https://cdn.jsdelivr.net/gh/willwade/js-tts-wrapper-assets@main/sherpaonnx/tts/vocoder-models/sherpa-onnx-tts.js";
const MODELS_URL =
  "https://cdn.jsdelivr.net/gh/willwade/js-tts-wrapper-assets@main/sherpaonnx/models/merged_models.json";
const VOICE_ID = "piper-en-jenny_dioco-medium";

const sentences = [
  "Hello, how are you?",
  "The little fox looked up at the moon and wondered what adventures tomorrow might bring.",
  "There are twelve apples in the basket. If we use four, how many apples are left?",
  "Maya has three boxes with five pencils in each box. How many pencils does she have altogether?",
  "Please read this sentence carefully, then choose the word that makes the most sense.",
  "At half past seven in the morning, Sam packed a blue coat, two sandwiches, and a bottle of water for the journey."
];

const installState = document.querySelector("#installState");
const engineState = document.querySelector("#engineState");
const sentenceNumber = document.querySelector("#sentenceNumber");
const sentenceText = document.querySelector("#sentenceText");
const previousSentence = document.querySelector("#previousSentence");
const nextSentence = document.querySelector("#nextSentence");
const speakButton = document.querySelector("#speakButton");
const speedInput = document.querySelector("#speedInput");
const speedReadout = document.querySelector("#speedReadout");
const statusText = document.querySelector("#statusText");
const statusDetail = document.querySelector("#statusDetail");
const meterFill = document.querySelector("#meterFill");
const loadTime = document.querySelector("#loadTime");
const generationTime = document.querySelector("#generationTime");
const audioLength = document.querySelector("#audioLength");
const detailsToggle = document.querySelector("#detailsToggle");
const details = document.querySelector("#details");

let sentenceIndex = 0;
let tts = null;
let ready = false;
let currentAudio = null;
let currentUrl = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

installState.textContent = isStandalone() ? "Home Screen" : "Web page";

function setStatus(title, detail, progress) {
  statusText.textContent = title;
  statusDetail.textContent = detail;
  if (typeof progress === "number") {
    meterFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }
}

function setEngineState(text, stateClass) {
  engineState.textContent = text;
  engineState.classList.remove("loading", "ready", "error");
  engineState.classList.add(stateClass);
}

function renderSentence() {
  sentenceText.textContent = sentences[sentenceIndex];
  sentenceNumber.textContent = `${sentenceIndex + 1} / ${sentences.length}`;
}

function moveSentence(delta) {
  sentenceIndex = (sentenceIndex + delta + sentences.length) % sentences.length;
  renderSentence();
}

previousSentence.addEventListener("click", () => moveSentence(-1));
nextSentence.addEventListener("click", () => moveSentence(1));

speedInput.addEventListener("input", () => {
  speedReadout.textContent = `${Number(speedInput.value).toFixed(2)}×`;
});

detailsToggle.addEventListener("click", () => {
  const show = details.hidden;
  details.hidden = !show;
  detailsToggle.textContent = show ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(show));
});

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

async function getWavDuration(blob) {
  try {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 44) return null;

    let sampleRate = 0;
    let byteRate = 0;
    let dataSize = 0;
    let offset = 12;

    while (offset + 8 <= view.byteLength) {
      const id = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const size = view.getUint32(offset + 4, true);

      if (id === "fmt " && size >= 16) {
        sampleRate = view.getUint32(offset + 12, true);
        byteRate = view.getUint32(offset + 16, true);
      }
      if (id === "data") {
        dataSize = size;
        break;
      }

      offset += 8 + size + (size % 2);
    }

    if (byteRate && dataSize) return dataSize / byteRate;
    if (sampleRate) return null;
    return null;
  } catch {
    return null;
  }
}

async function prepareVoice() {
  const started = performance.now();

  try {
    setEngineState("Loading engine…", "loading");
    setStatus(
      "Loading Sherpa engine…",
      "This starts automatically. You can choose a sentence while it works.",
      18
    );

    tts = new SherpaOnnxWasmTTSClient({
      wasmPath: WASM_PATH,
      mergedModelsUrl: MODELS_URL
    });

    await tts.initializeWasm(WASM_PATH);

    setEngineState("Loading voice…", "loading");
    setStatus(
      "Loading British voice…",
      "The voice model is being downloaded/prepared in the background. First load is the slow one.",
      56
    );

    await tts.setVoice(VOICE_ID);

    const elapsed = performance.now() - started;
    loadTime.textContent = `${(elapsed / 1000).toFixed(2)} s`;

    ready = true;
    speakButton.disabled = false;
    speakButton.textContent = "Speak sentence";
    setEngineState("Voice ready", "ready");
    setStatus(
      "Ready",
      "Sherpa is prepared. Try several sentences to compare generation time.",
      100
    );
  } catch (error) {
    console.error(error);
    ready = false;
    speakButton.disabled = true;
    speakButton.textContent = "Voice failed to load";
    setEngineState("Load failed", "error");
    setStatus(
      "Could not prepare Sherpa",
      error?.message || String(error),
      0
    );
  }
}

speakButton.addEventListener("click", async () => {
  if (!ready || !tts) return;

  stopAudio();
  speakButton.disabled = true;
  speakButton.textContent = "Generating…";
  generationTime.textContent = "—";
  audioLength.textContent = "—";

  const started = performance.now();

  try {
    setStatus(
      "Generating speech…",
      `Sentence ${sentenceIndex + 1} is being generated locally on this device.`,
      72
    );

    const audioBytes = await tts.synthToBytes(sentences[sentenceIndex], {
      format: "wav",
      speed: Number(speedInput.value)
    });

    const elapsed = performance.now() - started;
    generationTime.textContent = `${(elapsed / 1000).toFixed(2)} s`;

    const blob = new Blob([audioBytes], { type: "audio/wav" });
    const duration = await getWavDuration(blob);
    if (duration) audioLength.textContent = `${duration.toFixed(2)} s`;

    currentUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentUrl);

    setStatus(
      "Playing",
      `Generated in ${(elapsed / 1000).toFixed(2)} seconds.`,
      100
    );

    await currentAudio.play();

    currentAudio.addEventListener("ended", () => {
      setStatus(
        "Ready",
        "Choose another sentence or run this one again.",
        100
      );
    }, { once: true });
  } catch (error) {
    console.error(error);
    setStatus(
      "Generation failed",
      error?.message || String(error),
      0
    );
  } finally {
    speakButton.disabled = false;
    speakButton.textContent = "Speak sentence";
  }
});

renderSentence();

// Important: start after first paint so the visible page appears before the
// expensive WASM/model work begins.
requestAnimationFrame(() => {
  setTimeout(prepareVoice, 150);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js?v=0.5", {
        updateViaCache: "none"
      });
      await reg.update();
    } catch (error) {
      console.error(error);
    }
  });
}
