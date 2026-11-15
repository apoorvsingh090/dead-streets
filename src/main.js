import "./styles.css";
import { Game } from "./game.js";
import { version } from "../package.json";

const game = new Game();

const buildLabel = document.querySelector(".footer-build");
if (buildLabel) {
  buildLabel.textContent = `A FAN-MADE BROWSER HOMAGE — v${version}`;
}

if ("serviceWorker" in navigator && import.meta.env?.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env?.BASE_URL ?? "/"}sw.js`).catch(() => {});
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.renderer?.dispose();
  });
}
