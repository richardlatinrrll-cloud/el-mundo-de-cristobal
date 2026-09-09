import { AIR, isOpaque } from './blocks.js';

// El mundo tiene tamaño VARIABLE. SX/SY/SZ son bindings vivos: otros módulos que
// hacen `import { SX }` ven el valor nuevo después de aplicarWorldSize().
export let SX = 96, SY = 64, SZ = 96;
export let CHUNK = 16;

export const TAMANOS = {
  pequeno: { SX: 192, SY: 80,  SZ: 192, label: 'Pequeño' },
  mediano: { SX: 384, SY: 96,  SZ: 384, label: 'Mediano' },
  grande:  { SX: 576, SY: 112, SZ: 576, label: 'Grande' },
  gigante: { SX: 768, SY: 120, SZ: 768, label: 'Gigante' },
};

export const TIPOS = {
  llanuras:  { label: 'Llanuras',        emoji: '🌳', cielo: 0x8fc7ff },
  bosque:    { label: 'Bosque',          emoji: '🌲', cielo: 0x8fc7ff },
  montanas:  { label: 'Montañas',        emoji: '⛰️', cielo: 0xa9c7e0 },
  desierto:  { label: 'Desierto',        emoji: '🏜️', cielo: 0xffe6b0 },
  islas:     { label: 'Islas',           emoji: '🏝️', cielo: 0x8fd7ff },
  flotante:  { label: 'Islas flotantes', emoji: '☁️', cielo: 0xbfe3ff },
  plano:     { label: 'Plano (construir)', emoji: '🟩', cielo: 0x9fd4ff },
};

export function aplicarWorldSize(nombre) {
  const t = TAMANOS[nombre] || TAMANOS.pequeno;
  SX = t.SX; SY = t.SY; SZ = t.SZ;
}

