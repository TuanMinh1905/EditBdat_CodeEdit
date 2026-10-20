'use strict';
/**
 * Bộ dựng lệnh + chạy xuất video:
 *   - xuất từng đoạn riêng
 *   - ghép các đoạn/video thành 1 file
 *   - cả hai
 * Hỗ trợ: tắt tiếng, crop, xoay/lật, đổi tốc độ.
 * Chế độ "fast" = không encode lại (cắt theo keyframe); tự động quay về "precise"
 * nếu có chỉnh sửa hình ảnh hoặc việc copy thất bại.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const ff = require('./ffmpeg');

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/* ------------------------------------------------------------------ */
/* Tiện ích                                                           */
/* ------------------------------------------------------------------ */

function fmtLabel(sec) {
  const total = Math.max(0, sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  let s = total - h * 3600 - m * 60;
  s = Math.round(s * 100) / 100;
  let out = '';
  if (h) out += `${h}h${String(m).padStart(2, '0')}m`;
  else if (m) out += `${m}m`;
  out += `${h || m ? String(s).padStart(2, '0') : s}s`;
  return out;
}

function uniquePath(p) {
  if (!fs.existsSync(p)) return p;
  const dir = path.dirname(p);
  const ext = path.extname(p);
  const base = path.basename(p, ext);
  let i = 2;
  while (fs.existsSync(path.join(dir, `${base}_${i}${ext}`))) i++;
  return path.join(dir, `${base}_${i}${ext}`);
}

function atempoChain(speed) {
  const parts = [];
  let s = speed;
  while (s > 2.0001) { parts.push('atempo=2'); s /= 2; }
  while (s < 0.4999) { parts.push('atempo=0.5'); s *= 2; }
  parts.push(`atempo=${s.toFixed(5)}`);
  return parts.join(',');
}

/** Có chỉnh sửa hình ảnh/tốc độ (bắt buộc encode lại) không? */
function needsReencode(o) {
  return !!(o.crop || o.rotate || o.flipH || o.flipV || (o.speed && Math.abs(o.speed - 1) > 1e-6));
}

/** Kích thước khung hình sau crop + xoay cho 1 nguồn */
function outputSize(src, o) {
  let w = src.width;
  let h = src.height;
  if (o.crop) {
    w = even(src.width * o.crop.w);
    h = even(src.height * o.crop.h);
  }
  if (o.rotate === 90 || o.rotate === 270) [w, h] = [h, w];
  return { w: even(w), h: even(h) };
}

/** Chuỗi filter video: crop → xoay/lật → tốc độ */
function videoFilterChain(src, o) {
  const f = [];
  if (o.crop) {
    const cw = Math.min(src.width, even(src.width * o.crop.w));
    const ch = Math.min(src.height, even(src.height * o.crop.h));
    const cx = Math.max(0, Math.min(src.width - cw, Math.round(src.width * o.crop.x)));
    const cy = Math.max(0, Math.min(src.height - ch, Math.round(src.height * o.crop.y)));
    f.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }
  if (o.rotate === 90) f.push('transpose=1');
  else if (o.rotate === 180) f.push('hflip', 'vflip');
  else if (o.rotate === 270) f.push('transpose=2');
  if (o.flipH) f.push('hflip');
  if (o.flipV) f.push('vflip');
  if (o.speed && Math.abs(o.speed - 1) > 1e-6) f.push(`setpts=PTS/${o.speed}`);
  return f;
}

/* ------------------------------------------------------------------ */
/* Xuất 1 đoạn                                                        */
/* ------------------------------------------------------------------ */

/**
 * @param {object} item {start, end} (null = cả video)
 * @param {object} norm  null | {w,h,fps}  → chuẩn hoá cho việc ghép
 * @param {boolean} forceAudio  tạo âm thanh im lặng nếu nguồn không có (để ghép)
 */
function buildSegmentArgs(item, src, o, outPath, { mode, norm, forceAudio }) {
  const start = item.start == null ? 0 : item.start;
  const end = item.end == null ? src.duration : item.end;
  const dur = Math.max(0.05, end - start);
  const whole = item.start == null && item.end == null;
  const args = [];

  if (mode === 'fast') {
    if (!whole) args.push('-ss', String(start));
    args.push('-i', src.path);
    if (!whole) args.push('-t', String(dur));
    args.push('-map', '0:v:0');
    if (!o.mute && src.hasAudio) args.push('-map', '0:a:0');
    args.push('-c', 'copy');
    if (o.mute) args.push('-an');
    args.push('-avoid_negative_ts', 'make_zero', '-movflags', '+faststart', outPath);
    return { args, effDur: dur };
  }

  // ---- precise (encode lại) ----
  if (!whole) args.push('-ss', String(start));
  args.push('-i', src.path);
  if (!whole) args.push('-t', String(dur));
  const wantAudio = !o.mute;
  const needSilence = wantAudio && !src.hasAudio && forceAudio;
  if (needSilence) args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');

  args.push('-map', '0:v:0');
  if (wantAudio && src.hasAudio) args.push('-map', '0:a:0');
  else if (needSilence) args.push('-map', '1:a:0');

  const vf = videoFilterChain(src, o);
  if (norm) {
    vf.push(
      `scale=${norm.w}:${norm.h}:force_original_aspect_ratio=decrease`,
      `pad=${norm.w}:${norm.h}:(ow-iw)/2:(oh-ih)/2:black`,
      'setsar=1',
      `fps=${norm.fps}`
    );
  } else {
    vf.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
  }
  vf.push('format=yuv420p');
  args.push('-vf', vf.join(','));

  const crf = o.quality === 'balanced' ? '23' : '18';
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf);

  if (wantAudio && (src.hasAudio || needSilence)) {
    const af = [];
    if (src.hasAudio && o.speed && Math.abs(o.speed - 1) > 1e-6) af.push(atempoChain(o.speed));
    if (af.length) args.push('-af', af.join(','));
    args.push('-c:a', 'aac', '-b:a', '192k');
    if (norm) args.push('-ar', '48000', '-ac', '2');
  } else {
    args.push('-an');
  }
  if (needSilence) args.push('-shortest');
  args.push('-movflags', '+faststart', outPath);
  const effDur = dur / (o.speed || 1);
  return { args, effDur };
}

