# GameHub TTS Test v0.4 — Sherpa Test 3

This version takes a deliberately different approach.

Instead of immediately trying to integrate another JavaScript wrapper, it opens a working
Sherpa-ONNX WebAssembly Piper demo directly. That gives us a clean compatibility/performance
test on the actual iPhone/iPad.

## First test settings

- Precision: **int8 (~20 MB)**
- Text: **Hello, how are you?**
- Speed: **1.0**
- Press **Generate**

## Why this test is useful

Kokoro and the previous Piper wrapper both failed during generation on iOS Safari.

Sherpa-ONNX officially supports TTS through WebAssembly. The linked browser demo uses Sherpa
directly and provides an int8 Piper model of roughly 20 MB, which is a substantially lighter
test than the earlier ~92 MB Kokoro configuration.

If this direct Sherpa demo also fails or takes an impractical amount of time, that is a strong
signal that we should stop pursuing local browser neural TTS for GameHub for now.

If it works promptly, the next step is to package the same Sherpa runtime/model into the test
repository and then into GameHub.

## GitHub Pages

Upload all files in this ZIP directly into the repository root, replacing v0.3.

The page visibly shows **GameHub experiment · v0.4** so it is easy to confirm the latest build
has actually loaded.
