'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

/** Đổi đường dẫn Windows/Unix thành file:// URL (có mã hoá ký tự đặc biệt) */
function fileUrl(p) {
  let s = String(p).replace(/\\/g, '/');
  if (!s.startsWith('/')) s = '/' + s;
  return 'file://' + s.split('/').map((seg, i) => (i === 1 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg))).join('/');
}

contextBridge.exposeInMainWorld('api', {
  openVideos: () => ipcRenderer.invoke('dialog:openVideos'),
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  probe: (p) => ipcRenderer.invoke('video:probe', p),
  makeProxy: (p, token) => ipcRenderer.invoke('video:proxy', p, token),
  startExport: (job) => ipcRenderer.invoke('export:start', job),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  showItem: (p) => ipcRenderer.invoke('shell:showItem', p),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch (_) { return file.path || ''; }
  },
  fileUrl,
  onExportProgress: (cb) => ipcRenderer.on('export:progress', (_e, d) => cb(d)),
  onProxyProgress: (cb) => ipcRenderer.on('proxy:progress', (_e, d) => cb(d)),
});