/* ------------------------------------------------------------------ */
/* Công việc chính                                                    */
/* ------------------------------------------------------------------ */

let currentProc = null;
let cancelFlag = false;

function cancel() {
  cancelFlag = true;
  if (currentProc) {
    currentProc.__cancelled = true;
    try { currentProc.kill('SIGKILL'); } catch (_) { /* noop */ }
  }
}

function ffmpegCompatible(srcs, o) {
  const a = srcs[0];
  return srcs.every((s) =>
    s.vcodec === a.vcodec &&
    s.width === a.width &&
    s.height === a.height &&
    Math.round(s.fps) === Math.round(a.fps) &&
    s.pixFmt === a.pixFmt &&
    (o.mute || (s.hasAudio === a.hasAudio && s.acodec === a.acodec && s.sampleRate === a.sampleRate))
  );
}

/**
 * @param {{items:Array, sources:Object, options:Object}} job
 * @param {(p:{ratio:number,label:string})=>void} onProgress
 */
async function runJob(job, onProgress) {
  cancelFlag = false;
  const o = Object.assign(
    { mute: false, crop: null, rotate: 0, flipH: false, flipV: false, speed: 1,
      mode: 'precise', quality: 'high', output: 'separate', outDir: null },
    job.options || {}
  );
  const items = job.items;
  const sources = job.sources;
  if (!items || !items.length) throw new Error('Chưa có video/đoạn nào để xuất.');

  const results = [];
  const reencodeRequired = needsReencode(o);
  const notes = [];
  let mode = o.mode;
  if (mode === 'fast' && reencodeRequired) {
    mode = 'precise';
    notes.push('Có crop/xoay/tốc độ nên đã tự chuyển sang chế độ Chính xác (encode lại).');
  }

  const wantSeparate = o.output === 'separate' || o.output === 'both';
  const wantMerge = (o.output === 'merge' || o.output === 'both') && items.length >= 1;

  // ---- tính trọng số tiến độ ----
  const durOf = (it) => {
    const s = sources[it.sourceId];
    const st = it.start == null ? 0 : it.start;
    const en = it.end == null ? s.duration : it.end;
    return Math.max(0.5, (en - st) / (o.speed || 1));
  };
  const weights = items.map(durOf);
  const sumW = weights.reduce((a, b) => a + b, 0);
  let totalWork = 0;
  if (wantSeparate) totalWork += sumW;
  if (wantMerge) totalWork += sumW + Math.max(1, sumW * 0.03);
  let doneWork = 0;
  const report = (partial, label) =>
    onProgress && onProgress({ ratio: Math.min(1, (doneWork + partial) / totalWork), label });

  // ---- đặt tên đoạn ----
  const perSourceCounter = {};
  const nameFor = (it) => {
    const s = sources[it.sourceId];
    const dir = o.outDir || path.dirname(s.path);
    const base = path.basename(s.path, path.extname(s.path));
    if (it.start == null && it.end == null) return path.join(dir, `${base}_edited.mp4`);
    perSourceCounter[it.sourceId] = (perSourceCounter[it.sourceId] || 0) + 1;
    const n = String(perSourceCounter[it.sourceId]).padStart(2, '0');
    const t = `${fmtLabel(it.start == null ? 0 : it.start)}-${fmtLabel(it.end == null ? s.duration : it.end)}`;
    return path.join(dir, `${base}_${n}_${t}.mp4`);
  };

  const execute = async (args, effDur, label, weight) => {
    await ff.run(args, {
      durationSec: effDur,
      register: (p) => { currentProc = p; },
      onProgress: (r) => report(r * weight, label),
    });
    currentProc = null;
  };

  /** Render 1 đoạn; nếu fast thất bại thì tự thử lại precise */
  const renderOne = async (it, outPath, label, weight, opts) => {
    const s = sources[it.sourceId];
    let m = opts.mode;
    for (;;) {
      const { args, effDur } = buildSegmentArgs(it, s, o, outPath, { ...opts, mode: m });
      try {
        await execute(args, effDur, label, weight);
        return m;
      } catch (e) {
        try { fs.unlinkSync(outPath); } catch (_) { /* noop */ }
        if (e.cancelled || cancelFlag) throw e;
        if (m === 'fast' && !opts.noFallback) {
          m = 'precise';
          notes.push(`"${label}": copy trực tiếp không được, đã chuyển sang encode lại.`);
          continue;
        }
        throw e;
      }
    }
  };

  // ======================= XUẤT RIÊNG =======================
  if (wantSeparate) {
    for (let i = 0; i < items.length; i++) {
      if (cancelFlag) throw Object.assign(new Error('Đã huỷ'), { cancelled: true });
      const it = items[i];
      const s = sources[it.sourceId];
      const outPath = uniquePath(nameFor(it));
      const label = `${path.basename(s.path)} • ${it.start == null ? 'cả video' : fmtLabel(it.start) + ' → ' + fmtLabel(it.end)}`;
      report(0, label);
      try {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        await renderOne(it, outPath, label, weights[i], { mode, norm: null, forceAudio: false });
        results.push({ kind: 'segment', ok: true, path: outPath, label });
      } catch (e) {
        if (e.cancelled) throw e;
        results.push({ kind: 'segment', ok: false, label, error: e.message });
      }
      doneWork += weights[i];
      report(0, label);
    }
  }

  // ======================= GHÉP =======================
  if (wantMerge) {
    if (cancelFlag) throw Object.assign(new Error('Đã huỷ'), { cancelled: true });
    const srcList = items.map((it) => sources[it.sourceId]);
    const first = srcList[0];
    const dir = o.outDir || path.dirname(first.path);
    const base = path.basename(first.path, path.extname(first.path));
    const outPath = uniquePath(path.join(dir, `${base}_merged.mp4`));

    // chế độ ghép
    let mMode = mode;
    if (mMode === 'fast' && !ffmpegCompatible(srcList, o)) {
      mMode = 'precise';
      notes.push('Các video khác định dạng/độ phân giải nên khi ghép đã chuyển sang encode lại.');
    }

    // chuẩn hoá theo clip đầu tiên
    const size0 = outputSize(first, o);
    const norm = { w: size0.w, h: size0.h, fps: Math.max(1, Math.min(60, Math.round(first.fps) || 30)) };
    const anyAudio = !o.mute && srcList.some((s) => s.hasAudio);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcut-'));
    const label0 = 'Ghép video';
    try {
      const renderSegments = async (mm) => {
        const files = [];
        for (let i = 0; i < items.length; i++) {
          if (cancelFlag) throw Object.assign(new Error('Đã huỷ'), { cancelled: true });
          const it = items[i];
          const tmp = path.join(tmpDir, `seg_${mm}_${String(i).padStart(3, '0')}.mp4`);
          const s = sources[it.sourceId];
          const label = `Ghép • ${path.basename(s.path)} (${i + 1}/${items.length})`;
          report(0, label);
          await renderOne(it, tmp, label, weights[i], {
            mode: mm,
            norm,
            forceAudio: anyAudio,
            noFallback: true,
          });
          files.push(tmp);
          doneWork += weights[i];
        }
        return files;
      };
      let segFiles;
      const savedDone = doneWork;
      try {
        segFiles = await renderSegments(mMode);
      } catch (e) {
        if (e.cancelled || mMode !== 'fast') throw e;
        notes.push('Ghép bằng copy trực tiếp không thành công, đã chuyển sang encode lại.');
        doneWork = savedDone;
        mMode = 'precise';
        segFiles = await renderSegments('precise');
      }
      const listFile = path.join(tmpDir, 'list.txt');
      fs.writeFileSync(
        listFile,
        segFiles.map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'),
        'utf8'
      );
      const concatW = Math.max(1, sumW * 0.03);
      report(0, label0);
      fs.mkdirSync(dir, { recursive: true });
      await execute(
        ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outPath],
        sumW, label0, concatW
      );
      doneWork += concatW;
      results.push({ kind: 'merge', ok: true, path: outPath, label: `Bản ghép (${items.length} phần)` });
    } catch (e) {
      if (e.cancelled) throw e;
      results.push({ kind: 'merge', ok: false, label: 'Bản ghép', error: e.message });
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* noop */ }
    }
  }

  onProgress && onProgress({ ratio: 1, label: 'Hoàn tất' });
  return { results, notes };
}

module.exports = { runJob, cancel, fmtLabel };
