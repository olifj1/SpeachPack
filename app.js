const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_CDN = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";
const PIPER_CDN = "https://esm.sh/@mintplex-labs/piper-tts-web@1.0.3?bundle&deps=onnxruntime-web@1.18.0";

const textInput = document.querySelector("#textInput");
const engineSelect = document.querySelector("#engineSelect");
const voiceSelect = document.querySelector("#voiceSelect");
const speedInput = document.querySelector("#speedInput");
const speedReadout = document.querySelector("#speedReadout");
const timeoutSelect = document.querySelector("#timeoutSelect");
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

let kokoro = null;
let piper = null;
let audioElement = null;

const KOKORO_VOICES = [
  ["bf_emma", "Emma — British female"],
  ["bf_alice", "Alice — British female"],
  ["bf_isabella", "Isabella — British female"],
  ["bf_lily", "Lily — British female"],
  ["bm_daniel", "Daniel — British male"],
  ["bm_fable", "Fable — British male"],
  ["bm_george", "George — British male"],
  ["bm_lewis", "Lewis — British male"],
];

const PIPER_FALLBACK_VOICES = [
  ["en_GB-alan-medium", "Alan — British male"],
  ["en_GB-alba-medium", "Alba — British female"],
  ["en_GB-aru-medium", "Aru — British"],
  ["en_GB-cori-medium", "Cori — British female"],
  ["en_GB-jenny_dioco-medium", "Jenny — British female"],
  ["en_GB-northern_english_male-medium", "Northern English — male"],
  ["en_GB-semaine-medium", "Semaine — British"],
  ["en_GB-southern_english_female-low", "Southern English — female"],
  ["en_GB-vctk-medium", "VCTK — British multi-speaker"],
];

const seconds = ms => `${(ms / 1000).toFixed(2)} s`;

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

function withTimeout(promise, ms, label = "Operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)), ms);
    }),
  ]);
}

function stopExistingAudio() {
  if (!audioElement) return;
  audioElement.pause();
  if (audioElement.src.startsWith("blob:")) URL.revokeObjectURL(audioElement.src);
  audioElement.src = "";
  audioElement = null;
}

async function updateVoiceList() {
  const engine = engineSelect.value;
  voiceSelect.innerHTML = "";

  if (engine === "kokoro") {
    for (const [value, label] of KOKORO_VOICES) {
      voiceSelect.add(new Option(label, value));
    }
    return;
  }

  // Piper can enumerate its supported voices. If that fails before the
  // package/runtime is loaded, show a known British subset so the test remains usable.
  let voices = [];
  try {
    if (!piper) {
      setStatus("Preparing Piper", "Loading the lightweight Piper browser library…", 8);
      piper = await import(PIPER_CDN);
    }
    const listed = await piper.voices();
    if (listed && typeof listed === "object") {
      voices = Object.entries(listed)
        .filter(([id]) => id.startsWith("en_GB-"))
        .map(([id, data]) => [id, data?.name || id]);
    }
  } catch (err) {
    console.warn("Piper voice enumeration failed; using fallback list.", err);
  }

  const choices = voices.length ? voices : PIPER_FALLBACK_VOICES;
  for (const [value, label] of choices) {
    voiceSelect.add(new Option(label, value));
  }
}

speedInput.addEventListener("input", () => {
  speedReadout.textContent = `${Number(speedInput.value).toFixed(2)}×`;
});

engineSelect.addEventListener("change", async () => {
  setStatus("Ready", `Selected ${engineSelect.options[engineSelect.selectedIndex].text}.`, 0);
  await updateVoiceList();
});

detailsToggle.addEventListener("click", () => {
  const isHidden = details.hidden;
  details.hidden = !isHidden;
  detailsToggle.textContent = isHidden ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(isHidden));
});

async function ensureKokoro() {
  if (kokoro) return { elapsed: 0, alreadyLoaded: true };
  const started = performance.now();
  setStatus("Loading Kokoro", "Loading the same q8 Kokoro model used in Test 1.", 18);
  const { KokoroTTS } = await import(KOKORO_CDN);
  kokoro = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    dtype: "q8",
    device: "wasm",
  });
  return { elapsed: performance.now() - started, alreadyLoaded: false };
}

