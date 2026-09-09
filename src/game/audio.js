import { state } from './state.js';

// Sonido y música 100% generados con Web Audio (sin archivos, sin copyright).
// La música es un loop estilo "phonk" (808, hi-hats en tresillo, cencerro).

const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

class Audio {
  constructor() {
    this.ctx = null;
    this.master = this.musicBus = this.sfxBus = null;
    this._noise = null;
    this._musicOn = false;
    this._sched = null;
    this._step = 0;
    this._nextTime = 0;
    this.bpm = 135;
  }

  init() {
    if (this.ctx || !AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    // bus de música con filtro pasa-bajos para el toque lo-fi
    this.musicLP = c.createBiquadFilter();
    this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 2600;
    this.musicBus = c.createGain();
    this.musicBus.connect(this.musicLP); this.musicLP.connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.connect(this.master);
    // buffer de ruido reutilizable
    const n = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this._noise = n;
    this.applyVolumes();
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  applyVolumes() {
    const a = state.ajustes;
    if (this.musicBus) this.musicBus.gain.value = (a.musica === 'juego' ? (a.volMusica ?? 0.5) : 0) * 0.9;
    if (this.sfxBus) this.sfxBus.gain.value = (a.volEfectos ?? 0.7);
  }

  // ---------- efectos ----------
  _noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this._noise; s.loop = true; return s; }
  _env(node, t, a, d, peak = 1) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  sfx(name) {
    if (!this.ctx) return;
    this.resume();
    const c = this.ctx, t = c.currentTime;
    const out = this.sfxBus;
    const tone = (freq, type, a, d, peak, slideTo) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + a + d);
      const g = c.createGain(); this._env(g, t, a, d, peak);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
    };
    const noiseHit = (a, d, peak, hp, lp) => {
      const s = this._noiseSrc();
      const f = c.createBiquadFilter(); f.type = 'bandpass';
      if (hp) { f.type = 'highpass'; f.frequency.value = hp; }
      if (lp) { f.type = 'lowpass'; f.frequency.value = lp; }
      const g = c.createGain(); this._env(g, t, a, d, peak);
      s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + a + d + 0.05);
    };

    switch (name) {
      case 'romper':   noiseHit(0.005, 0.13, 0.5, 0, 900); tone(150, 'sine', 0.005, 0.12, 0.3, 60); break;
      case 'poner':    tone(320, 'square', 0.004, 0.06, 0.25, 480); noiseHit(0.003, 0.04, 0.15, 1500); break;
      case 'saltar':   tone(300, 'sine', 0.02, 0.14, 0.3, 640); break;
      case 'pisada':   noiseHit(0.004, 0.05, 0.12, 400, 1600); break;
      case 'poder':    tone(180, 'sawtooth', 0.02, 0.4, 0.3, 900); noiseHit(0.02, 0.35, 0.12, 300); break;
      case 'sonico':   noiseHit(0.01, 0.5, 0.6, 0, 500); tone(90, 'sine', 0.01, 0.45, 0.5, 40); break;
      case 'golpe':    tone(120, 'square', 0.004, 0.1, 0.35, 70); noiseHit(0.003, 0.06, 0.25, 200, 2000); break;
      case 'dano':     tone(260, 'sawtooth', 0.01, 0.22, 0.3, 90); break;
      case 'acierto':  tone(660, 'sine', 0.01, 0.14, 0.3); setTimeout(() => tone(990, 'sine', 0.01, 0.18, 0.3), 90); break;
      case 'fallo':    tone(200, 'square', 0.01, 0.25, 0.28, 130); break;
      case 'medalla':  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 'triangle', 0.01, 0.16, 0.3), i * 80)); break;
      case 'jefe':     tone(70, 'sawtooth', 0.05, 1.1, 0.5, 45); noiseHit(0.05, 0.9, 0.18, 0, 400); break;
      case 'grito':    // grito de transformación: barrido ascendente + rugido
        tone(180, 'sawtooth', 0.45, 1.0, 0.4, 760);
        tone(240, 'square', 0.55, 1.1, 0.2, 900);
        noiseHit(0.5, 1.0, 0.3, 220, 1900);
        break;
      case 'menu':     tone(440, 'sine', 0.003, 0.05, 0.18, 520); break;
      case 'nivel':    [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.01, 0.14, 0.3), i * 70)); break;
    }
  }

  // ---------- música (phonk loop) ----------
  startMusic() {
    if (!this.ctx || this._musicOn || state.ajustes.musica !== 'juego') return;
    this._musicOn = true;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.1;
    this._sched = setInterval(() => this._scheduler(), 25);
  }
  stopMusic() {
    this._musicOn = false;
    clearInterval(this._sched); this._sched = null;
  }

  _scheduler() {
    if (!this._musicOn) return;
    const spb = 60 / this.bpm / 4; // duración de un semicorchea
    while (this._nextTime < this.ctx.currentTime + 0.12) {
      this._playStep(this._step % 16, this._nextTime);
      this._step++;
      this._nextTime += spb;
    }
  }

  _playStep(s, t) {
    const c = this.ctx, bus = this.musicBus;
    // patrones (16 semicorcheas). A menor pentatónica: A2=110 raíz
    const KICK = [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,0,0];
    const HAT  = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
    const OPEN = [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,1];
    const BASS = [110,0,0,0, 0,0,0,146.83, 0,0,98,0, 0,130.81,0,0]; // A2 . . . / . . . D3 / . . G2 . / . C3 . .
    const BELL = [0,0,0,0, 220,0,0,261.63, 0,0,329.63,0, 293.66,0,0,0]; // A3 C4 E4 D4 (motivo propio)

    // kick
    if (KICK[s]) {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.06);
      const g = c.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
    }
    // hats
    if (HAT[s]) {
      const open = OPEN[s];
      const src = c.createBufferSource(); src.buffer = this._noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain();
      const dur = open ? 0.14 : 0.035;
      g.gain.setValueAtTime(open ? 0.22 : 0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + 0.02);
    }
    // 808
    if (BASS[s]) {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(BASS[s] * 2.2, t);
      o.frequency.exponentialRampToValueAtTime(BASS[s], t + 0.05);
      const sh = c.createWaveShaper(); sh.curve = this._distCurve(); sh.oversample = '2x';
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(sh); sh.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5);
    }
    // cencerro melódico
    if (BELL[s]) {
      for (const mul of [1, 1.5]) {
        const o = c.createOscillator(); o.type = 'square';
        o.frequency.value = BELL[s] * mul;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = BELL[s] * mul; f.Q.value = 6;
        const g = c.createGain();
        g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.22);
      }
    }
  }

  _distCurve() {
    if (this._curve) return this._curve;
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
    this._curve = curve; return curve;
  }
}

export const audio = new Audio();

// enlace phonk en Spotify (búsqueda: abre la app si está instalada, si no la web)
export const SPOTIFY_PHONK = 'https://open.spotify.com/search/phonk/playlists';
