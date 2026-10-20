'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const ff = require('./ffmpeg');
const exporter = require('./exporter');

let win = null;

/* -------------------- Persistent Prefs -------------------- */
function prefsPath() {
  return path.join(app.getPath('userData'), 'vcut-prefs.json');
}
function loadPrefs() {
  try { return JSON.parse(fs.readFileSync(prefsPath(), 'utf8')); } catch (_) { return {}; }
}
function savePrefs(data) {
  try {
    const cur = loadPrefs();
    fs.writeFileSync(prefsPath(), JSON.stringify({ ...cur, ...data }), 'utf8');
  } catch (_) { /* noop */ }
}

/* -------------------- Session Persistence -------------------- */
function sessionPath() {
  return path.join(app.getPath('userData'), 'vcut-session.json');
}

// Tránh mở nhiều cửa sổ cùng dùng 1 thư mục cache (gây lỗi 'Unable to move the cache')
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#0b0d17',
    title: 'VCut Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.log(`[preload-error] ${preloadPath}: ${error && error.message}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ------------------------- IPC ------------------------- */

ipcMain.handle('dialog:openVideos', async () => {
  const prefs = loadPrefs();
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn video',
    defaultPath: prefs.lastFolder || app.getPath('videos'),
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video', extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv', 'm4v', 'ts', 'mts', 'm2ts', '3gp', 'mpg', 'mpeg'] },
      { name: 'Tất cả', extensions: ['*'] },
    ],
  });
  if (!r.canceled && r.filePaths.length) {
    savePrefs({ lastFolder: path.dirname(r.filePaths[0]) });
    return r.filePaths;
  }
  return [];
});

ipcMain.handle('dialog:pickFolder', async () => {
  const prefs = loadPrefs();
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn thư mục lưu',
    defaultPath: prefs.lastFolder || app.getPath('videos'),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!r.canceled && r.filePaths[0]) {
    savePrefs({ lastFolder: r.filePaths[0] });
    return r.filePaths[0];
  }
  return null;
});

ipcMain.handle('video:probe', async (_e, filePath) => {
  try {
    return { ok: true, info: await ff.probe(filePath) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('video:proxy', async (_e, filePath, token) => {
  const dir = path.join(os.tmpdir(), 'vcut-proxy');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `proxy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`);
  try {
    const info = await ff.probe(filePath);
    await ff.run(
      ['-i', filePath, '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=-2:720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out],
      {
        durationSec: info.duration,
        onProgress: (r) => win && win.webContents.send('proxy:progress', { token, ratio: r }),
      }
    );
    return { ok: true, path: out };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:start', async (_e, job) => {
  try {
    const res = await exporter.runJob(job, (p) => win && win.webContents.send('export:progress', p));
    return { ok: true, ...res };
  } catch (err) {
    if (err.cancelled) return { ok: false, cancelled: true };
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:cancel', () => {
  exporter.cancel();
  return true;
});

ipcMain.handle('shell:showItem', (_e, p) => shell.showItemInFolder(p));
ipcMain.handle('shell:openPath', (_e, p) => shell.openPath(p));

ipcMain.handle('session:save', (_e, sessionData) => {
  try {
    fs.writeFileSync(sessionPath(), JSON.stringify(sessionData), 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('session:load', () => {
  try {
    const raw = fs.readFileSync(sessionPath(), 'utf8');
    return { ok: true, session: JSON.parse(raw) };
  } catch (_) {
    return { ok: true, session: null };
  }
});

ipcMain.handle('file:exists', (_e, filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return { ok: true, exists: true };
  } catch (_) {
    return { ok: true, exists: false };
  }
});

app.on('before-quit', () => {
  try { fs.rmSync(path.join(os.tmpdir(), 'vcut-proxy'), { recursive: true, force: true }); } catch (_) { /* noop */ }
});
