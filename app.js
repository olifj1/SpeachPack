const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_CDN = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const textInput = document.querySelector("#textInput");
const voiceSelect = document.querySelector("#voiceSelect");
const speedInput = document.querySelector("#speedInput");
const speedReadout = document.querySelector("#speedReadout");
const generateButton = document.querySelector("#generateButton");
const buttonLabel = document.querySelector("#buttonLabel");
const statusText = document.querySelector("#statusText");
const statusDetail = document.querySelector("#statusDetail");
const meterFill = document.querySelector("#meterFill");
const loadTime = document.querySelector("#loadTime");
const generationTime = document.querySelector("#generationTime");
const totalTime = document.querySelector("#totalTime");
const installState = document.querySelector("#installState");
const detailsToggle = document.querySelector("#detailsToggle");
const details = document.querySelector("#details");

let tts = null;
let audioElement = null;

const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

function setStatus(title, detail, progress = 0) {
  statusText.textContent = title;
  statusDetail.textContent = detail;
  meterFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

installState.textContent = isStandalone() ? "Home Screen" : "Web page";

speedInput.addEventListener("input", () => {
  speedReadout.textContent = `${Number(speedInput.value).toFixed(2)}×`;
});

detailsToggle.addEventListener("click", () => {
  const isHidden = details.hidden;
  details.hidden = !isHidden;
  detailsToggle.textContent = isHidden ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(isHidden));
});

async function ensureModel() {
  if (tts) return { elapsed: 0, alreadyLoaded: true };

  setStatus(
    "Loading speech model",
    "First run can take a while: the q8 Kokoro model is roughly 92 MB, plus runtime files.",
    12
  );
  buttonLabel.textContent = "Loading model…";

  const started = performance.now();

  // Import on demand so simply opening the PWA stays lightweight.
  const { KokoroTTS } = await import(KOKORO_CDN);

  setStatus(
    "Downloading / preparing model",
    "Keep this page open. The model is being prepared for on-device WebAssembly inference.",
    36
  );

  tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: "q8",
    device: "wasm",
  });

  const elapsed = performance.now() - started;
  setStatus("Model ready", "The voice model is loaded. Generating the sentence now…", 68);
  return { elapsed, alreadyLoaded: false };
}

function stopExistingAudio() {
  if (!audioElement) return;
  audioElement.pause();
  audioElement.src = "";
  audioElement = null;
}

async function speak() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Add a sentence", "Type something in the sentence box first.", 0);
    textInput.focus();
    return;
  }

  generateButton.disabled = true;
  loadTime.textContent = "—";
  generationTime.textContent = "—";
  totalTime.textContent = "—";
  stopExistingAudio();

  const totalStarted = performance.now();

  try {
    const model = await ensureModel();
    loadTime.textContent = model.alreadyLoaded ? "cached" : seconds(model.elapsed);

    const genStarted = performance.now();
    setStatus("Generating speech", `Using ${voiceSelect.options[voiceSelect.selectedIndex].text}.`, 76);
    buttonLabel.textContent = "Generating…";

    const audio = await tts.generate(text, {
      voice: voiceSelect.value,
      speed: Number(speedInput.value),
    });

    const genElapsed = performance.now() - genStarted;
    generationTime.textContent = seconds(genElapsed);
    totalTime.textContent = seconds(performance.now() - totalStarted);

    // Kokoro.js returns a RawAudio object. toBlob() is supported by Transformers.js RawAudio;
    // if unavailable, toWav() is used as a fallback.
    let blob;
    if (typeof audio.toBlob === "function") {
      blob = audio.toBlob();
    } else {
      const wav = audio.toWav();
      blob = new Blob([wav], { type: "audio/wav" });
    }

    const url = URL.createObjectURL(blob);
    audioElement = new Audio(url);
    audioElement.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });

    setStatus("Playing", "Speech was generated locally on this device.", 100);
    buttonLabel.textContent = "Speak again";
    await audioElement.play();
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not run TTS",
      `${error?.message || error} Try once in Safari with a good connection before testing offline/Home Screen mode.`,
      0
    );
    buttonLabel.textContent = "Try again";
  } finally {
    generateButton.disabled = false;
  }
}

generateButton.addEventListener("click", speak);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
