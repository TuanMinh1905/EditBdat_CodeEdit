(function () {
'use strict';
/* ============================================================
   VCut Studio — renderer
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = window.api;
if (!api) {
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="position:fixed;inset:0;z-index:9999;background:#12142a;color:#fb7185;display:grid;place-items:center;font:16px sans-serif;text-align:center;padding:30px">' +
    '<div><b>Lỗi: không nạp được cầu nối preload (window.api).</b><br><br>Hãy đóng mọi cửa sổ VCut Studio rồi chạy lại. Nếu vẫn lỗi, gửi log trong terminal cho người hỗ trợ.</div></div>');
  throw new Error('window.api is undefined (preload failed)');
}

/* ---------------------------- Icons ---------------------------- */
const ICONS = {
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  volumex: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
  ccw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  cw: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  fliph: '<path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 20v2M12 14v2M12 8v2M12 2v2"/>',
  flipv: '<path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M20 12h2M14 12h2M8 12h2M2 12h2"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  merge: '<path d="m8 6 4-4 4 4M12 2v10.3a4 4 0 0 1-1.17 2.87L4 22M20 22l-5-5"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  minus: '<path d="M5 12h14"/>',
  zoomIn: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
};
const svg = (n) => `<svg class="i" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;
function hydrateIcons(root = document) {
  $$('[data-i]', root).forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = svg(el.dataset.i);
    el.dataset.done = '1';
  });
}
const icoSpan = (n, cls = '') => `<span class="i ${cls}">${svg(n)}</span>`;

/* ---------------------------- Utils ---------------------------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const basename = (p) => p.split(/[\\/]/).pop();
const dirname = (p) => p.slice(0, Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/')));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let _uid = 0;
const newId = (p) => `${p}${++_uid}`;

/** Định dạng thời gian: m:ss hoặc h:mm:ss (có phần lẻ nếu cần) */
function fmtTime(t) {
  t = Math.max(0, Math.round(t * 100) / 100);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.round((t - h * 3600 - m * 60) * 100) / 100;
  let ss = s.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  if (s < 10) ss = '0' + ss;
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
function fmtClock(t) {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

/**
 * Phân tích thời gian linh hoạt:
 *  "72" | "72.5" | "1:12" | "01:12:30" | "1p12s" | "1m12s" | "1h2m3s" | "1 phút 12 giây"
 * @returns {number|null}
 */
function parseTime(str) {
  if (str == null) return null;
  let s = String(str).trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (s.includes(':')) {
    const parts = s.split(':');
    if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p.trim()))) return null;
    const nums = parts.map((p) => parseFloat(p));
    if (nums.length === 2) return nums[0] * 60 + nums[1];
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  const re = /^(?:(\d+(?:\.\d+)?)\s*(?:h|g|giờ|gio)\s*)?(?:(\d+(?:\.\d+)?)\s*(?:m|p|phút|phut|min)\s*)?(?:(\d+(?:\.\d+)?)\s*(?:s|giây|giay|sec)?)?$/;
  const m = re.exec(s);
  if (!m || (m[1] == null && m[2] == null && m[3] == null)) return null;
  return (parseFloat(m[1]) || 0) * 3600 + (parseFloat(m[2]) || 0) * 60 + (parseFloat(m[3]) || 0);
}

/** "1p12s - 1p15s" → [start, end] */
function parseRange(line) {
  const parts = line.trim().split(/\s*(?:->|→|–|—|-|đến|den|\bto\b)\s*/i).filter((x) => x !== '');
  if (parts.length !== 2) return null;
  const a = parseTime(parts[0]);
  const b = parseTime(parts[1]);
  if (a == null || b == null) return null;
  return [a, b];
}

function toast(msg, type = 'ok', ms = 3600) {
  const el = document.createElement('div');
  el.className = `toast ${type === 'err' ? 'err' : 'ok'}`;
  el.innerHTML = `${icoSpan(type === 'err' ? 'alert' : 'check')}<div>${esc(msg)}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 320); }, ms);
}

/* ---------------------------- State ---------------------------- */
const state = {
  sources: [],          // {id, info, url, proxyUrl, proxied}
  selectedId: null,
  segs: {},             // sourceId -> [{id,start,end,bad:{start,end}}]
  order: [],            // id của item: segId hoặc 'whole:<sourceId>'
  activeSegId: null,
  playRangeEnd: null,
  opts: {
    mute: false,
    cropOn: false,
    crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
    cropRatio: null,
    rotate: 0,
    flipH: false,
    flipV: false,
    speed: 1,
    output: 'separate',
    mode: 'precise',
    quality: 'high',
    outDir: null,
  },
};

const video = $('#video');
const getSource = (id) => state.sources.find((s) => s.id === id);
const selected = () => getSource(state.selectedId);

/* ---------------------------- Zoom State ---------------------------- */
const zoom = {
  scale: null,  // null = fit mode, number = fixed scale
  STEPS: [0.1, 0.125, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5],
  MIN: 0.1,
  MAX: 5,
};
let _fitBadgeTimer = null;

function calcFitScale() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return 1;
  const stageViewport = $('#stageViewport');
  const cw = stageViewport.clientWidth  - 2;
  const ch = stageViewport.clientHeight - 2;
  return Math.min(cw / vw, ch / vh, 1);
}

