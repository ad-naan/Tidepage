// Two original, deterministic ambient sketches. No samples or external recordings.
import fs from "node:fs";
fs.mkdirSync("public/audio", { recursive: true });
function render(name, root, seed) {
  const rate = 24000,
    duration = 48,
    samples = rate * duration;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  const scale = [0, 7, 12, 16, 19, 24, 19, 16, 12, 7, 4, 12];
  let noise = 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  for (let i = 0; i < samples; i++) {
    const t = i / rate,
      fade = Math.min(t / 3, 1, (duration - t) / 4),
      envelope = 0.65 + 0.35 * Math.sin(t * 0.18);
    noise = noise * 0.996 + random() * 0.004;
    let value = noise * (0.35 + 0.2 * Math.sin(t * 0.4));
    for (const ratio of [1, 1.5, 2])
      value += Math.sin(t * Math.PI * 2 * root * ratio) * 0.025 * envelope;
    for (
      let n = Math.max(0, Math.floor(t / 2.4) - 4);
      n <= Math.floor(t / 2.4);
      n++
    ) {
      const elapsed = t - n * 2.4,
        f = root * Math.pow(2, scale[n % scale.length] / 12) * 2;
      const env = (1 - Math.exp(-elapsed * 10)) * Math.exp(-elapsed * 0.72);
      value +=
        (Math.sin(2 * Math.PI * f * elapsed) +
          0.18 * Math.sin(2 * Math.PI * f * 2 * elapsed)) *
        env *
        0.12;
    }
    buffer.writeInt16LE(
      Math.max(-32767, Math.min(32767, value * fade * 32767)),
      44 + i * 2,
    );
  }
  fs.writeFileSync(`public/audio/${name}.wav`, buffer);
}
render("coast", 130.8128, 42);
render("afternoon", 146.8324, 71);