// RNG determinista por semilla (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  // config: { tipo, semilla, tamano, edits: {"x,y,z": id} }
  constructor(config = {}) {
    this.tipo = config.tipo || 'llanuras';
    this.semilla = (config.semilla | 0) || 12345;
    this.tamano = config.tamano || 'pequeno';
    aplicarWorldSize(this.tamano);

    this.SX = SX; this.SY = SY; this.SZ = SZ;
    this.data = new Uint8Array(SX * SY * SZ);
    this.dirtyChunks = new Set();   // "cx,cz"
    this.rnd = mulberry32(this.semilla);

    const gen = GENERADORES[this.tipo] || GENERADORES.llanuras;
    gen(this);
    if (this.tipo !== 'plano' && this.tipo !== 'flotante') this.vetas();

    // superponer lo que el jugador ya había construido
    if (config.edits) {
      for (const [k, id] of Object.entries(config.edits)) {
        const [x, y, z] = k.split(',').map(Number);
        if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = id;
      }
    }
    this.markAllDirty();
  }

  idx(x, y, z) { return (y * SZ + z) * SX + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ; }

  get(x, y, z) {
    if (!this.inside(x, y, z)) return y < 0 ? 13 : AIR;
    return this.data[this.idx(x, y, z)];
  }
  set(x, y, z, id) {
    if (!this.inside(x, y, z)) return false;
    this.data[this.idx(x, y, z)] = id;
    this.markDirtyAround(x, z);
    return true;
  }
  isOpaqueAt(x, y, z) { return isOpaque(this.get(x, y, z)); }

  chunkKey(cx, cz) { return cx + ',' + cz; }
  markDirtyAround(x, z) {
    const cx = (x / CHUNK) | 0, cz = (z / CHUNK) | 0;
    this.dirtyChunks.add(this.chunkKey(cx, cz));
    // si el bloque toca el borde, el chunk vecino también cambia de caras
    if (x % CHUNK === 0) this.dirtyChunks.add(this.chunkKey(cx - 1, cz));
    if (x % CHUNK === CHUNK - 1) this.dirtyChunks.add(this.chunkKey(cx + 1, cz));
    if (z % CHUNK === 0) this.dirtyChunks.add(this.chunkKey(cx, cz - 1));
    if (z % CHUNK === CHUNK - 1) this.dirtyChunks.add(this.chunkKey(cx, cz + 1));
  }
  markAllDirty() {
    this.dirtyChunks.clear();
    for (let cx = 0; cx < Math.ceil(SX / CHUNK); cx++)
      for (let cz = 0; cz < Math.ceil(SZ / CHUNK); cz++)
        this.dirtyChunks.add(this.chunkKey(cx, cz));
  }

  // primer bloque de aire sobre la superficie en (x,z)
  surfaceY(x, z) {
    for (let y = SY - 1; y >= 0; y--) {
      const b = this.get(x, y, z);
      if (b !== AIR && b !== 10) return y + 1;
    }
    return 1;
  }

  // aplana suavemente una zona de aparición que se funde con el terreno vecino
  plataformaCentral(topId = 1) {
    const cx = (SX / 2) | 0, cz = (SZ / 2) | 0;
    const R = 6;
    const baseY = this.surfaceY(cx, cz) - 1; // bloque de superficie
    for (let x = cx - R; x <= cx + R; x++)
      for (let z = cz - R; z <= cz + R; z++) {
        const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
        // altura objetivo: plano en el centro, transición hacia el terreno real en el borde
        const real = this.surfaceY(x, z) - 1;
        const t = Math.min(1, Math.max(0, (d - 2) / (R - 2)));
        const objetivo = Math.round(baseY * (1 - t) + real * t);
        for (let y = 0; y <= objetivo; y++)
          this.data[this.idx(x, y, z)] = y < objetivo - 3 ? 3 : y < objetivo ? 2 : topId;
        for (let y = objetivo + 1; y < SY; y++) {
          const cur = this.data[this.idx(x, y, z)];
          if (cur !== 10) this.data[this.idx(x, y, z)] = AIR; // deja el agua
        }
      }
    return baseY + 1;
  }

  // y del bloque sólido superior en (x,z), -1 si no hay
  topeSolido(x, z) {
    for (let y = SY - 1; y >= 0; y--) {
      const b = this.data[this.idx(x, y, z)];
      if (b !== AIR && b !== 10 && b !== 14) return y;
    }
    return -1;
  }

  // rellena de agua todo lo que quede bajo el nivel del mar -> lagos y océanos
  lagosYMar(mar) {
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = this.topeSolido(x, z);
        if (h < 0) continue;
        if (h < mar) {
          if (h >= mar - 2 && this.data[this.idx(x, h, z)] === 1) this.data[this.idx(x, h, z)] = 6; // playa
          for (let y = h + 1; y <= mar; y++)
            if (this.data[this.idx(x, y, z)] === AIR) this.data[this.idx(x, y, z)] = 10;
        }
      }
  }

  // ríos serpenteantes que cruzan el mapa
  rios(n, mar) {
    for (let r = 0; r < n; r++) {
      const horizontal = this.rnd() < 0.5;
      let px = horizontal ? 0 : ((this.rnd() * SX) | 0);
      let pz = horizontal ? ((this.rnd() * SZ) | 0) : 0;
      const pasos = horizontal ? SX : SZ;
      const s = this.semilla + 700 + r * 13;
      for (let i = 0; i < pasos; i++) {
        // avanzar y serpentear
        if (horizontal) { px = i; pz += Math.round(fbm(i * 0.05, r, s, 2) * 2); }
        else { pz = i; px += Math.round(fbm(i * 0.05, r, s, 2) * 2); }
        const ancho = 2 + ((this.rnd() * 2) | 0);
        for (let dx = -ancho; dx <= ancho; dx++)
          for (let dz = -ancho; dz <= ancho; dz++) {
            if (dx * dx + dz * dz > ancho * ancho + 1) continue;
            const x = px + dx, z = pz + dz;
            if (!this.inside(x, 0, z)) continue;
            const cauce = mar - 1;
            // vaciar por encima del cauce y rellenar de agua hasta el nivel del río
            for (let y = cauce + 1; y < SY; y++) if (this.data[this.idx(x, y, z)] !== AIR) this.data[this.idx(x, y, z)] = AIR;
            for (let y = 0; y <= cauce; y++) {
              const cur = this.data[this.idx(x, y, z)];
              if (y >= cauce - 1) this.data[this.idx(x, y, z)] = 10;
              else if (cur === AIR) this.data[this.idx(x, y, z)] = 2; // no dejar huecos bajo el agua
            }
          }
      }
    }
  }

  // un volcán: cono de roca volcánica con cráter de lava y un río de lava
  volcan(cx, cz) {
    const R = 16;
    const baseY = Math.max(4, this.topeSolido(cx, cz));
    const altura = Math.min(SY - 4, baseY + 26 + ((this.rnd() * 8) | 0));
    for (let x = cx - R; x <= cx + R; x++)
      for (let z = cz - R; z <= cz + R; z++) {
        if (!this.inside(x, 0, z)) continue;
        const d = Math.hypot(x - cx, z - cz);
        if (d > R) continue;
        const top = Math.round(baseY + (altura - baseY) * (1 - d / R));
        for (let y = 0; y <= top; y++) {
          const cur = this.data[this.idx(x, y, z)];
          if (y > this.topeSolido(x, z) || cur === AIR || cur === 10) this.data[this.idx(x, y, z)] = 15;
        }
      }
    // cráter
    const craterR = 5;
    for (let x = cx - craterR; x <= cx + craterR; x++)
      for (let z = cz - craterR; z <= cz + craterR; z++) {
        if (!this.inside(x, 0, z)) continue;
        const d = Math.hypot(x - cx, z - cz);
        if (d > craterR) continue;
        for (let y = altura; y > altura - 5; y--) this.data[this.idx(x, y, z)] = AIR;
        // fondo de lava
        this.data[this.idx(x, altura - 5, z)] = 14;
        this.data[this.idx(x, altura - 4, z)] = d < craterR - 1 ? 14 : 15;
      }
  }

  // cascadas: donde un bloque de agua tiene aire debajo en un acantilado
  cascadas() {
    for (let x = 1; x < SX - 1; x++)
      for (let z = 1; z < SZ - 1; z++)
        for (let y = SY - 2; y > 4; y--) {
          if (this.data[this.idx(x, y, z)] !== 10) continue;
          if (this.data[this.idx(x, y - 1, z)] !== AIR) continue;
          // cae por el acantilado
          let yy = y - 1, caida = 0;
          while (yy > 2 && this.data[this.idx(x, yy, z)] === AIR && caida < 12) {
            this.data[this.idx(x, yy, z)] = 10; yy--; caida++;
          }
          break;
        }
  }

  // vetas de minerales dentro de la piedra
  vetas() {
    // [id, cantidad de vetas, tamaño, yMin, yMax(frac de la superficie)]
    const tipos = [
      [16, Math.round(SX * SZ / 900), 6, 3, 0.95],  // carbón: común, cualquier profundidad
      [17, Math.round(SX * SZ / 1600), 5, 3, 0.75],  // hierro: medio
      [18, Math.round(SX * SZ / 4200), 3, 2, 0.35],  // oro: raro y hondo
      [19, Math.round(SX * SZ / 6000), 3, 2, 0.30],  // cristal: muy raro y hondo
    ];
    for (const [id, n, tam, yMin, yMaxFrac] of tipos) {
      for (let v = 0; v < n; v++) {
        const x0 = 2 + ((this.rnd() * (SX - 4)) | 0);
        const z0 = 2 + ((this.rnd() * (SZ - 4)) | 0);
        const sup = this.topeSolido(x0, z0);
        if (sup < 6) continue;
        const y0 = yMin + ((this.rnd() * Math.max(1, sup * yMaxFrac - yMin)) | 0);
        for (let b = 0; b < tam; b++) {
          const x = x0 + ((this.rnd() * 3 - 1) | 0);
          const y = y0 + ((this.rnd() * 3 - 1) | 0);
          const z = z0 + ((this.rnd() * 3 - 1) | 0);
          if (this.inside(x, y, z) && this.data[this.idx(x, y, z)] === 3) this.data[this.idx(x, y, z)] = id;
        }
      }
    }
  }
}