function applyZoom(newScale) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const stageInner = $('#stageInner');
  const stage = $('#stage');
  if (newScale === null) {
    // fit mode: size the inner to fill viewport naturally
    const fitScale = calcFitScale();
    const w = Math.round(vw * fitScale);
    const h = Math.round(vh * fitScale);
    stageInner.style.width  = w + 'px';
    stageInner.style.height = h + 'px';
    stage.style.overflow = 'hidden';
    $('#zoomLabel').textContent = 'fit';
    $('#btnZoomReset').textContent = Math.round(fitScale * 100) + '%';
  } else {
    const w = Math.round(vw * newScale);
    const h = Math.round(vh * newScale);
    stageInner.style.width  = w + 'px';
    stageInner.style.height = h + 'px';
    stage.style.overflow = 'auto';
    $('#zoomLabel').textContent = Math.round(newScale * 100) + '%';
    $('#btnZoomReset').textContent = Math.round(newScale * 100) + '%';
  }
  // Show fit badge briefly
  const badge = $('#fitBadge');
  badge.textContent = newScale === null ? 'Fit' : Math.round((newScale || calcFitScale()) * 100) + '%';
  badge.classList.add('show');
  clearTimeout(_fitBadgeTimer);
  _fitBadgeTimer = setTimeout(() => badge.classList.remove('show'), 1200);
  layoutCrop();
}

function zoomIn() {
  const cur = zoom.scale ?? calcFitScale();
  const next = zoom.STEPS.find((s) => s > cur + 0.001) || zoom.MAX;
  zoom.scale = Math.min(next, zoom.MAX);
  applyZoom(zoom.scale);
}
function zoomOut() {
  const cur = zoom.scale ?? calcFitScale();
  const prev = [...zoom.STEPS].reverse().find((s) => s < cur - 0.001) || zoom.MIN;
  zoom.scale = Math.max(prev, zoom.MIN);
  applyZoom(zoom.scale);
}
function zoomFit() {
  zoom.scale = null;
  applyZoom(null);
}

// Wheel to zoom on stage
(function initZoomWheel() {
  const stageViewport = $('#stageViewport');
  stageViewport.addEventListener('wheel', (e) => {
    if (!video.videoWidth) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 1.1 : 0.9;
    const cur  = zoom.scale ?? calcFitScale();
    zoom.scale = Math.min(zoom.MAX, Math.max(zoom.MIN, cur * step));
    applyZoom(zoom.scale);
  }, { passive: false });
})();

$('#btnZoomIn').addEventListener('click', zoomIn);
$('#btnZoomOut').addEventListener('click', zoomOut);
$('#btnZoomFit').addEventListener('click', zoomFit);
$('#btnZoomReset').addEventListener('click', zoomFit);

new ResizeObserver(() => { applyZoom(zoom.scale); }).observe($('#stageViewport'));


function resolveItem(id) {
  if (id.startsWith('whole:')) {
    const s = getSource(id.slice(6));
    return s ? { id, sourceId: s.id, start: null, end: null, source: s } : null;
  }
  for (const sid of Object.keys(state.segs)) {
    const seg = state.segs[sid].find((x) => x.id === id);
    if (seg) return { id, sourceId: sid, start: seg.start, end: seg.end, seg, source: getSource(sid) };
  }
  return null;
}
const allItems = () => state.order.map(resolveItem).filter(Boolean);
const belongs = (sid, id) => id === 'whole:' + sid || (state.segs[sid] || []).some((s) => s.id === id);

function needsReencode() {
  const o = state.opts;
  return (o.cropOn && validCrop()) || o.rotate !== 0 || o.flipH || o.flipV || Math.abs(o.speed - 1) > 1e-6;
}
const validCrop = () => state.opts.crop.w > 0.01 && state.opts.crop.h > 0.01;
const effectiveMode = () => (needsReencode() ? 'precise' : state.opts.mode);

/* ---------------------------- Sources ---------------------------- */
async function addSources(paths) {
  let firstNew = null;
  for (const p of paths) {
    if (state.sources.some((s) => s.info.path === p)) { toast(`"${basename(p)}" đã có trong thư viện.`, 'err'); continue; }
    const r = await api.probe(p);
    if (!r.ok) { toast(`Không đọc được "${basename(p)}": ${r.error.split('\n')[0]}`, 'err', 5200); continue; }
    const src = { id: newId('s'), info: r.info, url: api.fileUrl(p), proxyUrl: null, proxied: false };
    state.sources.push(src);
    state.segs[src.id] = [];
    state.order.push('whole:' + src.id);
    if (!firstNew) firstNew = src;
  }
  if (firstNew && !state.selectedId) selectSource(firstNew.id);
  else if (firstNew) selectSource(firstNew.id);
  renderAll();
}

function removeSource(id) {
  state.sources = state.sources.filter((s) => s.id !== id);
  delete state.segs[id];
  state.order = state.order.filter((x) => !(x === 'whole:' + id || !resolveItem(x)));
  if (state.selectedId === id) {
    const next = state.sources[0];
    if (next) selectSource(next.id);
    else {
      state.selectedId = null;
      video.removeAttribute('src');
      video.load();
      $('#stageEmpty').style.display = '';
      $('#stageToolbar').classList.remove('visible');
      layoutCrop();
    }
  }
  renderAll();
}

function selectSource(id) {
  state.selectedId = id;
  state.activeSegId = null;
  state.playRangeEnd = null;
  const s = selected();
  if (s) {
    $('#stageEmpty').style.display = 'none';
    $('#stageToolbar').classList.add('visible');
    video.src = s.proxyUrl || s.url;
    video.load();
    video.playbackRate = state.opts.speed;
    video.muted = state.opts.mute;
    zoom.scale = null; // reset to fit on new video
  }
  renderAll();
}

/* ---------------------------- Segments ---------------------------- */
function addSeg(src, start, end) {
  const seg = { id: newId('c'), start, end, bad: {} };
  state.segs[src.id].push(seg);
  const wid = 'whole:' + src.id;
  const wi = state.order.indexOf(wid);
  if (wi >= 0) state.order[wi] = seg.id;
  else {
    let last = -1;
    state.order.forEach((id, i) => { if (belongs(src.id, id) && id !== seg.id) last = i; });
    state.order.splice(last + 1, 0, seg.id);
  }
  return seg;
}
function removeSeg(src, segId) {
  state.segs[src.id] = state.segs[src.id].filter((s) => s.id !== segId);
  const i = state.order.indexOf(segId);
  if (!state.segs[src.id].length) state.order[i] = 'whole:' + src.id;
  else state.order.splice(i, 1);
  if (state.activeSegId === segId) state.activeSegId = null;
}
function segIssue(seg, src) {
  if (seg.bad.start || seg.bad.end) return 'Mốc thời gian không hợp lệ';
  if (seg.start < 0) return 'Bắt đầu phải ≥ 0';
  if (seg.end <= seg.start) return 'Kết thúc phải sau bắt đầu';
  if (seg.start >= src.info.duration) return 'Bắt đầu vượt quá độ dài video';
  return null;
}

