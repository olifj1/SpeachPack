# GameHub TTS Test v0.10 — matched Sherpa build

This version addresses the exact failure identified by v0.9:

`call_indirect to a signature that does not match`

That error occurred at `createOfflineTts()` after the model/runtime had downloaded successfully,
which strongly indicated that JavaScript glue and WebAssembly exports were not from one coherent build.

## v0.10 change

Every Sherpa runtime component now comes from the same official k2-fsa browser TTS Space:

- `sherpa-onnx-wasm-main-tts.js`
- `sherpa-onnx-wasm-main-tts.wasm`
- `sherpa-onnx-wasm-main-tts.data`
- `sherpa-onnx-tts.js`

The GameHub UI remains local in this repository.

The model is the same English Piper/LibriTTS-R family used by Sherpa's standard WebAssembly TTS example.

## Test

Upload all files over v0.9 and confirm:

`GameHub experiment · v0.10`

The desired sequence is:

1. background download
2. `Voice ready`
3. press `Speak sentence`
4. cycle through all six sentences and compare generation time with audio duration

The diagnostic log remains enabled in case this matched-build test exposes anything else.
