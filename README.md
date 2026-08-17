# GameHub TTS Test v0.6 — direct Sherpa

This version removes the js-tts-wrapper experiment completely.

It follows the same direct Sherpa-ONNX WebAssembly structure as the browser demo that
successfully generated speech on the iPhone:

1. Define the Emscripten `Module`.
2. Point `Module.locateFile()` at the packed Sherpa/Piper model.
3. Load `sherpa-onnx-wasm-main-tts.js`.
4. Load `sherpa-onnx-tts.js`.
5. Create one reusable `OfflineTts` engine.
6. Call `_tts.generate()` directly for each sentence.

There is no npm package or TTS wrapper between GameHub and Sherpa.

## Behaviour

The GameHub page paints first. About 200 ms later the Sherpa/model load begins automatically
in the background. The six sentence choices remain usable during loading.

When the top-right indicator says **Voice ready**, press **Speak sentence**.

The timing panel reports:

- total first-load/setup time
- generation time
- generated audio duration

The important comparison is generation time versus audio duration.

## Model

This test deliberately stays with Piper LibriTTS-R medium and fp32, matching the configuration
family that already worked in the direct Sherpa browser test. Optimising model size and trying
British voices comes after direct integration is proven.

## Upload

Replace the previous repository files with everything in this ZIP.

The page visibly says **GameHub experiment · v0.6**.
