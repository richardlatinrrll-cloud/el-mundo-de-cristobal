import * as THREE from 'three';
import { isSolid } from '../engine/blocks.js';
import { state, save } from './state.js';
import { audio } from './audio.js';
import { toast } from '../ui/toast.js';

// ---------------------------------------------------------------------------
// PARTE 3 — Objetos legendarios y Búsqueda de Gemas
//
// 6 Gemas de Poder originales (nada de Marvel: nombres y diseño propios).
// Cada gema está en un sitio del mapa y la protege un GUARDIÁN cada vez más
// fuerte. Al derrotarlo consigues la gema y su "don". Con 3 gemas forjas el
// MARTILLO DEL TRUENO; con las 6 tienes el GUANTE DE GEMAS completo y el botón
// de poder (✨) hace la ONDA PRISMA.
//
// `sitio` es una fracción [0..1] del tamaño del mundo, así funciona en mundos
// de cualquier tamaño. Las gemas aparecen de a una, en orden.
// ---------------------------------------------------------------------------

export const GEMAS = [
  {
    id: 'ignea', nombre: 'Gema Ígnea', emoji: '🔴', color: 0xff5a3c,
    don: 'Tus golpes hacen bastante más daño',
    sitio: [0.50, 0.15],
    guard: { nombre: 'Guardián de Brasa', hp: 34, speed: 2.6, size: 1.5, color: 0xc0472a, dano: 8 },
  },
  {
    id: 'brinco', nombre: 'Gema del Brinco', emoji: '🟢', color: 0x76d167,
    don: 'Saltas mucho más alto',
    sitio: [0.15, 0.40],
    guard: { nombre: 'Guardián Saltarín', hp: 55, speed: 3.2, size: 1.5, color: 0x3f9e35, dano: 9, salta: true },
  },
  {
    id: 'veloz', nombre: 'Gema Veloz', emoji: '🔵', color: 0x49b0ff,
    don: 'Corres mucho más rápido',
    sitio: [0.85, 0.40],
    guard: { nombre: 'Guardián Raudo', hp: 80, speed: 6.4, size: 1.4, color: 0x2b7fd0, dano: 11, fast: true },
  },
  {
    id: 'vital', nombre: 'Gema Vital', emoji: '🟣', color: 0xff77dd,
    don: 'Los enemigos casi no te empujan',
    sitio: [0.50, 0.85],
    guard: { nombre: 'Guardián Pétreo', hp: 115, speed: 2.1, size: 2.5, color: 0x9c5fd0, dano: 15 },
  },
  {
    id: 'centella', nombre: 'Gema Centella', emoji: '🟡', color: 0xffd54a,
    don: 'Con el Martillo del Trueno equipado, el botón ✨ lanza un rayo',
    sitio: [0.22, 0.80],
    guard: { nombre: 'Guardián Tormenta', hp: 150, speed: 4.0, size: 2.0, color: 0xe0b020, dano: 16, fast: true },
  },
  {
    id: 'prisma', nombre: 'Gema Prisma', emoji: '⚪', color: 0xdfe6ff,
    don: 'Con el Guante completo, el botón ✨ hace la Onda Prisma',
    sitio: [0.80, 0.20],
    guard: { nombre: 'Guardián Prisma', hp: 210, speed: 3.0, size: 3.2, color: 0xbfc7ff, dano: 20, minions: true },
  },
];

export const MARTILLO_A_LAS = 3; // nº de gemas para forjar el Martillo del Trueno

export function tieneGema(id) { return (state.gemas || []).includes(id); }
export function gemasConseguidas() { return (state.gemas || []).length; }
export function guanteCompleto() { return gemasConseguidas() >= GEMAS.length; }
export function tieneMartillo() { return gemasConseguidas() >= MARTILLO_A_LAS; }
export function proximaGema() { return GEMAS.find((g) => !tieneGema(g.id)) || null; }

// posición real (bloques) de una gema en el mundo actual
export function gemaSitio(g, world) {
  const sx = world.SX ?? 128, sz = world.SZ ?? 128;
  const x = Math.max(6, Math.min(sx - 6, Math.round(g.sitio[0] * sx)));
  const z = Math.max(6, Math.min(sz - 6, Math.round(g.sitio[1] * sz)));
  return [x, z];
}

// dones pasivos que dan las gemas — se aplican DESPUÉS del poder equipado
export function aplicarGemas(player) {
  const g = state.gemas || [];
  player._gemDano = g.includes('ignea') ? 1.6 : 1;
  player._empuje = g.includes('vital') ? 0.3 : 1;
  if (g.includes('brinco')) player.jumpV = Math.max(player.jumpV, 12.5);
  if (g.includes('veloz')) player.sprintMul = Math.max(player.sprintMul, 1.9);
}

// ---------------------------------------------------------------------------

const TRIGGER = 5.5;   // distancia para despertar al guardián
const ESCAPE = 26;     // si te alejas tanto, el guardián se calma
const CATCH = 1.5;