/* ---------------------------- Rendering ---------------------------- */
function renderAll() {
  renderLibrary();
  renderCuts();
  renderOrder();
  renderSeekSegs();
  updateOptionsUI();
}

function renderLibrary() {
  const el = $('#sourceList');
  if (!state.sources.length) { el.innerHTML = '<div class="empty">Chưa có video nào.<br />Thêm nhiều video để cắt hoặc ghép chung.</div>'; return; }
  el.innerHTML = state.sources.map((s) => {
    const n = state.segs[s.id].length;
    const i = s.info;
    return `<div class="src-card ${s.id === state.selectedId ? 'active' : ''}" data-id="${s.id}">
      <div class="src-ico">${svg('film')}</div>
      <div class="src-meta">
        <div class="src-name" title="${esc(i.path)}">${esc(basename(i.path))}</div>
        <div class="src-sub"><span>${fmtTime(i.duration)}</span><span>${i.width}×${i.height}</span>
          ${n ? `<span class="badge violet">${n} đoạn</span>` : '<span class="badge">cả video</span>'}</div>
      </div>
      <button class="icon-btn danger" data-act="rm" title="Gỡ khỏi thư viện">${svg('x')}</button>
    </div>`;
  }).join('');
}

function renderCuts() {
  const src = selected();
  const list = $('#cutsList');
  const note = $('#cutsNote');
  $('#btnAddCut').disabled = !src;
  $('#btnPaste').disabled = !src;
  if (!src) { note.textContent = ''; list.innerHTML = '<div class="empty">Chọn một video ở thư viện để thêm đoạn cắt.</div>'; return; }
  const segs = state.segs[src.id];
  note.textContent = segs.length ? `• ${segs.length} đoạn từ “${basename(src.info.path)}”` : '• Chưa có đoạn → sẽ lấy cả video';
  if (!segs.length) {
    list.innerHTML = `<div class="empty">Chưa cắt đoạn nào cho video này.<br />Bấm <b>Thêm đoạn</b>, nhập mốc <b>bắt đầu → kết thúc</b> (ví dụ <code style="font-family:var(--mono)">1p12s</code> → <code style="font-family:var(--mono)">1p15s</code>),<br />hoặc <b>Dán danh sách</b> nhiều đoạn một lúc.</div>`;
    return;
  }
  list.innerHTML = segs.map((g, i) => `
    <div class="cut-row ${g.id === state.activeSegId ? 'active' : ''}" data-id="${g.id}">
      <span class="cut-idx">${String(i + 1).padStart(2, '0')}</span>
      <div class="tf" data-field="start"><input data-f="start" value="${fmtTime(g.start)}" placeholder="0:00" spellcheck="false" />
        <button class="icon-btn" data-act="setStart" title="Lấy thời điểm hiện tại của video">${svg('locate')}</button></div>
      <span class="arrow">→</span>
      <div class="tf" data-field="end"><input data-f="end" value="${fmtTime(g.end)}" placeholder="0:00" spellcheck="false" />
        <button class="icon-btn" data-act="setEnd" title="Lấy thời điểm hiện tại của video">${svg('locate')}</button></div>
      <span class="cut-dur"></span>
      <div class="cut-act">
        <button class="icon-btn" data-act="play" title="Xem thử đoạn này">${svg('play')}</button>
        <button class="icon-btn danger" data-act="del" title="Xoá đoạn">${svg('trash')}</button>
      </div>
    </div>`).join('');
  segs.forEach((g) => refreshRow(g.id));
}

function refreshRow(segId, writeInputs = false) {
  const src = selected();
  if (!src) return;
  const seg = state.segs[src.id].find((x) => x.id === segId);
  const row = $(`.cut-row[data-id="${segId}"]`);
  if (!seg || !row) return;
  if (writeInputs) {
    $('[data-f="start"]', row).value = fmtTime(seg.start);
    $('[data-f="end"]', row).value = fmtTime(seg.end);
  }
  const issue = segIssue(seg, src);
  $('[data-field="start"]', row).classList.toggle('bad', !!seg.bad.start || (!!issue && seg.end <= seg.start));
  $('[data-field="end"]', row).classList.toggle('bad', !!seg.bad.end || (!!issue && seg.end <= seg.start));
  $('.cut-dur', row).textContent = issue ? '—' : fmtTime(Math.min(seg.end, src.info.duration) - seg.start);
  row.title = issue || '';
}

function renderOrder() {
  const items = allItems();
  const el = $('#orderList');
  if (!items.length) { el.innerHTML = '<div class="empty" style="padding:10px">Chưa có gì để xuất.</div>'; $('#orderSum').textContent = ''; updateExportMeta(); return; }
  el.innerHTML = items.map((it, i) => {
    const d = it.start == null ? it.source.info.duration : Math.max(0, Math.min(it.end, it.source.info.duration) - it.start);
    const rng = it.start == null ? `Cả video • ${fmtTime(d)}` : `${fmtTime(it.start)} → ${fmtTime(it.end)} • ${fmtTime(d)}`;
    return `<div class="order-item" draggable="true" data-id="${it.id}">
      <span class="grip">${svg('grip')}</span><span class="order-n">${String(i + 1).padStart(2, '0')}</span>
      <div class="order-t"><b>${esc(basename(it.source.info.path))}</b><span>${rng}</span></div></div>`;
  }).join('');
  const total = items.reduce((a, it) => {
    const d = it.start == null ? it.source.info.duration : Math.max(0, Math.min(it.end, it.source.info.duration) - it.start);
    return a + d / state.opts.speed;
  }, 0);
  $('#orderSum').textContent = `${items.length} phần • tổng khoảng ${fmtTime(total)}`;
  updateExportMeta();
}

