import { AIR } from './blocks.js';

// Agua (10) y lava (14) que CORREN. Modelo simple y acotado:
//  - Si tienen aire debajo → caen (el fluido baja).
//  - Se extienden 1 casilla al lado SOLO si tienen fluido justo encima
//    (una caída o una poza que sube). Así un lago plano y quieto no se
//    expande solo ni se vacía.
//  - Agua + lava que se tocan → roca oscura (13).
//  - Se procesan solo las celdas que YA existían al empezar el tick (para que
//    no haya reacción en cadena en un solo frame) y con presupuesto tope.

const AGUA = 10, LAVA = 14, ROCA = 13;

export function tickFluidos(world, px, py, pz, radio = 18, budget = 20) {
  const SX = world.SX, SY = world.SY, SZ = world.SZ;
  const x0 = Math.max(1, px - radio), x1 = Math.min(SX - 2, px + radio);
  const z0 = Math.max(1, pz - radio), z1 = Math.min(SZ - 2, pz + radio);
  const y0 = Math.max(1, py - 12), y1 = Math.min(SY - 2, py + 12);
  const g = (x, y, z) => world.get(x, y, z);

  // 1) juntar las celdas de fluido actuales (de abajo hacia arriba)
  const celdas = [];
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const id = g(x, y, z);
        if (id === AGUA || id === LAVA) celdas.push([x, y, z, id]);
      }

  let hechos = 0;
  for (const [x, y, z, id] of celdas) {
    if (hechos >= budget) break;
    if (g(x, y, z) !== id) continue;   // pudo cambiar en este mismo tick
    const otro = id === AGUA ? LAVA : AGUA;
    const tocaOtro = (nx, ny, nz) =>
      g(nx + 1, ny, nz) === otro || g(nx - 1, ny, nz) === otro ||
      g(nx, ny, nz + 1) === otro || g(nx, ny, nz - 1) === otro ||
      g(nx, ny - 1, nz) === otro || g(nx, ny + 1, nz) === otro;

    if (tocaOtro(x, y, z)) { world.set(x, y, z, ROCA); hechos++; continue; }

    // caer
    if (g(x, y - 1, z) === AIR) {
      world.set(x, y - 1, z, tocaOtro(x, y - 1, z) ? ROCA : id);
      hechos++;
      continue;
    }

    // extenderse al lado:
    //  - hacia un escalón que BAJA (aire debajo del vecino): siempre → "corre" cuesta abajo
    //  - en plano (suelo debajo del vecino): solo si está alimentado desde arriba,
    //    para que los lagos quietos no se expandan solos
    const alimentado = g(x, y + 1, z) === id;
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (hechos >= budget) break;
      if (g(nx, y, nz) !== AIR) continue;
      const bajada = g(nx, y - 1, nz) === AIR;
      if (!bajada && !alimentado) continue;
      world.set(nx, y, nz, tocaOtro(nx, y, nz) ? ROCA : id);
      hechos++;
    }
  }
  return hechos;
}
