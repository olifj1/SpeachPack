# GameHub TTS Test v0.2

Test 2 is aimed specifically at the iPhone/iPad Safari result from v0.1, where Kokoro loaded successfully but stalled indefinitely during generation.

## What changed

- The default phrase is now only: `Hello, how are you?`
- Piper is now the default engine.
- Kokoro remains available as a comparison.
- Generation has a selectable 15 / 30 / 60 second timeout.
- A failed/hung generation now reports a timeout instead of leaving the page permanently on “Generating…”.
- Piper voice download/setup is separated from generation so we can see which stage fails.
- The same PWA, Home Screen, neutral background and portrait-only setup is retained.

## Why Piper

Piper is substantially lighter than Kokoro and is explicitly designed for local speech synthesis. The browser library used here runs Piper through WebAssembly/ONNX in the browser and stores downloaded voice models in browser storage.

## First test

1. Leave **Engine = Piper**.
2. Leave the short phrase `Hello, how are you?`.
3. Choose a British voice.
4. Leave timeout at 30 seconds.
5. Press **Run TTS test**.

If Piper works, try the same phrase with Kokoro immediately afterward.

## GitHub Pages

Upload all files directly into the repository root and publish from `main / (root)`, exactly as with v0.1.

No build step is required.

## Note

This is deliberately an experimental compatibility test. Piper itself is being loaded from an ESM CDN and its voice model is fetched on first use. Once we know which engine behaves correctly on iOS/iPadOS, the next step would be to make its runtime/assets more self-contained and robust for the real GameHub PWA.