function renderSeekSegs() {
  const src = selected();
  const box = $('#seekSegs');
  if (!src) { box.innerHTML = ''; return; }
  const dur = src.info.duration || 1;
  box.innerHTML = state.segs[src.id].filter((g) => g.end > g.start).map((g) =>
    `<div class="seek-seg ${g.id === state.activeSegId ? 'hot' : ''}" style="left:${(g.start / dur) * 100}%;width:${Math.max(0.3, ((Math.min(g.end, dur) - g.start) / dur) * 100)}%"></div>`).join('');
}

function updateExportMeta() {
  const n = allItems().length;
  const o = state.opts.output;
  const parts = [];
  if (o === 'separate' || o === 'both') parts.push(`${n} file riêng`);
  if (o === 'merge' || o === 'both') parts.push('1 file ghép');
  $('#exportMeta').textContent = n ? `Sẽ tạo: ${parts.join(' + ')} (MP4 • H.264)` : '';
  $('#btnExport').disabled = !n;
}

function updateOptionsUI() {
  const o = state.opts;
  $('#optMute').classList.toggle('on', o.mute);
  $('#optCrop').classList.toggle('on', o.cropOn);
  $('#cropSub').classList.toggle('on', o.cropOn);
  $$('#cropPresets .chip').forEach((c) => {
    const r = c.dataset.r;
    c.classList.toggle('on', r === 'reset' ? false : (r === 'free' ? !o.cropRatio : o.cropRatio && Math.abs(o.cropRatio - (+r.split(':')[0] / +r.split(':')[1])) < 1e-6));
  });
  $$('#speedChips .chip').forEach((c) => c.classList.toggle('on', Math.abs(+c.dataset.s - o.speed) < 1e-6));
  $('[data-act="fh"]').classList.toggle('on', o.flipH);
  $('[data-act="fv"]').classList.toggle('on', o.flipV);
  const rotTxt = [];
  if (o.rotate) rotTxt.push(`Xoay ${o.rotate}° theo chiều kim đồng hồ`);
  if (o.flipH) rotTxt.push('Lật ngang');
  if (o.flipV) rotTxt.push('Lật dọc');
  const rh = $('#rotateHint');
  rh.classList.toggle('on', rotTxt.length > 0);
  rh.innerHTML = rotTxt.length ? `${rotTxt.join(' • ')}<br /><span style="color:var(--faint)">Áp dụng khi xuất (preview chưa xoay).</span> <a href="#" id="rotReset" style="color:var(--accent-2)">Đặt lại</a>` : '';
  $('#speedTag').textContent = Math.abs(o.speed - 1) > 1e-6 ? `⏩ ${o.speed}×` : '';
  video.playbackRate = o.speed;
  video.muted = o.mute;

  // output / mode / quality
  $$('#outputSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === o.output));
  $$('#outputSeg button').forEach((b) => b.classList.toggle('grad', b.dataset.v === o.output));
  const forced = needsReencode();
  const eff = effectiveMode();
  $$('#modeSeg button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === eff);
    b.classList.toggle('grad', b.dataset.v === eff);
    if (b.dataset.v === 'fast') b.disabled = forced;
  });
  $('#modeHint').innerHTML = forced
    ? 'Có crop / xoay / đổi tốc độ nên bắt buộc <b>encode lại</b> để áp dụng chỉnh sửa (chính xác từng frame).'
    : eff === 'fast'
      ? '<b>Nhanh:</b> không encode lại, gần như tức thì, giữ nguyên chất lượng. Điểm cắt có thể lệch theo keyframe (vài giây).'
      : '<b>Chính xác:</b> encode lại H.264 nên cắt đúng từng frame, nhưng chậm hơn.';
  $('#qualityWrap').style.display = eff === 'precise' ? '' : 'none';
  $$('#qualitySeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === o.quality));
  $('#dirLabel').textContent = o.outDir ? o.outDir : 'Lưu cạnh video gốc';
  $('#dirLabel').title = o.outDir || '';
  $('#btnDirReset').style.display = o.outDir ? '' : 'none';

  // badges trên khung preview
  const b = [];
  if (o.mute) b.push(`${icoSpan('volumex')} Tắt tiếng`);
  if (o.rotate) b.push(`${icoSpan('cw')} ${o.rotate}°`);
  if (o.flipH) b.push(`${icoSpan('fliph')} Lật ngang`);
  if (o.flipV) b.push(`${icoSpan('flipv')} Lật dọc`);
  if (Math.abs(o.speed - 1) > 1e-6) b.push(`${icoSpan('gauge')} ${o.speed}×`);
  $('#stageBadges').innerHTML = b.map((x) => `<span class="chip-badge">${x}</span>`).join('');
  layoutCrop();
  updateExportMeta();
}

/* ---------------------------- Player ---------------------------- */
function curDuration() {
  const s = selected();
  return (isFinite(video.duration) && video.duration) || (s ? s.info.duration : 0);
}
function setPlayIcon(playing) { $('#playIcon').innerHTML = svg(playing ? 'pause' : 'play'); }
function togglePlay() {
  if (!selected()) return;
  state.playRangeEnd = null;
  if (video.paused) video.play().catch(() => {}); else video.pause();
}
function seekTo(t) {
  video.currentTime = clamp(t, 0, curDuration());
}
function playRange(seg) {
  video.currentTime = seg.start;
  state.playRangeEnd = Math.min(seg.end, curDuration());
  state.activeSegId = seg.id;
  video.play().catch(() => {});
  $$('.cut-row').forEach((r) => r.classList.toggle('active', r.dataset.id === seg.id));
  renderSeekSegs();
}

function frame() {
  const dur = curDuration();
  const cur = video.currentTime || 0;
  if (state.playRangeEnd != null && cur >= state.playRangeEnd) { video.pause(); state.playRangeEnd = null; }
  $('#timecode').innerHTML = `${fmtClock(cur)} <span>/ ${fmtClock(dur)}</span>`;
  const pct = dur ? (cur / dur) * 100 : 0;
  $('#seekFill').style.width = pct + '%';
  $('#seekHead').style.left = pct + '%';
  requestAnimationFrame(frame);
}

video.addEventListener('play', () => setPlayIcon(true));
video.addEventListener('pause', () => setPlayIcon(false));
video.addEventListener('ended', () => setPlayIcon(false));
video.addEventListener('loadedmetadata', () => {
  if (!video.videoWidth) { requestProxy(); return; }
  applyZoom(zoom.scale);
  layoutCrop();
  renderSeekSegs();
});
video.addEventListener('error', () => requestProxy());

async function requestProxy() {
  const s = selected();
  if (!s) return;
  if (s.proxied) { toast('Không xem trước được video này (nhưng vẫn có thể cắt/xuất bình thường).', 'err', 5000); $('#proxyOverlay').classList.remove('on'); return; }
  s.proxied = true;
  $('#proxyOverlay').classList.add('on');
  $('#proxyPct').textContent = '0%';
  const token = s.id;
  const r = await api.makeProxy(s.info.path, token);
  $('#proxyOverlay').classList.remove('on');
  if (!r.ok) { toast('Không tạo được bản xem trước: ' + r.error.split('\n')[0], 'err', 5200); return; }
  s.proxyUrl = api.fileUrl(r.path);
  if (state.selectedId === s.id) { video.src = s.proxyUrl; video.load(); }
}
api.onProxyProgress((d) => { $('#proxyPct').textContent = Math.round(d.ratio * 100) + '%'; });

// seek bar
(function initSeek() {
  const seek = $('#seek');
  let down = false;
  const at = (e) => {
    const r = seek.getBoundingClientRect();
    state.playRangeEnd = null;
    seekTo(((e.clientX - r.left) / r.width) * curDuration());
  };
  seek.addEventListener('pointerdown', (e) => { if (!selected()) return; down = true; seek.setPointerCapture(e.pointerId); at(e); });
  seek.addEventListener('pointermove', (e) => { if (down) at(e); });
  seek.addEventListener('pointerup', () => { down = false; });
  seek.addEventListener('pointercancel', () => { down = false; });
})();

$('#btnPlay').addEventListener('click', togglePlay);
video.addEventListener('click', togglePlay);

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); state.playRangeEnd = null; seekTo(video.currentTime - (e.shiftKey ? 0.1 : 1)); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); state.playRangeEnd = null; seekTo(video.currentTime + (e.shiftKey ? 0.1 : 1)); }
  // Ctrl + scroll-like shortcuts for zoom
  else if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.code === 'Equal')) { e.preventDefault(); zoomIn(); }
  else if (e.ctrlKey && (e.key === '-' || e.code === 'Minus')) { e.preventDefault(); zoomOut(); }
  else if (e.ctrlKey && e.key === '0') { e.preventDefault(); zoomFit(); }
});

