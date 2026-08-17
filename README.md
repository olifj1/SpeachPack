# GameHub TTS Test v0.9 — diagnostic build

No speculative Sherpa changes in this version.

v0.9 adds a permanent on-screen diagnostic log recording:
- exact model directory and script URLs
- Emscripten status events
- WASM runtime initialization
- helper-script completion
- availability of `createOfflineTts`
- state immediately before `createOfflineTts`
- the first load failure (which is no longer overwritten by later status messages)
- browser JavaScript errors and unhandled promise rejections

Upload over v0.8 and confirm `GameHub experiment · v0.9`.

After the failure, scroll to **Diagnostic log** and either use Copy or send a screenshot.
