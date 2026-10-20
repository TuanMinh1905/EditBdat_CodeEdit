# VCut Studio — Project Rules & Code Structure

> **Bắt buộc áp dụng cho mọi tính năng mới.**
> Bất kỳ đoạn code nào được thêm vào project này đều phải tuân thủ đầy đủ các quy tắc dưới đây.
> Không được tạo code theo cách khác nếu đã có quy chuẩn trong file này.

---

## 1. Stack & Môi trường

| Thành phần | Quyết định |
|---|---|
| Runtime | **Electron** (không dùng Tauri, NW.js hay bất kỳ framework khác) |
| Video Engine | **FFmpeg / FFprobe** qua `ffmpeg-static` + `ffprobe-static` |
| Renderer UI | **Vanilla HTML + Vanilla CSS + Vanilla JS** — không dùng React, Vue, Angular, Svelte, jQuery |
| CSS Framework | Không dùng Tailwind. Toàn bộ style nằm trong `src/renderer/styles.css` |
| Fonts | Google Fonts: **Inter** (UI chung) + **JetBrains Mono** (timecode, code) |
| Module system | **CommonJS** (`require` / `module.exports`) cho Main; inline `<script src>` cho Renderer |
| Language | **JavaScript thuần** (`'use strict';` đầu mỗi file) — không dùng TypeScript |
| Package manager | **npm** — không dùng yarn, pnpm |

---

## 2. Cấu trúc thư mục

```
Code_Edit/
├── Chay_App.bat             # Script chạy app (npm start + tự cài node_modules)
├── package.json
├── src/
│   ├── main/                # Main Process (Node.js / Electron)
│   │   ├── main.js          # Entry point chính, tạo BrowserWindow, đăng ký IPC
│   │   ├── preload.js       # Bridge duy nhất giữa Main <-> Renderer (contextBridge)
│   │   ├── ffmpeg.js        # Wrapper FFmpeg/FFprobe: probe(), run()
│   │   └── exporter.js      # Logic dựng lệnh & chạy xuất video: runJob(), cancel()
│   └── renderer/            # Renderer Process (Browser context)
│       ├── index.html       # Shell HTML duy nhất (SPA)
│       ├── styles.css       # Toàn bộ CSS
│       └── app.js           # Toàn bộ UI logic
└── test/
    └── engine-test.js       # Test xuất video (chạy độc lập với Node)
```

### Quy tắc thư mục
- **Không** tạo thêm thư mục con trong `src/main/` hoặc `src/renderer/` trừ khi có lý do rất rõ ràng.
- **Không** tạo file CSS riêng cho từng component — tất cả CSS thuộc về `styles.css`.
- **Không** tạo nhiều file JS renderer — toàn bộ UI logic nằm trong `app.js`.
- Khi thêm module helper mới (ví dụ: `thumbnails.js`), đặt trong `src/main/` nếu cần Node API, hoặc nhúng thẳng vào `app.js` nếu thuần browser.

---

## 3. Main Process (`src/main/`)

### 3.1 `main.js` — Điểm khởi đầu

**Bắt buộc có:**
```js
'use strict';
// Single-instance lock — KHÔNG được xoá
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}
// GPU shader cache — KHÔNG được xoá (tránh lỗi 'Access is denied' trên Windows)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
```

**BrowserWindow phải có các thuộc tính sau:**
```js
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,   // PHẢI là true
  nodeIntegration: false,   // PHẢI là false
  sandbox: false,           // Cần false để preload dùng require()
}
```

**IPC Handlers:**
- Đăng ký tất cả IPC handlers trong `main.js` bằng `ipcMain.handle()`.
- Mỗi handler **phải** trả về `{ ok: true, ...data }` khi thành công và `{ ok: false, error: string }` khi thất bại.
- Đặt tên channel theo pattern `domain:action` (ví dụ: `dialog:openVideos`, `video:probe`, `export:start`).

**Ví dụ chuẩn:**
```js
ipcMain.handle('video:probe', async (_e, filePath) => {
  try {
    return { ok: true, info: await ff.probe(filePath) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
```

**Dọn dẹp tmp:**
- Mọi file tạm (`os.tmpdir()`) **phải** được xoá trong sự kiện `app.on('before-quit')`.