/* ---------------------------- Crop overlay ---------------------------- */
const cropLayer = $('#cropLayer');
const cropBox = $('#cropBox');
function layoutCrop() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const stageInner = $('#stageInner');
  if (!vw || !selected()) { cropLayer.classList.remove('on'); return; }
  // crop-layer khớp đúng kích thước stageInner (đã scale)
  const iw = stageInner.clientWidth  || 1;
  const ih = stageInner.clientHeight || 1;
  Object.assign(cropLayer.style, { left: '0', top: '0', width: iw + 'px', height: ih + 'px' });
  cropLayer.classList.toggle('on', state.opts.cropOn);
  renderCropBox();
}
function renderCropBox() {
  const c = state.opts.crop;
  Object.assign(cropBox.style, { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' });
  const s = selected();
  const pw = s ? Math.round(c.w * s.info.width) : 0;
  const ph = s ? Math.round(c.h * s.info.height) : 0;
  $('#cropTag').textContent = `${pw} × ${ph}`;
  $('#cropTag').style.top = c.y * cropLayer.clientHeight < 32 ? '6px' : '-28px';
  $('#cropTag').style.left = '0';
  $('#cropInfo').innerHTML = s
    ? `Vùng crop: <b>${pw} × ${ph}px</b> (từ ${s.info.width}×${s.info.height}).<br /><span style="color:var(--faint)">Áp dụng theo % khung hình cho mọi video.</span>`
    : 'Chọn một video để crop.';
}
// (resize handled by stageViewport observer above)

let cdrag = null;
cropLayer.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.crop-box')) return;
  const W = cropLayer.clientWidth;
  const H = cropLayer.clientHeight;
  const c = state.opts.crop;
  cdrag = { mode: e.target.dataset.h || 'move', x0: e.clientX, y0: e.clientY, W, H, r0: { l: c.x * W, t: c.y * H, r: (c.x + c.w) * W, b: (c.y + c.h) * H } };
  cropLayer.setPointerCapture(e.pointerId);
  e.preventDefault();
});
cropLayer.addEventListener('pointermove', (e) => { if (cdrag) applyCropDrag(e.clientX - cdrag.x0, e.clientY - cdrag.y0); });
['pointerup', 'pointercancel'].forEach((ev) => cropLayer.addEventListener(ev, () => { if (cdrag) { cdrag = null; updateOptionsUI(); } }));

