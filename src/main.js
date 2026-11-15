import "./styles.css";
import { Game } from "./game.js";

const game = new Game();

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
