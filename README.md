# GameHub TTS Test v0.1

A deliberately small standalone PWA for testing whether local neural text-to-speech is practical on the same iPhone/iPad setup as GameHub.

## What it tests

- Kokoro 82M neural TTS running on-device in the browser through WebAssembly.
- British female and male Kokoro voices.
- Model load time.
- Sentence generation time.
- Safari versus Home Screen/PWA behaviour.
- A second/offline run after the model has already been downloaded.
- Portrait-only layout and the same neutral PWA/browser background treatment used by GameHub.

## GitHub Pages setup

Upload every file in this ZIP directly into the root of a new repository.

Then in GitHub:

1. Open **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Choose the branch containing these files (normally `main`) and `/ (root)`.
4. Save and wait for GitHub Pages to publish.
5. Open the published HTTPS page in Safari.

No npm install or build step is required.

## Important first-run behaviour

The repository itself stays small.

When **Load voice & speak** is pressed for the first time, the page imports `kokoro-js` 1.2.1 and downloads the quantised Kokoro model from Hugging Face. The q8 ONNX model is about 92 MB, plus supporting runtime/model files.

Inference itself then happens on the device; sentences are not sent to a speech API.

This first version intentionally leaves the model download under Kokoro/Transformers.js's own browser caching rather than trying to force a ~100 MB cross-origin model into our service worker. The PWA service worker caches only the local app shell.

## Suggested test

Run exactly the same sentence in this order:

1. Safari, first ever run — note model load and generation times.
2. Generate it again immediately — model load should show `cached`.
3. Add the site to the Home Screen and run the same sentence.
4. After one successful Home Screen run, close it, turn off Wi-Fi, reopen it and try again.

The fourth test is especially useful on iOS/iPadOS because it tells us whether the browser's model/runtime cache survives in the PWA context the way we need.

## Files

Everything is deliberately flat in the repository root:

- `index.html`
- `app.js`
- `style.css`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `README.md`

## Engine

This test uses Kokoro.js with `onnx-community/Kokoro-82M-v1.0-ONNX`, `q8`, forced to the WebAssembly backend. That makes the test conservative and more relevant to Safari/iOS than relying on WebGPU.
