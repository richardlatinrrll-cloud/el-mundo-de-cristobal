import * as THREE from 'three';

// Ciclo día/noche según la HORA REAL del dispositivo. Se ve amanecer, día,
// atardecer y noche según el reloj.

// keyframes por hora: [hora, colorCielo, intensidadSol, intensidadAmbiente]
const CIELO = [
  [0,  0x0b1330, 0.05, 0.26],  // medianoche (oscuro pero se puede caminar)
  [5,  0x1b2350, 0.06, 0.28],  // antes del alba
  [6.5,0xf2a15a, 0.55, 0.46],  // amanecer
  [8,  0x9fd0ef, 1.05, 0.82],  // mañana
  [13, 0x8fc7ff, 1.20, 0.95],  // mediodía
  [17, 0x9fc4e8, 1.00, 0.80],  // tarde
  [19, 0xef8a4a, 0.50, 0.44],  // atardecer
  [20.5,0x33306a, 0.12, 0.30], // anochecer
  [24, 0x0b1330, 0.05, 0.26],
];

function lerpHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t) | 0;
}

function muestra(h) {
  for (let i = 0; i < CIELO.length - 1; i++) {
    const [h0, c0, s0, a0] = CIELO[i];
    const [h1, c1, s1, a1] = CIELO[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return { cielo: lerpHex(c0, c1, t), sol: s0 + (s1 - s0) * t, amb: a0 + (a1 - a0) * t };
    }
  }
  return { cielo: 0x0b1330, sol: 0.05, amb: 0.16 };
}

export class DayNight {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x8b7f63, 0.75); // suelo cálido claro: caras verticales menos apagadas
    scene.add(this.sun, this.hemi);

    // estrellas (visibles de noche)
    const g = new THREE.BufferGeometry();
    const N = 500, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.05);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 300;
      pos[i * 3 + 1] = Math.cos(ph) * 300;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 300;
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this._t = 0;
    this._done = true;
    this.horaForzada = null; // para pruebas
    this._apply();
  }

  horaActual() {
    if (this.horaForzada != null) return this.horaForzada;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  update(dt, camera) {
    this._t += dt;
    if (this._t < 1 && this._done) { this._follow(camera); return; }
    this._t = 0; this._done = true;
    this._apply();
    this._follow(camera);
  }

  _follow(camera) {
    if (camera && camera.position) this.stars.position.copy(camera.position);
  }

  _apply() {
    const h = this.horaActual();
    const m = muestra(h);
    // posición del sol: sale ~6h, se pone ~19h
    const ang = ((h - 6) / 13) * Math.PI; // 0..π entre 6 y 19
    const alto = Math.sin(ang);
    this.sun.position.set(Math.cos(ang) * 120, Math.max(-30, alto * 150), 40);
    this.sun.intensity = m.sol;
    // color del sol: cálido al amanecer/atardecer
    const calido = alto > 0 && alto < 0.35;
    this.sun.color.setHex(calido ? 0xffb066 : 0xffffff);
    this.hemi.intensity = m.amb;
    this.hemi.color.setHex(m.cielo);

    this.scene.fog.color.setHex(m.cielo);
    this.renderer.setClearColor(m.cielo);

    const noche = Math.max(0, 1 - Math.max(0, alto) * 3);
    this.stars.material.opacity = noche * 0.9;
    this.scene.background = null;
    this._cieloActual = m.cielo;
  }

  get cielo() { return this._cieloActual ?? 0x8fc7ff; }

  // ¿está oscuro? (para que salgan más monstruos y sirva la antorcha)
  esNoche() {
    const h = this.horaActual();
    return h < 6 || h >= 20;
  }
}
