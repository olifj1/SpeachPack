# GameHub TTS Test v0.8 — Safari startup race fix

v0.7 got significantly further than v0.6, but could still report `Voice failed to load`
while the Sherpa WASM runtime continued saying `Running...`.

That combination exposed a race in our integration.

## What was wrong

There are two independently loaded pieces:

1. The Emscripten / Sherpa WASM runtime.
2. `sherpa-onnx-tts.js`, which defines `createOfflineTts()`.

In v0.7, the WASM runtime could finish first and clear its status. That immediately called
our `initTts()` function even if the second helper script had not finished loading yet.

The first attempt therefore failed because `createOfflineTts()` did not exist yet, and our
old `initAttempted` flag prevented a later retry after the helper arrived.

## v0.8

The page now tracks two explicit flags:

- `runtimeReady`
- `helperReady`

It creates the TTS engine only when **both** are ready.

There is also a delayed Safari-safe retry, and failures now report both readiness states.

No model, sentence, UI, or inference settings have been changed, so this remains a clean
diagnostic step.

Upload all files over v0.7 and confirm the page says:

`GameHub experiment · v0.8`
