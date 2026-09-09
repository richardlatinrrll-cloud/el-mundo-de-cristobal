import { AIR, isSolid } from './blocks.js';

// Fluidos con NIVELES, estilo Minecraft (agua 10, lava 14).
//
//  - FUENTE = nivel 0 (llena). El generador del mundo y el jugador crean fuentes.
//  - CORRIENTE = nivel 1..MAX. Nace de una fuente o de un vecino con menos nivel;
//    se debilita 1 por casilla de distancia. Si nadie la alimenta, se seca.
//  - Cae recto si hay aire debajo. Se extiende al lado buscando la bajada.
//  - Agua sobre un hueco lo RELLENA; 2+ fuentes de agua juntas hacen fuente nueva
//    (por eso una poza cavada bajo un lago se llena sola).
//  - Lava + agua → roca. La lava que corre además se ENFRÍA sola con el tiempo.
//  - Solo se simula un radio alrededor del jugador y con un tope por tick.

const AGUA = 10, LAVA = 14, ROCA = 13;
const MAXW = 6;   // el agua corre 6 casillas desde la fuente
const MAXL = 5;   // la lava corre 5 (ríos de lava más largos)
const BFS_MAX = 5; // qué tan lejos busca la bajada

export function tickFluidos(world, px, py, pz, radio = 12, budget = 80) {
  const SX = world.SX, SY = world.SY, SZ = world.SZ;
  world._ftick = (world._ftick || 0) + 1;
  const lavaTurno = world._ftick % 2 === 0;   // la lava actúa 1 de cada 2 ticks

  const x0 = Math.max(1, px - radio), x1 = Math.min(SX - 2, px + radio);
  const z0 = Math.max(1, pz - radio), z1 = Math.min(SZ - 2, pz + radio);
  const y0 = Math.max(1, py - 7), y1 = Math.min(SY - 2, py + 7);

  const g = (x, y, z) => world.get(x, y, z);
  const lvl = (x, y, z) => world.fluid.get((y * SZ + z) * SX + x) || 0;
  const setLvl = (x, y, z, L) => world.setFluidLevel(x, y, z, L);
  const put = (x, y, z, id, L) => { world.set(x, y, z, id); world.setFluidLevel(x, y, z, L); };
  const clear = (x, y, z) => { world.set(x, y, z, AIR); };

  // celdas de fluido actuales, de arriba hacia abajo
  const celdas = [];
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const id = g(x, y, z);
        if (id === AGUA || (id === LAVA && lavaTurno)) celdas.push([x, y, z, id]);
      }
  celdas.sort((a, b) => b[1] - a[1]);

  const HOR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const maxLevel = (id) => (id === AGUA ? MAXW : MAXL);

  // ¿alguna de las 6 caras toca el otro fluido?
  const tocaOtro = (x, y, z, otro) =>
    g(x + 1, y, z) === otro || g(x - 1, y, z) === otro ||
    g(x, y, z + 1) === otro || g(x, y, z - 1) === otro ||
    g(x, y - 1, z) === otro || g(x, y + 1, z) === otro;

  // BFS corto por casillas de aire con suelo, buscando una bajada; devuelve el
  // conjunto de direcciones iniciales que llevan a la bajada más cercana.
  function dirsHaciaLaBajada(x, y, z) {
    let mejor = Infinity;
    const buenas = new Set();
    for (let di = 0; di < 4; di++) {
      const [dx, dz] = HOR[di];
      const nx = x + dx, nz = z + dz;
      if (g(nx, y, nz) !== AIR) continue;
      // ¿bajada justo al lado?
      if (g(nx, y - 1, nz) === AIR) { if (1 < mejor) { mejor = 1; buenas.clear(); } if (1 === mejor) buenas.add(di); continue; }
      // BFS hasta BFS_MAX
      const vistos = new Set([nx + ',' + nz]);
      let frente = [[nx, nz, 1]];
      while (frente.length) {
        const sig = [];
        for (const [fx, fz, dist] of frente) {
          if (dist >= BFS_MAX || dist >= mejor) continue;
          for (const [ex, ez] of HOR) {
            const ax = fx + ex, az = fz + ez;
            const kk = ax + ',' + az;
            if (vistos.has(kk)) continue;
            vistos.add(kk);
            if (g(ax, y, az) !== AIR) continue;
            if (g(ax, y - 1, az) === AIR) {
              if (dist + 1 < mejor) { mejor = dist + 1; buenas.clear(); }
              if (dist + 1 === mejor) buenas.add(di);
            } else if (isSolid(g(ax, y - 1, az))) {
              sig.push([ax, az, dist + 1]);
            }
          }
        }
        frente = sig;
      }
    }
    return buenas;   // vacío = no hay bajada cerca
  }

  let ops = 0;
  for (const [x, y, z, id] of celdas) {
    if (ops >= budget) break;
    if (g(x, y, z) !== id) continue;
    const otro = id === AGUA ? LAVA : AGUA;
    const L = lvl(x, y, z);

    // --- contacto lava/agua → roca ---
    if (id === LAVA && tocaOtro(x, y, z, AGUA)) {
      put(x, y, z, ROCA, 0); ops++; continue;
    }
    if (id === AGUA) {
      // el agua enfría la lava que toca (los bordes que corren se hacen roca)
      let convertida = false;
      for (const [dx, dz] of HOR) {
        if (g(x + dx, y, z + dz) === LAVA && lvl(x + dx, y, z + dz) > 0) { put(x + dx, y, z + dz, ROCA, 0); convertida = true; ops++; }
      }
      if (g(x, y - 1, z) === LAVA && lvl(x, y - 1, z) > 0) { put(x, y - 1, z, ROCA, 0); ops++; }
      if (convertida) continue;
    }

    // --- nivel de una CORRIENTE: recalcular / secar ---
    if (L > 0) {
      let feed = Infinity;
      if (g(x, y + 1, z) === id) feed = 1;                       // alimentada desde arriba
      let fuentesLado = 0;
      for (const [dx, dz] of HOR) {
        if (g(x + dx, y, z + dz) !== id) continue;
        const nl = lvl(x + dx, y, z + dz);
        if (nl < L) feed = Math.min(feed, nl + 1);
        if (nl === 0) fuentesLado++;
      }
      // agua "infinita": 2+ fuentes al lado y suelo debajo → se vuelve fuente
      if (id === AGUA && fuentesLado >= 2 && isSolid(g(x, y - 1, z))) {
        setLvl(x, y, z, 0);
        world.markDirtyAround(x, z);
        ops++;
        continue;
      }
      // sin alimentación: el agua se seca; la lava se ENFRÍA a roca
      if (feed > maxLevel(id)) {
        if (id === LAVA) put(x, y, z, ROCA, 0);
        else { clear(x, y, z); world.markDirtyAround(x, z); }
        ops++; continue;
      }
      if (feed !== L) { setLvl(x, y, z, feed); world.markDirtyAround(x, z); }
    }

    const Lnow = lvl(x, y, z);

    // --- enfriamiento lento de la lava que SÍ corre (aún alimentada): una
    //     corteza que se forma con el tiempo aunque siga fluyendo ---
    if (id === LAVA && Lnow > 0 && Math.random() < 0.004 + 0.004 * Lnow) {
      put(x, y, z, ROCA, 0); ops++; continue;
    }

    // --- caer ---
    const abajo = g(x, y - 1, z);
    if (abajo === AIR) {
      put(x, y - 1, z, id, 1);   // fluido que cae ≈ lleno
      ops++;
      // sigue: una fuente que cae también puede desbordar al lado
    } else if (abajo === otro) {
      put(x, y - 1, z, ROCA, 0); ops++;
    }

    // --- extenderse al lado ---
    const conSuelo = g(x, y - 1, z) !== AIR;   // hay piso bajo esta celda
    const nivelSalida = Lnow + 1;
    if (nivelSalida <= maxLevel(id) && (conSuelo || Lnow === 0)) {
      const haciaBajada = dirsHaciaLaBajada(x, y, z);
      const idxs = haciaBajada.size ? [...haciaBajada] : [0, 1, 2, 3];
      for (const di of idxs) {
        if (ops >= budget) break;
        const [dx, dz] = HOR[di];
        const nx = x + dx, nz = z + dz;
        const n = g(nx, y, nz);
        if (n === AIR) { put(nx, y, nz, id, nivelSalida); ops++; }
        else if (n === otro) { put(nx, y, nz, ROCA, 0); ops++; }
        else if (n === id && lvl(nx, y, nz) > nivelSalida) { setLvl(nx, y, nz, nivelSalida); world.markDirtyAround(nx, nz); ops++; }
      }
    }
  }
  return ops;
}
