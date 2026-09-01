export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
  }

  start() {
    if (this.ready) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 70;
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 38;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 400;
    filt.Q.value = 0.7;
    const g1 = ctx.createGain();
    g1.gain.value = 0.18;
    osc1.connect(g1);
    osc2.connect(g1);
    g1.connect(filt);
    filt.connect(master);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.value = 0.22;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(master);

    osc1.start();
    osc2.start();
    noise.start();

    this.master = master;
    this.osc1 = osc1;
    this.osc2 = osc2;
    this.filt = filt;
    this.ng = ng;
    this.ready = true;
    if (ctx.state === "suspended") ctx.resume();
  }

  update(model) {
    if (!this.ready) return;
    const t = model.throttle;
    const spd = Math.min(1, model.airspeed / 180);
    const now = this.ctx.currentTime;
    this.master.gain.linearRampToValueAtTime(model.crashed ? 0.0001 : 0.16 + t * 0.22, now + 0.05);
    this.osc1.frequency.linearRampToValueAtTime(55 + t * 90 + spd * 25, now + 0.05);
    this.osc2.frequency.linearRampToValueAtTime(28 + t * 40, now + 0.05);
    this.filt.frequency.linearRampToValueAtTime(280 + t * 1400 + spd * 400, now + 0.05);
    this.ng.gain.linearRampToValueAtTime(0.08 + t * 0.28 + (t > 0.85 ? 0.12 : 0), now + 0.05);
  }
}