function applyCropDrag(dx, dy) {
  const { W, H, r0, mode } = cdrag;
  const MIN = 28;
  let { l, t, r, b } = r0;
  if (mode === 'move') {
    const w = r - l; const h = b - t;
    l = clamp(l + dx, 0, W - w); t = clamp(t + dy, 0, H - h); r = l + w; b = t + h;
  } else {
    if (mode.includes('w')) l = clamp(l + dx, 0, r - MIN);
    if (mode.includes('e')) r = clamp(r + dx, l + MIN, W);
    if (mode.includes('n')) t = clamp(t + dy, 0, b - MIN);
    if (mode.includes('s')) b = clamp(b + dy, t + MIN, H);
    const ratio = state.opts.cropRatio;
    if (ratio) {
      const w = r - l; const h = b - t;
      if (mode.length === 2) {
        let nw = w; let nh = w / ratio;
        if (h * ratio > w) { nh = h; nw = h * ratio; }
        const maxW = mode.includes('w') ? r0.r : W - r0.l;
        const maxH = mode.includes('n') ? r0.b : H - r0.t;
        const s = Math.min(1, maxW / nw, maxH / nh);
        nw *= s; nh *= s;
        if (nw < MIN) { nw = MIN; nh = MIN / ratio; }
        if (mode.includes('w')) { r = r0.r; l = r - nw; } else { l = r0.l; r = l + nw; }
        if (mode.includes('n')) { b = r0.b; t = b - nh; } else { t = r0.t; b = t + nh; }
      } else if (mode === 'e' || mode === 'w') {
        let nw = w; let nh = nw / ratio;
        const cy = (r0.t + r0.b) / 2;
        const maxH = 2 * Math.min(cy, H - cy);
        if (nh > maxH) { nh = maxH; nw = nh * ratio; }
        if (mode === 'w') { r = r0.r; l = r - nw; } else { l = r0.l; r = l + nw; }
        t = cy - nh / 2; b = cy + nh / 2;
      } else {
        let nh = h; let nw = nh * ratio;
        const cx = (r0.l + r0.r) / 2;
        const maxW = 2 * Math.min(cx, W - cx);
        if (nw > maxW) { nw = maxW; nh = nw / ratio; }
        l = cx - nw / 2; r = cx + nw / 2;
        if (mode === 'n') { b = r0.b; t = b - nh; } else { t = r0.t; b = t + nh; }
      }
    }
  }
  state.opts.crop = { x: l / W, y: t / H, w: (r - l) / W, h: (b - t) / H };
  renderCropBox();
}

function applyCropPreset(r) {
  const o = state.opts;
  if (r === 'reset') { o.cropRatio = null; o.crop = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }; }
  else if (r === 'free') { o.cropRatio = null; }
  else {
    const [a, b] = r.split(':').map(Number);
    const ratio = a / b;
    o.cropRatio = ratio;
    const s = selected();
    const vr = s ? s.info.width / s.info.height : 16 / 9;
    let w; let h;
    if (ratio > vr) { w = 0.88; h = (w * vr) / ratio; } else { h = 0.88; w = (h * ratio) / vr; }
    o.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  }
  updateOptionsUI();
}

/* ---------------------------- Event wiring ---------------------------- */
async function pickAndAdd() {
  const paths = await api.openVideos();
  if (paths.length) addSources(paths);
}
$('#btnAdd').addEventListener('click', pickAndAdd);
$('#dropZone').addEventListener('click', pickAndAdd);

$('#sourceList').addEventListener('click', (e) => {
  const card = e.target.closest('.src-card');
  if (!card) return;
  if (e.target.closest('[data-act="rm"]')) { removeSource(card.dataset.id); return; }
  if (card.dataset.id !== state.selectedId) selectSource(card.dataset.id);
});

// window drag & drop
const appEl = $('#app');
window.addEventListener('dragover', (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) appEl.classList.add('drag-over'); });
window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) appEl.classList.remove('drag-over'); });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  appEl.classList.remove('drag-over');
  const files = [...(e.dataTransfer.files || [])];
  if (!files.length) return;
  addSources(files.map((f) => api.pathForFile(f)).filter(Boolean));
});

// cuts
$('#btnAddCut').addEventListener('click', () => {
  const src = selected();
  if (!src) return;
  const dur = src.info.duration;
  let start = video.currentTime || 0;
  if (start > dur - 0.5) start = Math.max(0, dur - 5);
  start = Math.round(start * 10) / 10;
  const end = Math.round(Math.min(dur, start + 5) * 10) / 10;
  const seg = addSeg(src, start, end);
  state.activeSegId = seg.id;
  renderAll();
  const inp = $(`.cut-row[data-id="${seg.id}"] [data-f="start"]`);
  if (inp) { inp.focus(); inp.select(); inp.closest('.cut-row').scrollIntoView({ block: 'nearest' }); }
});