class Guard {
  constructor(world, def, at) {
    this.world = world;
    this.def = def;
    const y = world.surfaceY(at[0], at[1]);
    this.pos = new THREE.Vector3(at[0] + 0.5, y + 0.5, at[1] + 0.5);
    this.home = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.radius = 0.35 * def.size;
    this.height = 1.6 * def.size;
    this.hp = def.hp;
    this.hpMax = def.hp;
    this.hurt = 0;
    this.face = 0;
    this.catchCd = 0;
    this.minionCd = 5;
  }

  daño(n) { this.hp = Math.max(0, this.hp - n); this.hurt = 0.18; }

  update(dt, player, quest) {
    const d = this.def;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    this.catchCd = Math.max(0, this.catchCd - dt);
    this.hurt = Math.max(0, this.hurt - dt);

    const mx = dx / dist, mz = dz / dist;
    this.face = Math.atan2(mx, mz);
    this.vel.x = mx * d.speed;
    this.vel.z = mz * d.speed;
    this.vel.y -= 22 * dt;

    const blocked = isSolid(this.world.get(
      Math.floor(this.pos.x + Math.sign(mx) * 0.6),
      Math.floor(this.pos.y),
      Math.floor(this.pos.z + Math.sign(mz) * 0.6)));
    this._move('x', this.vel.x * dt);
    this._move('z', this.vel.z * dt);
    this._move('y', this.vel.y * dt);
    if (blocked && this.onGround) this.vel.y = d.salta ? 9.5 : 7;

    if (dist < CATCH + d.size * 0.5 && this.catchCd === 0) {
      this.catchCd = 1.5;
      const k = player._empuje ?? 1;
      player.pos.x -= mx * 5 * k;
      player.pos.z -= mz * 5 * k;
      player.vel.y = 8 * k;
      player.onDañar?.(d.dano || 8, d.nombre);
    }

    if (d.minions) {
      this.minionCd -= dt;
      if (this.minionCd <= 0) { this.minionCd = 7; quest.onMinion?.(this.pos); }
    }
    if (this.pos.y < -8) { this.pos.copy(this.home); this.vel.set(0, 0, 0); }
  }

  _move(axis, amount) {
    if (!amount) return;
    this.pos[axis] += amount;
    const p = this.pos, r = this.radius;
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + this.height); y++)
      for (let z = Math.floor(p.z - r); z <= Math.floor(p.z + r); z++)
        for (let x = Math.floor(p.x - r); x <= Math.floor(p.x + r); x++) {
          if (!isSolid(this.world.get(x, y, z))) continue;
          if (axis === 'y') {
            if (amount > 0) { p.y = y - this.height - 0.001; this.vel.y = 0; }
            else { p.y = y + 1.001; this.vel.y = 0; this.onGround = true; }
          } else if (axis === 'x') { p.x = amount > 0 ? x - r - 0.001 : x + 1 + r + 0.001; this.vel.x = 0; }
          else { p.z = amount > 0 ? z - r - 0.001 : z + 1 + r + 0.001; this.vel.z = 0; }
          return;
        }
    if (axis === 'y' && amount > 0) this.onGround = false;
  }
}

function makeShrine(g) {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.0, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x2b2f3a })
  );
  base.position.y = 0.5;
  const col = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 14, 0.7),
    new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.28 })
  );
  col.position.y = 7;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshBasicMaterial({ color: g.color })
  );
  gem.position.y = 2.0;
  grp.add(base, col, gem);
  grp.userData = { gem };
  return grp;
}

function makeGuardMesh(g) {
  const s = g.guard.size;
  const grp = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: g.guard.color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 1.3 * s, 0.8 * s), mat);
  body.position.y = 1.0 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.7 * s, 0.7 * s), mat.clone());
  head.position.y = 2.0 * s;
  const eyeMat = new THREE.MeshBasicMaterial({ color: g.color });
  const eL = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.18 * s, 0.08), eyeMat);
  const eR = eL.clone();
  eL.position.set(-0.2 * s, 2.05 * s, 0.36 * s);
  eR.position.set(0.2 * s, 2.05 * s, 0.36 * s);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * s), new THREE.MeshBasicMaterial({ color: g.color }));
  gem.position.y = 2.9 * s;
  grp.add(body, head, eL, eR, gem);
  grp.userData = { mats: [body.material, head.material], gem };
  return grp;
}

