// Kiểm thử nhanh engine xuất (không cần mở giao diện)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ff = require('../src/main/ffmpeg');
const exporter = require('../src/main/exporter');

const dir = path.join(__dirname, 'media');
fs.mkdirSync(dir, { recursive: true });
const a = path.join(dir, 'a_1280x720.mp4');
const b = path.join(dir, 'b_640x480_noaudio.mp4');
const gen = (out, size, audio) => {
  if (fs.existsSync(out)) return;
  const args = ['-y', '-f', 'lavfi', '-i', `testsrc=size=${size}:rate=30:duration=20`];
  if (audio) args.push('-f', 'lavfi', '-i', 'sine=frequency=440:duration=20');
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '60');
  if (audio) args.push('-c:a', 'aac');
  args.push(out);
  execFileSync(ff.FFMPEG, args, { stdio: 'ignore' });
};
gen(a, '1280x720', true);
gen(b, '640x480', false);

(async () => {
  const ia = await ff.probe(a);
  const ib = await ff.probe(b);
  const out = path.join(dir, 'out');
  fs.rmSync(out, { recursive: true, force: true });
  const sources = { s1: { ...ia, id: 's1' }, s2: { ...ib, id: 's2' } };
  const items = [
    { id: 'c1', sourceId: 's1', start: 2, end: 5 },
    { id: 'c2', sourceId: 's1', start: 10.5, end: 13 },
    { id: 'w2', sourceId: 's2', start: null, end: null },
  ];
  const run = async (name, options) => {
    const t = Date.now();
    const r = await exporter.runJob({ items, sources, options: { outDir: path.join(out, name), ...options } }, () => {});
    console.log(`== ${name} (${Date.now() - t}ms)`);
    r.results.forEach((x) => console.log(x.ok ? 'OK ' : 'ERR', x.path || x.label, x.error || ''));
    r.notes.forEach((n) => console.log('NOTE', n));
    for (const x of r.results.filter((y) => y.ok)) {
      const p = await ff.probe(x.path);
      console.log('   ->', path.basename(x.path), p.duration.toFixed(2) + 's', `${p.width}x${p.height}`, p.hasAudio ? 'audio' : 'no-audio');
    }
  };
  await run('separate_precise', { output: 'separate', mode: 'precise' });
  await run('separate_fast', { output: 'separate', mode: 'fast', mute: true });
  await run('merge_precise', { output: 'merge', mode: 'precise' });
  await run('both_edit', { output: 'both', mode: 'precise', crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, rotate: 90, speed: 2 });
  await run('merge_mute', { output: 'merge', mode: 'precise', mute: true });
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
