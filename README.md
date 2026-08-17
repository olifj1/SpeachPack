# GameHub TTS Test v0.5 — integrated Sherpa test

This is the first test that keeps the Sherpa experience inside our own GameHub-style page.

## What it does

- Starts Sherpa-ONNX WebAssembly automatically after the page has painted.
- Loads the voice in the background while the user can browse the test sentences.
- Uses a British Piper voice: Jenny Dioco, medium quality.
- Provides six sentences ranging from a tiny phrase to Reading/Real Maths-style prompts.
- Shows initial setup time, generation time and (where readable from the WAV header) audio length.
- Keeps the same PWA/Home Screen and portrait-only setup as the previous tests.

## First run

The initial run is expected to be the slowest because the Sherpa runtime and voice model have to be downloaded and prepared.

Wait for the top-right status to say:

`Voice ready`

Then press **Speak sentence**.

Cycle through the sentences with the left/right arrows and compare the generation times.

## Why the model is larger than the 20 MB demo

The direct Sherpa compatibility demo proved that WebAssembly generation works on the iPhone.

This integrated test uses the published Sherpa browser wrapper/model catalogue. The selected British medium Piper model is roughly 64 MB. The goal of this version is to prove that our own page can preload and drive Sherpa reliably. If that works, we can optimise the model/runtime packaging next.

## GitHub Pages

Upload all files directly into the repository root, replacing v0.4.

The page visibly says:

`GameHub experiment · v0.5`

so it is easy to confirm that the latest version has loaded.

## External runtime/model assets

For this experimental build the small repository files remain local, while the Sherpa runtime and model catalogue are loaded from the published js-tts-wrapper/jsDelivr assets. This avoids committing a 60+ MB model into the test repository before we know the integration works.
