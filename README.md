# GameHub TTS Test v0.3

This build is primarily an update/caching fix for iPhone/iPad PWAs.

## What changed

- The page now visibly says `GameHub experiment · v0.3` at the top.
- Piper remains the default engine.
- The short `Hello, how are you?` test remains the default.
- Local CSS/JS/manifest/icon URLs are versioned with `?v=0.3`.
- The service worker is now **network-first for page navigation/HTML**.
- Old GameHub TTS Test caches are removed when the new worker activates.
- `skipWaiting()` and `clients.claim()` are used.
- The app explicitly asks the browser to check for a service-worker update.
- If a new worker takes control while the page is open, the page reloads once automatically.

This should make future GitHub Pages updates much less likely to appear stuck on an old installed-PWA version.

## First check

After uploading v0.3, open the normal Safari URL once.

You should immediately see:

`GAMEHUB EXPERIMENT · V0.3`

and the controls should include:

- Engine
- `Piper — lighter WASM test`
- Voice
- Speed
- Generation timeout
- `Run TTS test`

If Safari still shows the old page, refresh once. If an already-installed Home Screen copy still shows the old version, fully close it and reopen it after visiting the Safari page once.

## GitHub Pages

Upload all files directly into the repository root, replacing the previous files.
