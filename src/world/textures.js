import * as THREE from "three";
import { rand, randInt, createCanvasTexture } from "../utils.js";

export function makeAsphaltTexture() {
  return createCanvasTexture(512, 512, (context, width, height) => {
    context.fillStyle = "#171a1c";
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < 5600; i += 1) {
      const shade = randInt(17, 54);
      context.fillStyle = `rgba(${shade}, ${shade + 1}, ${shade + 2}, ${rand(0.08, 0.32)})`;
      context.fillRect(rand(0, width), rand(0, height), rand(0.5, 2.3), rand(0.5, 2.3));
    }

    context.strokeStyle = "rgba(6, 8, 9, 0.55)";
    context.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      context.beginPath();
      let x = rand(0, width);
      let y = rand(0, height);
      context.moveTo(x, y);
      for (let j = 0; j < randInt(3, 8); j += 1) {
        x += rand(-30, 30);
        y += rand(8, 38);
        context.lineTo(x, y);
      }
      context.stroke();
    }

    for (let i = 0; i < 80; i += 1) {
      context.fillStyle = `rgba(0, 0, 0, ${rand(0.04, 0.14)})`;
      context.beginPath();
      context.ellipse(
        rand(0, width),
        rand(0, height),
        rand(4, 18),
        rand(2, 9),
        rand(0, Math.PI),
        0,
        Math.PI * 2
      );
      context.fill();
    }
  });
}

export function makeFacadeTexture(variant = 0) {
  const palette = [
    ["#3c3f3d", "#181c1d", "#b89662"],
    ["#4b4640", "#1a1b1b", "#8fb0b8"],
    ["#34383a", "#17191a", "#b87656"],
    ["#524b42", "#1a1b1a", "#cfd1ab"],
    ["#3d403b", "#151818", "#a6a1d2"],
  ][variant % 5];

  return createCanvasTexture(256, 512, (context, width, height) => {
    context.fillStyle = palette[0];
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < 2200; i += 1) {
      const dark = Math.random() > 0.5;
      context.fillStyle = dark
        ? `rgba(7, 9, 10, ${rand(0.03, 0.15)})`
        : `rgba(220, 211, 194, ${rand(0.015, 0.07)})`;
      context.fillRect(rand(0, width), rand(0, height), rand(1, 5), rand(4, 20));
    }

    context.strokeStyle = "rgba(12, 14, 14, 0.28)";
    context.lineWidth = 1;
    for (let y = 28; y < height; y += 27) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const columns = 3;
    const rows = 6;
    const marginX = 24;
    const marginY = 32;
    const cellW = (width - marginX * 2) / columns;
    const cellH = (height - marginY * 2) / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = marginX + column * cellW + 12;
        const y = marginY + row * cellH + 12;
        const w = cellW - 25;
        const h = cellH - 24;

        context.fillStyle = "rgba(35, 38, 38, 0.9)";
        context.fillRect(x - 5, y + h + 4, w + 10, 4);

        const lit = Math.random() < 0.17;
        if (lit) {
          context.globalAlpha = rand(0.25, 0.7);
          context.fillStyle = palette[2];
          context.fillRect(x, y, w, h);
          context.globalAlpha = 0.16;
          context.fillStyle = "#fff1cc";
          context.fillRect(x + 3, y + 3, w - 6, h - 6);
          context.globalAlpha = 1;
        } else {
          context.fillStyle = palette[1];
          context.fillRect(x, y, w, h);
          context.fillStyle = "rgba(92, 112, 121, 0.1)";
          context.fillRect(x + 3, y + 3, w * rand(0.2, 0.6), h * 0.42);
          context.fillStyle = "rgba(0, 0, 0, 0.24)";
          context.fillRect(x + w * rand(0.1, 0.4), y, 2, h);
        }

        context.strokeStyle = "rgba(10, 12, 13, 0.68)";
        context.lineWidth = 2;
        context.strokeRect(x, y, w, h);
      }
    }

    for (let i = 0; i < 5; i += 1) {
      const x = rand(0, width);
      const y = rand(0, height);
      context.strokeStyle = `rgba(10, 10, 9, ${rand(0.08, 0.22)})`;
      context.lineWidth = rand(1, 4);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + rand(-4, 4), y + rand(18, 80));
      context.stroke();
    }
  });
}

