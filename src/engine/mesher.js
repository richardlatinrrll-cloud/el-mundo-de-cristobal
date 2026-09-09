import * as THREE from 'three';
import { AIR, BLOCKS, faceUV } from './blocks.js';
import { SX, SY, SZ, CHUNK } from './world.js';

// Malla por CHUNK (columna de CHUNK×SY×CHUNK). Editar un bloque solo re-genera
// su chunk (y los vecinos que tocan el borde), no el mundo entero.

const FACES = [
  { dir: [0, 1, 0], face: 0, corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
  { dir: [0,-1, 0], face: 2, corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
  { dir: [1, 0, 0], face: 1, corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]] },
  { dir: [-1,0, 0], face: 1, corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]] },
  { dir: [0, 0, 1], face: 1, corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [0, 0,-1], face: 1, corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

export function buildChunkGeometry(world, cx, cz) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const x1 = Math.min(SX, x0 + CHUNK), z1 = Math.min(SZ, z0 + CHUNK);
  const opaque = { pos: [], norm: [], uv: [], idx: [] };
  const trans  = { pos: [], norm: [], uv: [], idx: [] };
  const glow   = { pos: [], norm: [], uv: [], idx: [] };

  for (let y = 0; y < SY; y++) {
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const target = def?.glow ? glow : def?.alpha ? trans : opaque;
        for (const f of FACES) {
          const nId = world.get(x + f.dir[0], y + f.dir[1], z + f.dir[2]);
          if (nId !== AIR) {
            const nDef = BLOCKS[nId];
            if (!nDef?.alpha && !nDef?.glow) continue;
            if (nId === id) continue;
          }
          addFace(target, x, y, z, f, id);
        }
      }
    }
  }
  return { opaque: toGeometry(opaque), trans: toGeometry(trans), glow: toGeometry(glow) };
}

function addFace(t, x, y, z, f, id) {
  const base = t.pos.length / 3;
  const { u0, u1, v0, v1 } = faceUV(id, f.face);
  const uvs = [[u0, v1], [u0, v0], [u1, v0], [u1, v1]];
  for (let i = 0; i < 4; i++) {
    const c = f.corners[i];
    t.pos.push(x + c[0], y + c[1], z + c[2]);
    t.norm.push(f.dir[0], f.dir[1], f.dir[2]);
    t.uv.push(uvs[i][0], uvs[i][1]);
  }
  t.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function toGeometry(t) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
  g.setIndex(t.idx);
  g.computeBoundingSphere();
  return g;
}