const cutsList = $('#cutsList');
cutsList.addEventListener('change', (e) => {
  const inp = e.target.closest('input[data-f]');
  if (!inp) return;
  const src = selected();
  const row = inp.closest('.cut-row');
  const seg = state.segs[src.id].find((x) => x.id === row.dataset.id);
  const f = inp.dataset.f;
  const v = parseTime(inp.value);
  if (v == null) { seg.bad[f] = true; }
  else {
    seg.bad[f] = false;
    seg[f] = f === 'end' ? Math.min(v, src.info.duration) : v;
    inp.value = fmtTime(seg[f]);
  }
  refreshRow(seg.id);
  renderOrder();
  renderSeekSegs();
});
cutsList.addEventListener('keydown', (e) => {
  const inp = e.target.matches('input[data-f]') ? e.target : null;
  if (!inp) return;
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    const src = selected(); if (!src) return;
    const row = inp.closest('.cut-row');
    const seg = state.segs[src.id].find((x) => x.id === row.dataset.id);
    const f = inp.dataset.f;
    // Commit giá trị hiện tại ngay (giống blur/change)
    const v = parseTime(inp.value);
    if (v == null) { seg.bad[f] = true; }
    else {
      seg.bad[f] = false;
      seg[f] = f === 'end' ? Math.min(v, src.info.duration) : v;
      inp.value = fmtTime(seg[f]);
    }
    refreshRow(seg.id);
    renderOrder();
    renderSeekSegs();
    // Seek video đến điểm phù hợp
    if (!segIssue(seg, src)) {
      seekTo(f === 'start' ? seg.start : Math.min(seg.end, src.info.duration) - 0.05);
    }
    // Chuyển focus: start → end → nút Play của row
    if (f === 'start') {
      const endInp = row.querySelector('input[data-f="end"]');
      if (endInp) { endInp.focus(); endInp.select(); }
    } else {
      const playBtn = row.querySelector('[data-act="play"]');
      if (playBtn) playBtn.focus();
    }
  }
});
cutsList.addEventListener('focusin', (e) => {
  const row = e.target.closest('.cut-row');
  if (!row || row.dataset.id === state.activeSegId) return;
  state.activeSegId = row.dataset.id;
  $$('.cut-row').forEach((r) => r.classList.toggle('active', r === row));
  renderSeekSegs();
});
cutsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const src = selected();
  const row = btn.closest('.cut-row');
  const seg = state.segs[src.id].find((x) => x.id === row.dataset.id);
  const act = btn.dataset.act;
  if (act === 'del') { removeSeg(src, seg.id); renderAll(); return; }
  if (act === 'play') {
    if (segIssue(seg, src)) { toast(segIssue(seg, src), 'err'); return; }
    playRange(seg); return;
  }
  const t = Math.round((video.currentTime || 0) * 100) / 100;
  if (act === 'setStart') { seg.start = t; seg.bad.start = false; }
  if (act === 'setEnd') { seg.end = t; seg.bad.end = false; }
  refreshRow(seg.id, true);
  renderOrder();
  renderSeekSegs();
});

// paste modal
const pasteModal = $('#pasteModal');
function parsePasteText() {
  const lines = $('#pasteText').value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ok = []; const bad = [];
  lines.forEach((l, i) => { const r = parseRange(l); (r && r[1] > r[0] ? ok : bad).push(r && r[1] > r[0] ? r : i + 1); });
  return { ok, bad };
}
$('#btnPaste').addEventListener('click', () => { pasteModal.classList.add('on'); $('#pasteText').focus(); });
$('#pasteText').addEventListener('input', () => {
  const { ok, bad } = parsePasteText();
  $('#pasteInfo').innerHTML = `<b style="color:var(--ok)">${ok.length}</b> đoạn hợp lệ` + (bad.length ? ` • <b style="color:var(--danger)">dòng lỗi: ${bad.join(', ')}</b>` : '');
});
$('#btnPasteOk').addEventListener('click', () => {
  const src = selected();
  const { ok, bad } = parsePasteText();
  if (!ok.length) { toast('Không có dòng nào hợp lệ.', 'err'); return; }
  ok.forEach(([a, b]) => addSeg(src, a, Math.min(b, src.info.duration)));
  if (bad.length) toast(`Bỏ qua ${bad.length} dòng lỗi (dòng ${bad.join(', ')}).`, 'err', 4800);
  else toast(`Đã thêm ${ok.length} đoạn.`);
  $('#pasteText').value = ''; $('#pasteInfo').textContent = '';
  pasteModal.classList.remove('on');
  renderAll();
});
$$('[data-close]', pasteModal).forEach((b) => b.addEventListener('click', () => pasteModal.classList.remove('on')));
pasteModal.addEventListener('mousedown', (e) => { if (e.target === pasteModal) pasteModal.classList.remove('on'); });

// options
$('#optMute').addEventListener('click', () => { state.opts.mute = !state.opts.mute; updateOptionsUI(); });
$('#optCrop').addEventListener('click', () => { state.opts.cropOn = !state.opts.cropOn; updateOptionsUI(); });
$('#cropPresets').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) applyCropPreset(c.dataset.r); });
$('#speedChips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { state.opts.speed = +c.dataset.s; updateOptionsUI(); renderOrder(); } });
$('#rotateRow').addEventListener('click', (e) => {
  const b = e.target.closest('.tool'); if (!b) return;
  const o = state.opts;
  if (b.dataset.act === 'cw') o.rotate = (o.rotate + 90) % 360;
  if (b.dataset.act === 'ccw') o.rotate = (o.rotate + 270) % 360;
  if (b.dataset.act === 'fh') o.flipH = !o.flipH;
  if (b.dataset.act === 'fv') o.flipV = !o.flipV;
  updateOptionsUI();
});
$('#rotateHint').addEventListener('click', (e) => {
  if (e.target.id === 'rotReset') { e.preventDefault(); Object.assign(state.opts, { rotate: 0, flipH: false, flipV: false }); updateOptionsUI(); }
});
$('#outputSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.opts.output = b.dataset.v; updateOptionsUI(); } });
$('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) { state.opts.mode = b.dataset.v; updateOptionsUI(); } });
$('#qualitySeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.opts.quality = b.dataset.v; updateOptionsUI(); } });
$('#btnDir').addEventListener('click', async () => { const d = await api.pickFolder(); if (d) { state.opts.outDir = d; updateOptionsUI(); } });
$('#btnDirReset').addEventListener('click', () => { state.opts.outDir = null; updateOptionsUI(); });

// order list drag & drop
(function initOrderDnD() {
  const list = $('#orderList');
  let dragId = null;
  list.addEventListener('dragstart', (e) => {
    const it = e.target.closest('.order-item'); if (!it) return;
    dragId = it.dataset.id; it.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
  });
  list.addEventListener('dragend', () => { dragId = null; $$('.order-item', list).forEach((x) => x.classList.remove('dragging', 'over')); });
  list.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault(); e.stopPropagation();
    const it = e.target.closest('.order-item');
    $$('.order-item', list).forEach((x) => x.classList.toggle('over', x === it && x.dataset.id !== dragId));
  });
  list.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault(); e.stopPropagation();
    const it = e.target.closest('.order-item');
    if (it && it.dataset.id !== dragId) {
      const from = state.order.indexOf(dragId);
      state.order.splice(from, 1);
      const to = state.order.indexOf(it.dataset.id);
      state.order.splice(to, 0, dragId);
    } else if (!it) {
      const from = state.order.indexOf(dragId);
      state.order.splice(from, 1); state.order.push(dragId);
    }
    dragId = null;
    renderOrder();
  });
  list.addEventListener('click', (e) => {
    const it = e.target.closest('.order-item'); if (!it) return;
    const r = resolveItem(it.dataset.id);
    if (!r) return;
    if (r.sourceId !== state.selectedId) selectSource(r.sourceId);
    if (r.seg) { state.activeSegId = r.seg.id; renderCuts(); renderSeekSegs(); const doSeek = () => seekTo(r.seg.start); if (video.readyState >= 1) doSeek(); else video.addEventListener('loadedmetadata', doSeek, { once: true }); }
  });
})();