---

### 3.2 `preload.js` — Bridge IPC

- Chỉ dùng `contextBridge.exposeInMainWorld('api', { ... })` — **không** expose biến global nào khác.
- **Không** dùng `require('url')` hay `require('path')` — hàm chuyển đổi đường dẫn phải tự viết inline:
```js
function fileUrl(p) {
  let s = String(p).replace(/\\/g, '/');
  if (!s.startsWith('/')) s = '/' + s;
  return 'file://' + s.split('/').map((seg, i) =>
    (i === 1 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg))
  ).join('/');
}
```
- Mọi API expose ra renderer **phải** được liệt kê trong preload — không dùng `ipcRenderer` trực tiếp trong renderer.

---

### 3.3 `ffmpeg.js` — Wrapper FFmpeg

- Tìm binary theo thứ tự: `ffmpeg-static` → fallback `'ffmpeg'` hệ thống.
- Hàm `probe(filePath)` trả về Promise resolve object:
  `{ path, duration, width, height, fps, vcodec, pixFmt, hasAudio, acodec, sampleRate, size, rotation }`
- Hàm `run(args, opts)` nhận `{ durationSec, onProgress, register }`.
- **Luôn** dùng `windowsHide: true` khi spawn để tránh cửa sổ console trên Windows.
- Khi process bị cancel, reject với `{ cancelled: true }`.

---

### 3.4 `exporter.js` — Logic Xuất

**Hai chế độ xử lý:**
- `fast`: stream copy (`-c copy`), không encode lại. Nếu thất bại tự fallback sang `precise`.
- `precise`: encode lại bằng `libx264 + aac`, áp dụng filter (crop, xoay, tốc độ, chuẩn hoá).

**Thứ tự filter video (bắt buộc):**
`crop` → `rotate/flip` → `setpts` (tốc độ) → `scale/pad` (khi ghép) → `format=yuv420p`

**Quy tắc đặt tên file output:**
- Đoạn riêng: `{base}_{index}_{start}-{end}.mp4`
- Toàn bộ video: `{base}_edited.mp4`
- File ghép: `{base}_merged.mp4`
- Nếu file đã tồn tại: thêm `_2`, `_3`… qua hàm `uniquePath()`

**State cancel:**
```js
let currentProc = null;
let cancelFlag = false;
// Ở đầu runJob() phải reset: cancelFlag = false
// cancel() kill process và đặt cancelFlag = true
```

---

## 4. Renderer Process (`src/renderer/`)

### 4.1 `index.html`

- **Phải có** Content-Security-Policy meta tag.
- Script duy nhất: `<script src="app.js"></script>` — đặt cuối `<body>`.
- CSS duy nhất: `<link rel="stylesheet" href="styles.css" />`.
- Icon SVG render qua `data-i="ten-icon"` — không nhúng SVG thẳng vào HTML.

---

### 4.2 `app.js` — UI Logic

**Header bắt buộc:**
```js
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = window.api;  // CHỈ khai báo MỘT LẦN duy nhất
if (!api) {
  document.body.insertAdjacentHTML('afterbegin', `<div ...>Lỗi: không nạp được window.api</div>`);
  throw new Error('window.api is undefined (preload failed)');
}
```

**Quy tắc `const api`:**
- **Chỉ khai báo một lần duy nhất** ở đầu file — vi phạm quy tắc này gây SyntaxError crash toàn bộ UI.

**Icon system:**
- Tất cả icon là inline SVG, định nghĩa trong object `ICONS` ở đầu file.
- Render qua hàm `icon(name)` và gắn vào DOM bằng thuộc tính `data-i="name"`.

**State management:**
- State được tổ chức thành object rõ ràng (`state`, `cropState`, `proxyMap`...).
- Không dùng biến global rải rác — nhóm liên quan vào cùng một object.

**IPC từ Renderer:**
- Gọi qua `api.*` — **không** dùng `window.electronAPI` hay bất kỳ tên khác.
- Xử lý kết quả theo pattern `{ ok, ... }`.

**Event listeners:**
- Không gắn event listener bằng `onclick=""` trong HTML.
- Với danh sách động: dùng **event delegation** trên container.

