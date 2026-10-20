'use strict';
/**
 * Lớp bọc FFmpeg / FFprobe:
 *  - tìm binary (ffmpeg-static → fallback ffmpeg hệ thống)
 *  - probe thông tin video
 *  - chạy ffmpeg kèm theo dõi tiến độ, hỗ trợ huỷ
 */
const { spawn } = require('child_process');
const fs = require('fs');

function resolveBinary(pkg, fallback) {
  try {
    let p = require(pkg);
    if (p && typeof p === 'object' && p.path) p = p.path; // ffprobe-static
    if (typeof p === 'string') {
      // Khi đóng gói bằng asar, binary nằm trong app.asar.unpacked
      p = p.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(p)) return p;
    }
  } catch (_) { /* bỏ qua → dùng fallback */ }
  return fallback;
}

const FFMPEG = resolveBinary('ffmpeg-static', 'ffmpeg');
const FFPROBE = resolveBinary('ffprobe-static', 'ffprobe');

function parseFraction(s) {
  if (!s) return 0;
  const [a, b] = String(s).split('/').map(Number);
  if (!b) return a || 0;
  return a / b;
}

function probe(file) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file];
    const p = spawn(FFPROBE, args, { windowsHide: true });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `ffprobe thoát với mã ${code}`));
      try {
        const j = JSON.parse(out);
        const v = (j.streams || []).find((s) => s.codec_type === 'video');
        const a = (j.streams || []).find((s) => s.codec_type === 'audio');
        if (!v) return reject(new Error('File này không có luồng video.'));
        let rotation = 0;
        if (v.tags && v.tags.rotate) rotation = Number(v.tags.rotate) || 0;
        if (v.side_data_list) {
          const sd = v.side_data_list.find((x) => x.rotation !== undefined);
          if (sd) rotation = Number(sd.rotation) || 0;
        }
        rotation = ((Math.round(rotation) % 360) + 360) % 360;
        let width = v.width;
        let height = v.height;
        // Ffmpeg tự xoay theo metadata → kích thước hiển thị bị hoán đổi
        if (rotation === 90 || rotation === 270) [width, height] = [height, width];
        const duration = Number(j.format.duration) || Number(v.duration) || 0;
        resolve({
          path: file,
          duration,
          width,
          height,
          fps: parseFraction(v.avg_frame_rate) || parseFraction(v.r_frame_rate) || 30,
          vcodec: v.codec_name,
          pixFmt: v.pix_fmt,
          hasAudio: !!a,
          acodec: a ? a.codec_name : null,
          sampleRate: a ? Number(a.sample_rate) : null,
          size: Number(j.format.size) || 0,
          rotation,
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Chạy ffmpeg.
 * @param {string[]} args
 * @param {{durationSec?: number, onProgress?: (ratio:number)=>void, register?: (proc)=>void}} opts
 */
function run(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const full = ['-hide_banner', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', ...args];
    const p = spawn(FFMPEG, full, { windowsHide: true });
    if (opts.register) opts.register(p);
    let stderr = '';
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        const m = /^out_time_(?:us|ms)=(\d+)/.exec(line);
        if (m && opts.durationSec && opts.onProgress) {
          // out_time_ms thực chất cũng là micro-giây trong ffmpeg
          const sec = Number(m[1]) / 1e6;
          opts.onProgress(Math.max(0, Math.min(1, sec / opts.durationSec)));
        }
      }
    });
    p.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    p.on('error', reject);
    p.on('close', (code, signal) => {
      if (p.__cancelled) return reject(Object.assign(new Error('Đã huỷ'), { cancelled: true }));
      if (code === 0) return resolve();
      const tail = stderr.trim().split(/\r?\n/).slice(-6).join('\n');
      reject(new Error(`ffmpeg lỗi (mã ${code ?? signal}):\n${tail}`));
    });
  });
}

module.exports = { FFMPEG, FFPROBE, probe, run };
