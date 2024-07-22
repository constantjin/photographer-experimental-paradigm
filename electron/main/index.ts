// The built directory structure
//
// ├─┬ dist
// │ ├─┬ electron
// │ │ ├─┬ main
// │ │ │ └── index.js
// │ │ └─┬ preload
// │ │   └── index.js
// │ ├── index.html
// │ ├── ...other-static-files-from-public
// │
process.env.DIST = join(__dirname, "../..");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST, "../public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

import { app, BrowserWindow, shell, ipcMain } from "electron";
import { release } from "os";
import { join } from "path";

import {
  // handleLoadSetting,
  // loadCLIPTextModel,
  // loadCLIPImageModel,
  // predictCLIPTextFeature,
  // resizeImageForCLIP,
  // predictCLIPImageFeature,
  // registerParticipant,
  // storeCapturedImage,
  // storeCaptionSound,
  writeEtimeFile,
  // writeControllerActionFile,
} from "./api";
import {
  handleLoadSetting,
  registerParticipant,
  loadCLIPTextModel,
  loadCLIPImageModel,
  predictCLIPTextFeature,
  resizeImageForCLIP,
  predictCLIPImageFeature,
  storeCapturedImage,
  storeCaptionSound,
  writeControllerActionFile,
} from "../apis";
import { channels } from "../shared/constants";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    title: "Main window",
    icon: join(process.env.PUBLIC, "favicon.svg"),
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.setMenuBarVisibility(false);

  if (app.isPackaged) {
    win.loadFile(indexHtml);
  } else {
    win.loadURL(url);
    // win.webContents.openDevTools()
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
}

// app.whenReady().then(createWindow);
app.whenReady().then(() => {
  ipcMain.handle(channels.REGISTER_PARTICIPANT, registerParticipant);
  ipcMain.handle(channels.LOAD_SETTING, handleLoadSetting);
  ipcMain.handle(channels.CLIP.LOAD_CLIP_TEXT, loadCLIPTextModel);
  ipcMain.handle(channels.CLIP.LOAD_CLIP_IMAGE, loadCLIPImageModel);
  ipcMain.handle(channels.CLIP.PREDICT_CLIP_TEXT, predictCLIPTextFeature);
  ipcMain.handle(channels.CLIP.PREDICT_CLIP_IMAGE, predictCLIPImageFeature);
  ipcMain.handle(channels.CLIP.RESIZE_IMAGE, resizeImageForCLIP);
  ipcMain.handle(channels.STREET.STORE_CAPTURE, storeCapturedImage);
  ipcMain.handle(channels.STREET.STORE_SOUND, storeCaptionSound);
  ipcMain.handle(channels.WRITE_ETIME, writeEtimeFile);
  ipcMain.handle(channels.STREET.WRITE_ACTION, writeControllerActionFile);
  createWindow();
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// new window example arg: new windows url
ipcMain.handle("open-win", (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
    },
  });

  if (app.isPackaged) {
    childWindow.loadFile(indexHtml, { hash: arg });
  } else {
    childWindow.loadURL(`${url}/#${arg}`);
    // childWindow.webContents.openDevTools({ mode: "undocked", activate: true })
  }
});
