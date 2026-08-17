const SHERPA_TEST_URL =
  "https://jiangzhuo9357-sherpa-onnx-tts-demos.static.hf.space/piper.html?model=piper-en-libritts_r-medium";

const installState = document.querySelector("#installState");
const openTestButton = document.querySelector("#openTestButton");
const detailsToggle = document.querySelector("#detailsToggle");
const details = document.querySelector("#details");

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

installState.textContent = isStandalone() ? "Home Screen" : "Web page";

openTestButton.addEventListener("click", () => {
  window.location.href = SHERPA_TEST_URL;
});

detailsToggle.addEventListener("click", () => {
  const show = details.hidden;
  details.hidden = !show;
  detailsToggle.textContent = show ? "Hide technical details" : "Show technical details";
  detailsToggle.setAttribute("aria-expanded", String(show));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js?v=0.4", {
        updateViaCache: "none"
      });
      await reg.update();
    } catch (error) {
      console.error(error);
    }
  });
}