**Async:**
- Mọi hàm async phải có `try/catch`.
- Hiển thị lỗi bằng `toast(message, type)`, không dùng `alert()`.

---

### 4.3 `styles.css`

**Design tokens (CSS variables) bắt buộc:**
```css
:root {
  --bg:      #0b0d17;   /* nền chính */
  --surface: #141627;   /* card/panel */
  --border:  #1e2136;
  --accent:  #8b6cff;   /* tím chính */
  --accent2: #5b8dff;   /* xanh */
  --text:    #e2e4f0;
  --muted:   #6b7099;
  --danger:  #fb7185;
  --ok:      #34d399;
}
```
- **Không hardcode màu** — phải dùng `var(--ten-bien)`.
- Font chính: `'Inter', sans-serif`. Font mono: `'JetBrains Mono', monospace`.
- Transition mặc định: `0.15s ease`.

**Layout chính (3 cột — không được thay đổi):**
```
.library (280px) | .center (flex-grow) | #inspector (300px)
```

---

## 5. Quy ước đặt tên

| Loại | Convention | Ví dụ |
|---|---|---|
| IPC channel | `domain:action` | `video:probe`, `export:start` |
| HTML id | `camelCase` | `btnAdd`, `seekFill`, `exportModal` |
| CSS class | `kebab-case` | `.src-list`, `.crop-box`, `.panel-head` |
| JS variable/function | `camelCase` | `currentProc`, `buildSegmentArgs()` |
| JS constant cố định | `UPPER_SNAKE` | `FFMPEG`, `FFPROBE`, `ICONS` |

---

## 6. Error Handling & Logging

- **Main**: Log lỗi bằng `console.error()`. Không để unhandled rejection.
- **Renderer**: Hiển thị lỗi bằng `toast(message, 'error')`.
- **IPC boundary**: Mọi lỗi phải được bắt trong handler, trả về `{ ok: false, error: string }`.
- **FFmpeg**: Khi lỗi, log 6 dòng cuối stderr vào message.
- **Cancel**: Kiểm tra `err.cancelled === true` trước khi hiện thông báo lỗi.

---

## 7. Checklist thêm tính năng mới

### Nếu tính năng cần xử lý nặng (FFmpeg, file system):
- [ ] Thêm logic vào `exporter.js` hoặc tạo module mới trong `src/main/`
- [ ] Expose API qua `preload.js`
- [ ] Đăng ký IPC handler trong `main.js` theo pattern `{ ok, ... }`

### Nếu tính năng cần UI:
- [ ] Thêm HTML vào `index.html` đúng section
- [ ] Thêm CSS vào `styles.css` (dùng CSS variable)
- [ ] Thêm logic vào `app.js` (không tạo file JS mới)
- [ ] Gắn event listener trong `app.js`, không dùng `onclick=""` trong HTML

### Luôn kiểm tra:
- [ ] Không có `const api` khai báo lần 2 trong `app.js`
- [ ] Mọi IPC call trong renderer đều qua `api.*`
- [ ] Mọi lỗi được bắt và hiển thị qua `toast()` hoặc `{ ok: false }`
- [ ] Không có file tạm bị bỏ sót trong `os.tmpdir()`
- [ ] Kích thước video output luôn là số chẵn (dùng `even()`)

---

## 8. TUYỆT ĐỐI KHÔNG làm

- Không dùng `nodeIntegration: true`
- Không gọi `ipcRenderer` trực tiếp trong renderer — phải qua `preload.js`
- Không tạo nhiều `BrowserWindow`
- Không xoá `app.requestSingleInstanceLock()` — gây lỗi GPU cache trên Windows
- Không xoá `disable-gpu-shader-disk-cache` — gây lỗi "Access is denied" trên Windows
- Không khai báo `const api` hai lần trong `app.js` — gây SyntaxError crash toàn bộ UI
- Không dùng `alert()` / `confirm()` / `prompt()`
- Không hardcode đường dẫn Windows — dùng `path.join()` hoặc `os.tmpdir()`
- Không dùng `require('url')` trong preload
- Không install dependency UI (React, Vue, Bootstrap...) mà không thảo luận trước