// ---------- ruido ----------
function hash2(x, y, s) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 2147483647;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash2(xi, yi, s), tr = hash2(xi + 1, yi, s);
  const bl = hash2(xi, yi + 1, s), br = hash2(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (tl + (tr - tl) * u) + ((bl + (br - bl) * u) - (tl + (tr - tl) * u)) * v;
}
function fbm(x, z, s, oct = 3) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * (noise2(x * freq, z * freq, s + o) * 2 - 1);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm; // ~[-1,1]
}

// ---------- árboles / cactus ----------
function ponerArbol(w, x, y, z) {
  const d = w.data;
  const trunk = 4 + ((w.rnd() * 3) | 0);
  for (let i = 1; i <= trunk; i++) if (w.inside(x, y + i, z)) d[w.idx(x, y + i, z)] = 4;
  const cy = y + trunk;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = 0; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + dy > 4) continue;
        const nx = x + dx, ny = cy + dy, nz = z + dz;
        if (w.inside(nx, ny, nz) && w.get(nx, ny, nz) === AIR) d[w.idx(nx, ny, nz)] = 5;
      }
}
function ponerCactus(w, x, y, z) {
  const h = 2 + ((w.rnd() * 3) | 0);
  for (let i = 1; i <= h; i++) if (w.inside(x, y + i, z)) w.data[w.idx(x, y + i, z)] = 12;
}
function dispersar(w, n, fn) {
  for (let t = 0; t < n; t++) {
    const x = 3 + ((w.rnd() * (SX - 6)) | 0);
    const z = 3 + ((w.rnd() * (SZ - 6)) | 0);
    if (Math.abs(x - SX / 2) < 7 && Math.abs(z - SZ / 2) < 7) continue;
    let y = SY - 1;
    while (y > 0 && w.get(x, y, z) === AIR) y--;
    fn(w, x, y, z, w.get(x, y, z));
  }
}

