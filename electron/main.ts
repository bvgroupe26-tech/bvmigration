import { app, BrowserWindow, protocol, ipcMain, Menu } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

const isDev = !app.isPackaged;

function registerAppProtocol() {
  protocol.handle("app", (request) => {
    const requestedPath = request.url.replace("app://", "");
    const normalizedPath = requestedPath === "" ? "index.html" : requestedPath;
    const filePath = path.join(app.getAppPath(), "out", normalizedPath);
    return fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "BV GROUPE — Gestion RH",
    frame: false,
    icon: path.join(app.getAppPath(), "assets", "icon.png"),
    webPreferences: {
      preload: path.join(app.getAppPath(), "electron", "preload.ts"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  ipcMain.removeAllListeners("win-minimize");
  ipcMain.removeAllListeners("win-maximize");
  ipcMain.removeAllListeners("win-close");
  ipcMain.on("win-minimize", () => mainWindow.minimize());
  ipcMain.on("win-maximize", () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on("win-close", () => mainWindow.close());

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    return;
  }

  registerAppProtocol();
  mainWindow.loadURL("app://index.html");
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    Menu.setApplicationMenu(null);
    createWindow();
  }
});
