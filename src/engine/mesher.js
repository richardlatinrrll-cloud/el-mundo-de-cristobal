import * as THREE from 'three';
import { AIR, BLOCKS, faceUV, isOpaque } from './blocks.js';
import { SX, SY, SZ, CHUNK } from './world.js';

// Malla por CHUNK (columna de CHUNK×SY×CHUNK). Editar un bloque solo re-genera
// su chunk (y los vecinos que tocan el borde), no el mundo entero.
//
// Cada vértice lleva un color: sombreado por dirección de la cara (arriba más
// claro, abajo más oscuro) + oclusión ambiental (rincones más oscuros). Da
// profundidad y hace que el voxel se vea menos plano.

const FACES = [
  { dir: [0, 1, 0], face: 0, corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]], t: [0, 2] },
  { dir: [0,-1, 0], face: 2, corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]], t: [0, 2] },
  { dir: [1, 0, 0], face: 1, corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], t: [1, 2] },
  { dir: [-1,0, 0], face: 1, corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], t: [1, 2] },
  { dir: [0, 0, 1], face: 1, corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], t: [0, 1] },
  { dir: [0, 0,-1], face: 1, corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], t: [0, 1] },
];

// sombra por dirección de cara
function dirShade(dir) {
  if (dir[1] === 1) return 1.0;      // arriba
  if (dir[1] === -1) return 0.58;    // abajo
  if (dir[0] !== 0) return 0.80;     // este / oeste
  return 0.90;                        // norte / sur
}

const AO_LEVEL = [0.5, 0.72, 0.86, 1.0];

export function buildChunkGeometry(world, cx, cz) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const x1 = Math.min(SX, x0 + CHUNK), z1 = Math.min(SZ, z0 + CHUNK);
  const opaque = { pos: [], norm: [], uv: [], col: [], idx: [] };
  const trans  = { pos: [], norm: [], uv: [], col: [], idx: [] };
  const glow   = { pos: [], norm: [], uv: [], col: [], idx: [] };

  const occ = (x, y, z) => isOpaque(world.get(x, y, z));

  for (let y = 0; y < SY; y++) {
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const target = def?.glow ? glow : def?.alpha ? trans : opaque;
        // altura de la superficie del fluido según su nivel (0 = lleno)
        let topH = 1;
        if (def?.liquid) {
          const nivel = world.fluidLevel ? world.fluidLevel(x, y, z) : 0;
          // si arriba hay el mismo fluido, este bloque va lleno (columna)
          if (nivel > 0 && world.get(x, y + 1, z) !== id) topH = 1 - nivel * 0.13;
        }
        for (const f of FACES) {
          const nId = world.get(x + f.dir[0], y + f.dir[1], z + f.dir[2]);
          if (nId !== AIR) {
            const nDef = BLOCKS[nId];
            if (!nDef?.alpha && !nDef?.glow) continue;
            if (nId === id) continue;
          }
          addFace(target, occ, x, y, z, f, id, !!def?.glow, topH);
        }
      }
    }
  }
  return { opaque: toGeometry(opaque), trans: toGeometry(trans), glow: toGeometry(glow) };
}

function addFace(t, occ, x, y, z, f, id, noAO, topH = 1) {
  const base = t.pos.length / 3;
  const { u0, u1, v0, v1 } = faceUV(id, f.face);
  const uvs = [[u0, v1], [u0, v0], [u1, v0], [u1, v1]];
  const sh = dirShade(f.dir);
  const [ta, tb] = f.t;
  // bloque de aire pegado a esta cara: desde ahí muestreamos los vecinos
  const ax = x + f.dir[0], ay = y + f.dir[1], az = z + f.dir[2];

  for (let i = 0; i < 4; i++) {
    const c = f.corners[i];
    const cy = c[1] === 1 ? topH : c[1];   // baja la superficie del fluido
    t.pos.push(x + c[0], y + cy, z + c[2]);
    t.norm.push(f.dir[0], f.dir[1], f.dir[2]);
    t.uv.push(uvs[i][0], uvs[i][1]);

    let shade = sh;
    if (!noAO) {
      const su = c[ta] ? 1 : -1;
      const sv = c[tb] ? 1 : -1;
      const o1 = [0, 0, 0]; o1[ta] = su;
      const o2 = [0, 0, 0]; o2[tb] = sv;
      const s1 = occ(ax + o1[0], ay + o1[1], az + o1[2]) ? 1 : 0;
      const s2 = occ(ax + o2[0], ay + o2[1], az + o2[2]) ? 1 : 0;
      const cn = occ(ax + o1[0] + o2[0], ay + o1[1] + o2[1], az + o1[2] + o2[2]) ? 1 : 0;
      const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cn);
      shade *= AO_LEVEL[ao];
    }
    t.col.push(shade, shade, shade);
  }
  t.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function toGeometry(t) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
  g.setIndex(t.idx);
  g.computeBoundingSphere();
  return g;
}
