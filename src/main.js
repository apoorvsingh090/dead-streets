import "./styles.css";
import { Game } from "./game.js";

const game = new Game();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.renderer?.dispose();
  });
}
