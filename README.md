# GameHub TTS Test v0.7 — fixed direct Sherpa path

This is the corrected version of v0.6.

## Fix

The fp32 Sherpa demo directory does **not** include an `-fp32` suffix.

v0.6 incorrectly requested:

`wasm-piper-en-libritts_r-medium-fp32/`

v0.7 correctly requests:

`wasm-piper-en-libritts_r-medium/`

Quantised variants would still use suffixes such as `-int8`.

Everything else remains deliberately unchanged so this is a clean test of the path correction.

## Test

Upload all files over v0.6.

The page should visibly say:

`GameHub experiment · v0.7`

Then wait to see whether the top-right indicator reaches:

`Voice ready`

If it does, try the first short sentence and then cycle through the longer sentences.