export class GemQuest {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.shrine = null;   // { id, mesh, at }
    this.active = null;   // { def, gemId, entity, mesh, at }
    this.onHud = null;
    this.onMinion = null;
    this.onCollect = null;
  }

  refreshShrines() {
    if (this.shrine) { this.scene.remove(this.shrine.mesh); this.shrine = null; }
    if (this.active) return;
    const g = proximaGema();
    if (!g) return;
    const at = gemaSitio(g, this.world);
    const y = this.world.surfaceY(at[0], at[1]);
    const mesh = makeShrine(g);
    mesh.position.set(at[0] + 0.5, y, at[1] + 0.5);
    this.scene.add(mesh);
    this.shrine = { id: g.id, mesh, at };
  }

  clear() {
    if (this.shrine) { this.scene.remove(this.shrine.mesh); this.shrine = null; }
    if (this.active) { this.scene.remove(this.active.mesh); this.active = null; }
  }

  update(dt, player) {
    const t = performance.now() / 1000;
    if (this.shrine) {
      this.shrine.mesh.userData.gem.rotation.y += dt * 1.6;
      this.shrine.mesh.userData.gem.position.y = 2.0 + Math.sin(t * 2) * 0.2;
      if (!this.active) {
        const dist = Math.hypot(
          player.pos.x - (this.shrine.at[0] + 0.5),
          player.pos.z - (this.shrine.at[1] + 0.5));
        if (dist < TRIGGER) this._start();
      }
    }
    if (!this.active) return;

    const a = this.active;
    a.entity.update(dt, player, this);
    a.mesh.position.set(a.entity.pos.x, a.entity.pos.y, a.entity.pos.z);
    a.mesh.rotation.y = a.entity.face;
    a.mesh.userData.gem.rotation.y += dt * 2;
    const flash = a.entity.hurt > 0;
    a.mesh.userData.mats.forEach((m) => m.emissive?.setHex(flash ? 0xaa0000 : 0x000000));

    if (a.entity.hp <= 0) { this._win(); return; }
    const dHome = Math.hypot(player.pos.x - a.entity.home.x, player.pos.z - a.entity.home.z);
    if (dHome > ESCAPE) { this._flee(); return; }
    this.onHud?.();
  }

  _start() {
    const g = GEMAS.find((x) => x.id === this.shrine.id);
    const entity = new Guard(this.world, g.guard, this.shrine.at);
    const mesh = makeGuardMesh(g);
    this.scene.add(mesh);
    this.scene.remove(this.shrine.mesh);
    this.active = { def: g, gemId: g.id, entity, mesh, at: this.shrine.at };
    this.shrine = null;
    audio.sfx('jefe');
    toast(`🛡️ ${g.guard.nombre} protege la ${g.nombre}. ¡Derrótalo!`);
    this.onHud?.();
  }

  _win() {
    const g = this.active.def;
    this.scene.remove(this.active.mesh);
    this.active = null;
    state.gemas = state.gemas || [];
    if (!state.gemas.includes(g.id)) state.gemas.push(g.id);
    state.stats = state.stats || {};
    state.stats.gemas = (state.stats.gemas || 0) + 1;
    save();
    audio.sfx('medalla');
    toast(`💎 ¡Conseguiste la ${g.nombre}! ${g.don}.`);

    if (state.gemas.length >= MARTILLO_A_LAS && !state.herramientas.includes('martillo_trueno')) {
      state.herramientas.push('martillo_trueno');
      state.herramienta = 'martillo_trueno';
      save();
      setTimeout(() => toast('⚡ ¡Forjaste el MARTILLO DEL TRUENO! Rompe 3×3 y pega durísimo.'), 2400);
    }
    if (state.gemas.length >= GEMAS.length) {
      setTimeout(() => toast('✊ ¡GUANTE DE GEMAS COMPLETO! El botón ✨ ahora hace la Onda Prisma.'), 2600);
    }

    this.onCollect?.(g.id);
    this.refreshShrines();
    this.onHud?.();
  }

  _flee() {
    this.scene.remove(this.active.mesh);
    this.active = null;
    toast('El guardián volvió a su sitio. Acércate para reintentar.');
    this.refreshShrines();
    this.onHud?.();
  }

  // golpe del jugador (misma mira que mobs/jefes). El Martillo del Trueno = 2×.
  golpear(camera, reach, dañoBase) {
    if (!this.active) return false;
    const a = this.active;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const o = camera.position;
    const to = new THREE.Vector3(
      a.entity.pos.x - o.x,
      a.entity.pos.y + a.entity.height * 0.5 - o.y,
      a.entity.pos.z - o.z);
    const d = to.length();
    if (d > reach + a.def.guard.size) return false;
    if (to.normalize().dot(dir) < 0.9) return false;
    a.entity.daño(dañoBase * (state.herramienta === 'martillo_trueno' ? 2 : 1));
    this.onHud?.();
    return true;
  }

  dañoEnCono(origin, dir, range, dañoBase) {
    if (!this.active) return 0;
    const a = this.active;
    const to = new THREE.Vector3(
      a.entity.pos.x - origin.x, a.entity.pos.y - origin.y, a.entity.pos.z - origin.z);
    if (to.length() > range * 1.5) return 0;
    if (to.normalize().dot(dir) < 0.5) return 0;
    a.entity.daño(dañoBase * (state.herramienta === 'martillo_trueno' ? 2 : 1));
    this.onHud?.();
    return 1;
  }

  dañoEnRadio(pos, radio, dañoBase) {
    if (!this.active) return 0;
    const a = this.active;
    const d = Math.hypot(
      a.entity.pos.x - pos.x, a.entity.pos.y - pos.y, a.entity.pos.z - pos.z);
    if (d > radio + a.def.guard.size) return 0;
    a.entity.daño(dañoBase);
    this.onHud?.();
    return 1;
  }

  estado() {
    if (!this.active) return null;
    return {
      nombre: this.active.def.guard.nombre,
      hp: this.active.entity.hp,
      hpMax: this.active.entity.hpMax,
    };
  }
}