/* ---------------------------- Export ---------------------------- */
const exModal = $('#exportModal');
let lastResults = [];

function buildJob() {
  const items = allItems();
  if (!items.length) throw new Error('Chưa có video/đoạn nào để xuất.');
  const o = state.opts;
  if ((o.output === 'merge' || o.output === 'both') && items.length < 2) throw new Error('Cần ít nhất 2 phần (video hoặc đoạn cắt) để ghép.');
  const sources = {};
  const outItems = [];
  items.forEach((it, i) => {
    sources[it.sourceId] = { ...it.source.info, id: it.sourceId };
    if (it.seg) {
      const issue = segIssue(it.seg, it.source);
      if (issue) throw new Error(`Đoạn #${i + 1} của “${basename(it.source.info.path)}”: ${issue}.`);
    }
    outItems.push({ id: it.id, sourceId: it.sourceId, start: it.seg ? it.seg.start : null, end: it.seg ? Math.min(it.seg.end, it.source.info.duration) : null });
  });
  const c = o.crop;
  return {
    items: outItems,
    sources,
    options: {
      mute: o.mute,
      crop: o.cropOn && validCrop() ? { x: clamp(c.x, 0, 1), y: clamp(c.y, 0, 1), w: clamp(c.w, 0.01, 1), h: clamp(c.h, 0.01, 1) } : null,
      rotate: o.rotate, flipH: o.flipH, flipV: o.flipV, speed: o.speed,
      mode: effectiveMode(), quality: o.quality, output: o.output, outDir: o.outDir,
    },
  };
}

function showExportRunning() {
  $('#exTitle').textContent = 'Đang xuất video…';
  $('#exBar').classList.remove('done');
  $('#exFill').style.width = '0%';
  $('#exPct').textContent = '0%';
  $('#exLabel').textContent = 'Chuẩn bị…';
  $('#exResults').innerHTML = '';
  $('#exNotes').innerHTML = '';
  $('#btnCancelExport').style.display = '';
  $('#btnOpenFolder').style.display = 'none';
  $('#btnCloseExport').style.display = 'none';
  exModal.classList.add('on');
}

api.onExportProgress((d) => {
  const p = Math.round(d.ratio * 100);
  $('#exFill').style.width = p + '%';
  $('#exPct').textContent = p + '%';
  $('#exLabel').textContent = d.label || '';
});

$('#btnExport').addEventListener('click', async () => {
  let job;
  try { job = buildJob(); } catch (e) { toast(e.message, 'err', 5200); return; }
  video.pause();
  showExportRunning();
  const r = await api.startExport(job);
  $('#btnCancelExport').style.display = 'none';
  if (r.cancelled) { exModal.classList.remove('on'); toast('Đã huỷ xuất video.', 'err'); return; }
  if (!r.ok) {
    $('#exTitle').textContent = 'Xuất thất bại';
    $('#exResults').innerHTML = `<div class="result bad"><span class="r-ic">${svg('alert')}</span><div class="r-t"><b>Lỗi</b><span>${esc(r.error)}</span></div></div>`;
    $('#btnCloseExport').style.display = '';
    return;
  }
  lastResults = r.results;
  const okCount = r.results.filter((x) => x.ok).length;
  $('#exTitle').textContent = okCount === r.results.length ? 'Hoàn tất 🎉' : `Xong (${okCount}/${r.results.length} thành công)`;
  $('#exBar').classList.add('done');
  $('#exFill').style.width = '100%'; $('#exPct').textContent = '100%'; $('#exLabel').textContent = 'Đã xử lý xong';
  $('#exResults').innerHTML = r.results.map((x, i) => x.ok
    ? `<div class="result ok"><span class="r-ic">${svg(x.kind === 'merge' ? 'merge' : 'check')}</span><div class="r-t"><b>${esc(basename(x.path))}</b><span>${esc(x.kind === 'merge' ? x.label : x.label)}</span></div><button class="btn sm" data-show="${i}">Mở</button></div>`
    : `<div class="result bad"><span class="r-ic">${svg('alert')}</span><div class="r-t"><b>${esc(x.label)}</b><span>${esc(x.error)}</span></div></div>`).join('');
  $('#exNotes').innerHTML = (r.notes || []).map((n) => `• ${esc(n)}`).join('<br />');
  $('#btnOpenFolder').style.display = okCount ? '' : 'none';
  $('#btnCloseExport').style.display = '';
});

$('#exResults').addEventListener('click', (e) => {
  const b = e.target.closest('[data-show]');
  if (b) api.showItem(lastResults[+b.dataset.show].path);
});
$('#btnOpenFolder').addEventListener('click', () => {
  const first = lastResults.find((x) => x.ok);
  if (first) api.showItem(first.path);
});
$('#btnCancelExport').addEventListener('click', () => { $('#exLabel').textContent = 'Đang huỷ…'; api.cancelExport(); });
$('#btnCloseExport').addEventListener('click', () => exModal.classList.remove('on'));

/* ---------------------------- Boot ---------------------------- */
hydrateIcons();
renderAll();
renderCropBox();
requestAnimationFrame(frame);
})();