// ---------- generadores ----------
const GENERADORES = {
  llanuras(w) {
    const G = Math.round(SY * 0.32);
    const mar = G - 2;
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(4 * fbm(x * 0.05, z * 0.05, w.semilla, 3)
          + 3 * fbm(x * 0.012, z * 0.012, w.semilla + 5, 2));   // valles amplios
        columna(w, x, z, h, { top: 1, dirt: 3 });
      }
    w.rios(2 + ((w.rnd() * 2) | 0), mar);
    w.lagosYMar(mar);
    w.plataformaCentral(1);
    w.cascadas();
    dispersar(w, Math.round(SX * SZ / 340), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  bosque(w) {
    const G = Math.round(SY * 0.30);
    const mar = G - 2;
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(3 * fbm(x * 0.04, z * 0.04, w.semilla, 2)
          + 3 * fbm(x * 0.013, z * 0.013, w.semilla + 5, 2));
        columna(w, x, z, h, { top: 1, dirt: 3 });
      }
    w.rios(2, mar);
    w.lagosYMar(mar);
    w.plataformaCentral(1);
    w.cascadas();
    dispersar(w, Math.round(SX * SZ / 90), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  montanas(w) {
    const G = Math.round(SY * 0.26);
    const nieve = Math.round(SY * 0.62);
    const mar = G - 1;
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const ridge = 1 - Math.abs(fbm(x * 0.028, z * 0.028, w.semilla, 4));   // crestas
        const detalle = 0.5 + 0.5 * fbm(x * 0.08, z * 0.08, w.semilla + 3, 3);
        let h = G + Math.round((SY * 0.6) * Math.pow(ridge, 1.6) * detalle);
        h = Math.min(SY - 2, Math.max(G - 4, h));
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 3) id = 3;
          else if (y < h) id = h > nieve ? 3 : 2;
          if (y === h - 1 && h <= nieve) id = 1;
          if (y === h - 1 && h > nieve) id = 11;
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    // 1-2 volcanes lejos del centro
    const nv = 1 + ((w.rnd() * 2) | 0);
    for (let i = 0; i < nv; i++) {
      const vx = 24 + ((w.rnd() * (SX - 48)) | 0);
      const vz = 24 + ((w.rnd() * (SZ - 48)) | 0);
      if (Math.abs(vx - SX / 2) < 24 && Math.abs(vz - SZ / 2) < 24) { i--; continue; }
      w.volcan(vx, vz);
    }
    w.lagosYMar(mar);
    w.plataformaCentral(1);
    w.cascadas();
    dispersar(w, Math.round(SX * SZ / 500), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  desierto(w) {
    const G = Math.round(SY * 0.33);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const h = G + Math.round(5 * fbm(x * 0.03, z * 0.03, w.semilla, 3));
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 4) id = 3;
          else if (y < h) id = 6;
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    // oasis: un par de lagunas
    for (let o = 0; o < 3; o++) {
      const ox = 20 + ((w.rnd() * (SX - 40)) | 0), oz = 20 + ((w.rnd() * (SZ - 40)) | 0);
      const rr = 5 + ((w.rnd() * 5) | 0);
      for (let x = ox - rr; x <= ox + rr; x++)
        for (let z = oz - rr; z <= oz + rr; z++) {
          if (!w.inside(x, 0, z) || Math.hypot(x - ox, z - oz) > rr) continue;
          const top = w.topeSolido(x, z);
          for (let y = top; y > top - 3; y--) w.data[w.idx(x, y, z)] = 10;
          w.data[w.idx(x, top - 3, z)] = 6;
        }
    }
    w.plataformaCentral(6);
    dispersar(w, Math.round(SX * SZ / 260), (w, x, y, z, b) => { if (b === 6) ponerCactus(w, x, y, z); });
  },

  islas(w) {
    const mar = Math.round(SY * 0.34);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const n = fbm(x * 0.045, z * 0.045, w.semilla, 4);
        const h = mar + Math.round(n * 12);
        for (let y = 0; y < SY; y++) {
          let id = AIR;
          if (y < h - 3) id = 3;
          else if (y < h - 1) id = 2;
          else if (y < h) id = h > mar + 1 ? 1 : 6;
          else if (y < mar) id = 10;         // agua hasta el nivel del mar
          if (id) w.data[w.idx(x, y, z)] = id;
        }
      }
    const platY = w.plataformaCentral(1);
    // rodear la plataforma de agua si quedó bajo el mar
    dispersar(w, Math.round(SX * SZ / 400), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  flotante(w) {
    const base = Math.round(SY * 0.5);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        const n = fbm(x * 0.055, z * 0.055, w.semilla, 3);
        const n2 = fbm(x * 0.11 + 5, z * 0.11 - 3, w.semilla + 7, 2);
        if (n > 0.30) {
          const cy = base + Math.round(n2 * 14);
          const grosor = 2 + Math.round((n - 0.30) * 8);
          for (let y = cy - grosor; y <= cy; y++) {
            if (!w.inside(x, y, z)) continue;
            w.data[w.idx(x, y, z)] = y === cy ? 1 : (y > cy - 2 ? 2 : 3);
          }
        }
      }
    // isla flotante garantizada en el centro (con vacío alrededor)
    const cx = (SX / 2) | 0, cz = (SZ / 2) | 0, py = base + 2;
    for (let x = cx - 7; x <= cx + 7; x++)
      for (let z = cz - 7; z <= cz + 7; z++) {
        const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
        for (let y = 0; y < SY; y++) if (w.inside(x, y, z)) w.data[w.idx(x, y, z)] = AIR;
        if (d <= 5) {
          const prof = 3 - Math.max(0, d - 3);
          for (let y = py - prof; y <= py; y++)
            if (w.inside(x, y, z)) w.data[w.idx(x, y, z)] = y === py ? 1 : (y > py - 2 ? 2 : 3);
        }
      }
    dispersar(w, Math.round(SX * SZ / 300), (w, x, y, z, b) => { if (b === 1) ponerArbol(w, x, y, z); });
  },

  plano(w) {
    const G = Math.round(SY * 0.28);
    for (let x = 0; x < SX; x++)
      for (let z = 0; z < SZ; z++) {
        for (let y = 0; y < G; y++)
          w.data[w.idx(x, y, z)] = y < G - 3 ? 3 : y < G - 1 ? 2 : 1;
      }
  },
};

function columna(w, x, z, h, { top, dirt }) {
  h = Math.max(2, Math.min(SY - 2, h));
  for (let y = 0; y < SY; y++) {
    let id = AIR;
    if (y < h - 4) id = 3;
    else if (y < h - 1) id = 2;
    else if (y < h) id = top;
    if (id) w.data[w.idx(x, y, z)] = id;
  }
}
