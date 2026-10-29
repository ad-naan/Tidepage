/** Local synthesized sea ambience. Nothing plays until the visitor presses play. */
export function createSeaAudio() {
  const context = new AudioContext();
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 7,
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < data.length; i++) {
    previous = (previous + (Math.random() * 2 - 1) * 0.025) / 1.025;
    data[i] = previous * 5;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  const gain = context.createGain();
  gain.gain.value = 0;
  const swell = context.createOscillator();
  const swellGain = context.createGain();
  swell.frequency.value = 0.12;
  swellGain.gain.value = 0.045;
  swell.connect(swellGain).connect(gain.gain);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
  swell.start();
  let enabled = false;
  return {
    async setEnabled(value: boolean) {
      enabled = value;
      if (value) await context.resume();
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(value ? 0.14 : 0, context.currentTime, 0.35);
      swellGain.gain.setTargetAtTime(
        value ? 0.045 : 0,
        context.currentTime,
        0.35,
      );
    },
    suspend: () => context.suspend(),
    resume: () => (enabled ? context.resume() : Promise.resolve()),
    dispose: () => {
      source.stop();
      swell.stop();
      void context.close();
    },
  };
}