async function runKokoro(text, timeoutMs) {
  const load = await ensureKokoro();
  loadTime.textContent = load.alreadyLoaded ? "cached" : seconds(load.elapsed);

  setStatus("Generating with Kokoro", "If Safari stalls again, this test will stop automatically.", 70);
  const started = performance.now();

  const audio = await withTimeout(
    kokoro.generate(text, {
      voice: voiceSelect.value,
      speed: Number(speedInput.value),
    }),
    timeoutMs,
    "Kokoro generation"
  );

  let blob;
  if (typeof audio.toBlob === "function") {
    blob = audio.toBlob();
  } else {
    blob = new Blob([audio.toWav()], { type: "audio/wav" });
  }

  return { blob, generationMs: performance.now() - started };
}

async function ensurePiper() {
  if (piper) return { elapsed: 0, alreadyLoaded: true };
  const started = performance.now();
  setStatus("Loading Piper", "Loading the Piper browser runtime.", 16);
  piper = await import(PIPER_CDN);
  return { elapsed: performance.now() - started, alreadyLoaded: false };
}

async function runPiper(text, timeoutMs) {
  const load = await ensurePiper();
  loadTime.textContent = load.alreadyLoaded ? "cached" : seconds(load.elapsed);

  const voiceId = voiceSelect.value;
  setStatus(
    "Preparing Piper voice",
    "On first use Piper downloads this voice model and stores it in browser storage.",
    38
  );

  // Explicit download gives us better visibility into whether the stall is
  // download/model setup or actual inference.
  const downloadStarted = performance.now();
  await withTimeout(
    piper.download(voiceId, progress => {
      if (progress?.total) {
        const pct = Math.round(progress.loaded * 100 / progress.total);
        setStatus("Downloading Piper voice", `${pct}% — ${voiceId}`, 38 + pct * 0.22);
      }
    }),
    Math.max(timeoutMs, 60000),
    "Piper voice download"
  );

  const downloadMs = performance.now() - downloadStarted;
  setStatus(
    "Generating with Piper",
    `Voice ready in ${seconds(downloadMs)}. Generating the short phrase now…`,
    68
  );

  const started = performance.now();
  const blob = await withTimeout(
    piper.predict({
      text,
      voiceId,
    }),
    timeoutMs,
    "Piper generation"
  );

  return { blob, generationMs: performance.now() - started };
}

async function speak() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Add a phrase", "Type something in the sentence box first.", 0);
    return;
  }

  const timeoutMs = Number(timeoutSelect.value) * 1000;
  generateButton.disabled = true;
  stopExistingAudio();

  loadTime.textContent = "—";
  generationTime.textContent = "—";
  totalTime.textContent = "—";
  buttonLabel.textContent = "Testing…";

  const totalStarted = performance.now();

  try {
    const result = engineSelect.value === "piper"
      ? await runPiper(text, timeoutMs)
      : await runKokoro(text, timeoutMs);

    generationTime.textContent = seconds(result.generationMs);
    totalTime.textContent = seconds(performance.now() - totalStarted);

    const url = URL.createObjectURL(result.blob);
    audioElement = new Audio(url);
    audioElement.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });

    setStatus(
      "Success",
      `${engineSelect.options[engineSelect.selectedIndex].text} generated and is playing the phrase locally.`,
      100
    );
    buttonLabel.textContent = "Run again";
    await audioElement.play();
  } catch (error) {
    console.error(error);
    generationTime.textContent = "failed";
    totalTime.textContent = seconds(performance.now() - totalStarted);
    setStatus(
      "Test stopped",
      error?.message || String(error),
      0
    );
    buttonLabel.textContent = "Try again";
  } finally {
    generateButton.disabled = false;
  }
}

generateButton.addEventListener("click", speak);

await updateVoiceList();
setStatus("Ready for Test 2", "Start with Piper and the short phrase “Hello, how are you?”.", 0);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
