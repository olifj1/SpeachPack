# GameHub TTS Test v0.11 — cache-clean diagnostic baseline

The v0.10 screenshot proved that the HTML had updated to v0.10, but the error text still
contained `runtimeReady=true helperReady=true`, which only existed in the older v0.8/v0.9
JavaScript.

That means Safari was combining **new HTML with old cached JavaScript**.

## v0.11 changes

- `app.js` is renamed to `app-v011.js`.
- `style.css` is renamed to `style-v011.css`.
- No service worker is registered.
- On page load, existing GameHub TTS Test service workers are unregistered.
- Old `gamehub-tts-test-*` Cache Storage entries are deleted.
- The old `sw.js` is replaced by a self-unregistering cleanup worker.
- The diagnostic log must begin with:

  `START v0.11 — app-v011.js`

This gives us a clean, uncached baseline for the matched Sherpa build.

## Upload

Delete/replace the previous repo contents with all files in this ZIP.

Then open the normal Safari URL once. If the diagnostic log begins with the v0.11 line above,
we know the HTML and JavaScript genuinely belong to the same build.
