import { localizeDocument } from "./locales/index.js";

const root = document.documentElement;
const boot = document.querySelector("[data-tao-boot]");
const criticalImages = [...document.querySelectorAll("img[data-boot-critical]")];

function imageReady(image) {
  if (image.complete && image.naturalWidth > 0) return image.decode?.().catch(() => undefined) ?? Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function revealTao() {
  localizeDocument();
  await Promise.race([
    Promise.allSettled(criticalImages.map(imageReady)),
    wait(12_000),
  ]);
  root.classList.remove("tao-is-booting");
  boot?.setAttribute("aria-busy", "false");
  window.setTimeout(() => boot?.remove(), 260);
  document.dispatchEvent(new CustomEvent("tao:ready"));
}

revealTao().catch(() => {
  root.classList.remove("tao-is-booting");
  boot?.remove();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).catch((error) => {
      console.warn("[TAO] Cache hors ligne indisponible.", error);
    });
  }, { once: true });
}
