const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const isDev = process.env.ELECTRON_START_URL != null;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#080a0b",
    autoHideMenuBar: true,
    title: "Dead Streets",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.setMenuBarVisibility(false);

  // Fullscreen toggle for Steam Big Picture / living-room play.
  window.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      window.setFullScreen(!window.isFullScreen());
      event.preventDefault();
    }
  });

  // Keep navigation inside the game; external links open in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    window.loadURL(process.env.ELECTRON_START_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
