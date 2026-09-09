import { AIR } from './blocks.js';

// NOTA (2026-09-09): este módulo está DESACTIVADO. El agua/lava que "corría"
// inundaba el mapa (un balde de agua llenaba toda la zona) y las versiones más
// conservadoras secaban las cascadas y la lava de los volcanes generadas por el
// mundo. Se dejó el código por si se retoma con un modelo con "niveles" de
// verdad. Hoy main.js NO llama a tickFluidos: los fluidos quedan como los pone
// el generador del mundo.
//
// Agua (10) y lava (14) que CORREN. Modelo simple, MUY acotado y sin flooding:
//
//  - El fluido nunca se multiplica: se MUEVE, no se clona. La cantidad total de
//    fluido no puede crecer (así un balde de agua no inunda toda la base).
//  - Si tiene aire debajo → cae una casilla (se mueve hacia abajo).
//  - Si es una CORRIENTE (hay fluido justo encima) y tiene un borde al lado
//    (vecino con aire y aire debajo) → se desliza por ese borde: "corre" cuesta
//    abajo y se cae por los escalones.
//  - La superficie de un lago o poza quieta (sin fluido encima) NO se mueve.
//  - Agua + lava que se tocan → roca oscura (13).
//  - Solo se procesan las celdas que ya existían al empezar el tick, de arriba
//    hacia abajo, y con un tope por tick.

const AGUA = 10, LAVA = 14, ROCA = 13;

export function tickFluidos(world, px, py, pz, radio = 16, budget = 24) {
  const SX = world.SX, SY = world.SY, SZ = world.SZ;
  const x0 = Math.max(1, px - radio), x1 = Math.min(SX - 2, px + radio);
  const z0 = Math.max(1, pz - radio), z1 = Math.min(SZ - 2, pz + radio);
  const y0 = Math.max(1, py - 12), y1 = Math.min(SY - 2, py + 12);
  const g = (x, y, z) => world.get(x, y, z);

  // celdas de fluido actuales
  const celdas = [];
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const id = g(x, y, z);
        if (id === AGUA || id === LAVA) celdas.push([x, y, z, id]);
      }
  // de arriba hacia abajo: una columna que cae se resuelve limpia en un tick
  celdas.sort((a, b) => b[1] - a[1]);

  const otroDe = (id) => (id === AGUA ? LAVA : AGUA);
  const tocaOtro = (x, y, z, otro) =>
    g(x + 1, y, z) === otro || g(x - 1, y, z) === otro ||
    g(x, y, z + 1) === otro || g(x, y, z - 1) === otro ||
    g(x, y - 1, z) === otro || g(x, y + 1, z) === otro;

  let hechos = 0;
  for (const [x, y, z, id] of celdas) {
    if (hechos >= budget) break;
    if (g(x, y, z) !== id) continue;   // ya cambió en este tick
    const otro = otroDe(id);

    // agua + lava → roca
    if (tocaOtro(x, y, z, otro)) { world.set(x, y, z, ROCA); hechos++; continue; }

    // 1) cae recto (MOVER, no clonar)
    if (g(x, y - 1, z) === AIR) {
      world.set(x, y - 1, z, tocaOtro(x, y - 1, z, otro) ? ROCA : id);
      world.set(x, y, z, AIR);
      hechos++;
      continue;
    }

    // 2) corriente: si hay fluido justo encima (una caída o una columna que se
    //    vació), este bloque se DESLIZA a un lado. Prefiere un borde (vecino con
    //    aire debajo); si no, avanza por lo plano. Siempre MOVE (no clona), así
    //    la corriente "busca" la bajada sin poder inundar: un lago quieto (sin
    //    fluido encima) nunca entra aquí.
    if (g(x, y + 1, z) === id) {
      const bordes = [], planos = [];
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (g(nx, y, nz) !== AIR) continue;
        (g(nx, y - 1, nz) === AIR ? bordes : planos).push([nx, nz]);
      }
      const opciones = bordes.length ? bordes : planos;
      if (opciones.length) {
        const [nx, nz] = opciones[(Math.random() * opciones.length) | 0];
        world.set(nx, y, nz, tocaOtro(nx, y, nz, otro) ? ROCA : id);
        world.set(x, y, z, AIR);
        hechos++;
        continue;
      }
    }
    // 3) asentado: no hace nada (lagos, pozas y bloques sueltos quietos)
  }
  return hechos;
}