export function makeShutterTexture() {
  return createCanvasTexture(512, 512, (context, width, height) => {
    context.fillStyle = "#333a3c";
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 28) {
      context.fillStyle = y % 56 === 0 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.18)";
      context.fillRect(0, y, width, 4);
      context.fillStyle = "rgba(0,0,0,0.16)";
      context.fillRect(0, y + 17, width, 5);
    }

    for (let i = 0; i < 200; i += 1) {
      const shade = randInt(20, 80);
      context.fillStyle = `rgba(${shade}, ${shade}, ${shade - 2}, ${rand(0.04, 0.2)})`;
      context.fillRect(rand(0, width), rand(0, height), rand(1, 8), rand(1, 3));
    }

    context.save();
    context.translate(width / 2, height * 0.56);
    context.rotate(-0.04);
    context.textAlign = "center";
    context.fillStyle = "rgba(215, 192, 132, 0.68)";
    context.font = "900 52px Arial Black, Arial, sans-serif";
    context.fillText("QUARANTINE", 0, 0);
    context.font = "700 22px Arial, sans-serif";
    context.fillStyle = "rgba(205, 190, 150, 0.45)";
    context.fillText("CEDA  //  NO ENTRY", 0, 37);
    context.restore();

    context.save();
    context.globalAlpha = 0.5;
    for (let y = height - 56; y < height; y += 28) {
      context.fillStyle = "#c0a13c";
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y - 20);
      context.lineTo(width, y - 8);
      context.lineTo(0, y + 12);
      context.closePath();
      context.fill();
      context.fillStyle = "#171717";
      context.beginPath();
      context.moveTo(0, y + 14);
      context.lineTo(width, y - 6);
      context.lineTo(width, y + 6);
      context.lineTo(0, y + 26);
      context.closePath();
      context.fill();
    }
    context.restore();

    context.fillStyle = "rgba(125, 26, 24, 0.52)";
    context.font = "900 38px Arial Black, Arial, sans-serif";
    context.textAlign = "left";
    context.fillText("HELP US", 24, 174);
    context.font = "700 22px Arial, sans-serif";
    context.fillStyle = "rgba(210, 200, 175, 0.38)";
    context.fillText("THEY ARE IN THE WALLS", 24, 206);
  });
}

export function makeSignTexture(text, color, options = {}) {
  const { vertical = false, small = false } = options;
  const width = vertical ? 192 : 640;
  const height = vertical ? 512 : 192;
  return createCanvasTexture(width, height, (context) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(3, 5, 6, 0.72)";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.strokeRect(9, 9, width - 18, height - 18);
    context.strokeStyle = `${color}66`;
    context.lineWidth = 1;
    context.strokeRect(18, 18, width - 36, height - 36);

    context.save();
    context.shadowBlur = 24;
    context.shadowColor = color;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";

    if (vertical) {
      const letters = text.split("");
      const size = small ? 50 : 64;
      context.font = `900 ${size}px Arial Black, Impact, sans-serif`;
      const spacing = (height - 100) / letters.length;
      letters.forEach((letter, index) => {
        context.fillText(letter, width / 2, 74 + spacing * (index + 0.5));
      });
    } else {
      let size = small ? 82 : 100;
      context.font = `900 ${size}px Arial Black, Impact, sans-serif`;
      const available = width - 76;
      const measured = context.measureText(text).width;
      if (measured > available) {
        size = Math.floor(size * (available / measured));
        context.font = `900 ${size}px Arial Black, Impact, sans-serif`;
      }
      context.fillText(text, width / 2, height / 2 + 6);
    }
    context.restore();

    context.fillStyle = "rgba(255, 255, 255, 0.07)";
    for (let y = 0; y < height; y += 3) {
      context.fillRect(0, y, width, 1);
    }
  });
}

export function makeGlowTexture(rgb = "255, 180, 100") {
  return createCanvasTexture(128, 128, (context, width, height) => {
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      width / 2
    );
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.2, `rgba(${rgb}, 0.62)`);
    gradient.addColorStop(0.52, `rgba(${rgb}, 0.14)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

export function makeFireTexture() {
  return createCanvasTexture(128, 256, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    const gradient = context.createRadialGradient(
      width / 2,
      height * 0.72,
      2,
      width / 2,
      height * 0.73,
      width * 0.46
    );
    gradient.addColorStop(0, "rgba(255, 245, 178, 0.95)");
    gradient.addColorStop(0.14, "rgba(255, 196, 76, 0.9)");
    gradient.addColorStop(0.4, "rgba(233, 84, 18, 0.62)");
    gradient.addColorStop(0.72, "rgba(108, 24, 7, 0.15)");
    gradient.addColorStop(1, "rgba(28, 8, 3, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(width / 2, height * 0.72, width * 0.38, height * 0.62, 0, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i += 1) {
      context.fillStyle = `rgba(255, ${randInt(80, 200)}, 40, ${rand(0.04, 0.12)})`;
      context.beginPath();
      context.ellipse(
        rand(width * 0.25, width * 0.75),
        rand(height * 0.25, height * 0.8),
        rand(5, 22),
        rand(12, 40),
        rand(-0.3, 0.3),
        0,
        Math.PI * 2
      );
      context.fill();
    }
  });
}

export function makeCrosshairTexture() {
  return createCanvasTexture(64, 64, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(240, 236, 225, 0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width / 2, 6);
    context.lineTo(width / 2, 20);
    context.moveTo(width / 2, height - 6);
    context.lineTo(width / 2, height - 20);
    context.moveTo(6, height / 2);
    context.lineTo(20, height / 2);
    context.moveTo(width - 6, height / 2);
    context.lineTo(width - 20, height / 2);
    context.stroke();
  });
}
