import * as THREE from 'three';
import { isSolid } from '../engine/blocks.js';
import { SX, SZ } from '../engine/world.js';
import { state, save } from './state.js';
import { audio } from './audio.js';
import { powerById, cumpleRequisito } from './powers/registry.js';
import { toast } from '../ui/toast.js';

// Zonas con jefes. Aparecen (una torre-baliza de color en el mapa) cuando
// desbloqueas el poder asociado. Al acercarte empieza la pelea.
// Modelo de daño "mezcla": el jefe tiene mucha vida; el poder de su zona
// hace 3× de daño (conviene equiparlo), pero cualquier golpe sirve.
//
// `corner`: [0|1, 0|1] esquina del mapa. La posición real se calcula con el
// tamaño de mundo actual (que es variable), no al importar el módulo.

export const BOSSES = [
  { id: 'golem',  nombre: 'Gólem de Piedra', power: 'fuerza',    hp: 42, speed: 2.1, size: 2.4, color: 0x8a8f98, eye: 0xffd166, corner: [0, 0] },
  { id: 'rayo',   nombre: 'Rayo',            power: 'velocidad', hp: 30, speed: 6.6, size: 1.5, color: 0xffd166, eye: 0xffffff, corner: [1, 0], fast: true },
  { id: 'ojo',    nombre: 'Ojo Ardiente',    power: 'laser',     hp: 46, speed: 2.6, size: 2.0, color: 0xff4d4d, eye: 0xffe08a, corner: [0, 1], float: true },
  { id: 'coloso', nombre: 'El Coloso',       power: 'volar',     hp: 84, speed: 2.5, size: 3.6, color: 0x7b3ff2, eye: 0x4dd2ff, corner: [1, 1], minions: true },
];

export function bossAt(b) {
  return [b.corner[0] ? SX - 15 : 15, b.corner[1] ? SZ - 15 : 15];
}

const TRIGGER = 5.5;   // distancia para iniciar la pelea
const ESCAPE = 26;     // si te alejas tanto, el jefe se calma
const CATCH = 1.6;

export function jefeDisponible(b) {
  const p = powerById(b.power);
  return p && cumpleRequisito(p, state.medallas);
}
export function jefeDerrotado(b) {
  return (state.jefesDerrotados || []).includes(b.id);
}

class BossEntity {
  constructor(world, def) {
    this.world = world;
    this.def = def;
    const at = bossAt(def);
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
    this.minionCd = 4;
  }

  daño(n) { this.hp = Math.max(0, this.hp - n); this.hurt = 0.18; }

  update(dt, player, arena) {
    const d = this.def;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.catchCd = Math.max(0, this.catchCd - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    const dd = dist || 1;

    // persigue al jugador
    const mx = dx / dd, mz = dz / dd;
    this.face = Math.atan2(mx, mz);
    this.vel.x = mx * d.speed;
    this.vel.z = mz * d.speed;

    if (d.float) {
      const targetY = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z)) + 2.5;
      this.vel.y = (targetY - this.pos.y) * 2;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.pos.y += this.vel.y * dt;
    } else {
      this.vel.y -= 22 * dt;
      const blocked = isSolid(this.world.get(Math.floor(this.pos.x + Math.sign(mx) * 0.6), Math.floor(this.pos.y), Math.floor(this.pos.z + Math.sign(mz) * 0.6)));
      this._move('x', this.vel.x * dt);
      this._move('z', this.vel.z * dt);
      this._move('y', this.vel.y * dt);
      if (blocked && this.onGround) this.vel.y = 8;
    }

    // golpe cuerpo a cuerpo
    if (dist < CATCH + d.size * 0.5 && this.catchCd === 0) {
      this.catchCd = 1.6;
      const k = player._empuje ?? 1;   // Gema Vital reduce el empujón
      player.pos.x -= mx * 6 * k;
      player.pos.z -= mz * 6 * k;
      player.vel.y = 9 * k;
      audio.sfx('dano');
      toast(`💢 ¡${d.nombre} te golpeó fuerte!`);
    }

    // el Coloso invoca ayudantes
    if (d.minions) {
      this.minionCd -= dt;
      if (this.minionCd <= 0) { this.minionCd = 7; arena.pedirMinion?.(this.pos); }
    }
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

function makeBeacon(def) {
  const g = new THREE.Group();
  const col = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 16, 1.4),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.35 })
  );
  col.position.y = 8;
  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: def.eye })
  );
  orb.position.y = 2.2;
  g.add(col, orb);
  g.userData = { orb };
  return g;
}

function makeBossMesh(def) {
  const s = def.size;
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: def.color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 1.3 * s, 0.8 * s), mat);
  body.position.y = 1.0 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.7 * s, 0.7 * s), mat.clone());
  head.position.y = 2.0 * s;
  const eyeMat = new THREE.MeshBasicMaterial({ color: def.eye });
  const eL = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.18 * s, 0.08), eyeMat);
  const eR = eL.clone();
  eL.position.set(-0.2 * s, 2.05 * s, 0.36 * s);
  eR.position.set(0.2 * s, 2.05 * s, 0.36 * s);
  g.add(body, head, eL, eR);
  g.userData = { mats: [body.material, head.material] };
  return g;
}

export class BossArena {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.beacons = new Map();   // id -> mesh
    this.active = null;         // { def, entity, mesh }
    this.onMinion = null;       // callback(pos) -> spawn helper sombra
    this.onHud = null;          // callback() para refrescar barra
  }

  refreshBeacons() {
    for (const b of BOSSES) {
      const show = jefeDisponible(b) && !jefeDerrotado(b) && !(this.active && this.active.def.id === b.id);
      const has = this.beacons.has(b.id);
      if (show && !has) {
        const m = makeBeacon(b);
        const at = bossAt(b);
        const y = this.world.surfaceY(at[0], at[1]);
        m.position.set(at[0] + 0.5, y, at[1] + 0.5);
        this.scene.add(m);
        this.beacons.set(b.id, m);
      } else if (!show && has) {
        this.scene.remove(this.beacons.get(b.id));
        this.beacons.delete(b.id);
      }
    }
  }

  clear() {
    for (const m of this.beacons.values()) this.scene.remove(m);
    this.beacons.clear();
    if (this.active) { this.scene.remove(this.active.mesh); this.active = null; }
  }

  pedirMinion(pos) { this.onMinion?.(pos); }

  update(dt, player) {
    const t = performance.now() / 1000;
    for (const m of this.beacons.values()) {
      m.userData.orb.rotation.y += dt * 1.5;
      m.userData.orb.position.y = 2.2 + Math.sin(t * 2) * 0.25;
    }

    if (!this.active) {
      // ¿entrar a una arena?
      for (const b of BOSSES) {
        if (!jefeDisponible(b) || jefeDerrotado(b)) continue;
        const at = bossAt(b);
        const dist = Math.hypot(player.pos.x - (at[0] + 0.5), player.pos.z - (at[1] + 0.5));
        if (dist < TRIGGER) { this._start(b); break; }
      }
      return;
    }

    // pelea en curso
    const a = this.active;
    a.entity.update(dt, player, this);
    a.mesh.position.set(a.entity.pos.x, a.entity.pos.y, a.entity.pos.z);
    a.mesh.rotation.y = a.entity.face;
    const flash = a.entity.hurt > 0;
    a.mesh.userData.mats.forEach((mm) => mm.emissive?.setHex(flash ? 0xaa0000 : 0x000000));

    const dist = Math.hypot(player.pos.x - a.entity.home.x, player.pos.z - a.entity.home.z);
    if (a.entity.hp <= 0) { this._win(); return; }
    if (dist > ESCAPE) { this._flee(); return; }
    this.onHud?.();
  }

  _start(def) {
    const entity = new BossEntity(this.world, def);
    const mesh = makeBossMesh(def);
    this.scene.add(mesh);
    this.active = { def, entity, mesh };
    if (this.beacons.has(def.id)) { this.scene.remove(this.beacons.get(def.id)); this.beacons.delete(def.id); }
    const tienePoder = state.poderEquipado === def.power;
    audio.sfx('jefe');
    toast(`⚔️ ¡${def.nombre} despertó! ${tienePoder ? 'Tienes el poder correcto equipado.' : 'Equipa ' + (powerById(def.power)?.nombre || def.power) + ' para hacer 3× daño.'}`);
    this.onHud?.();
  }

  _win() {
    const def = this.active.def;
    this.scene.remove(this.active.mesh);
    this.active = null;
    state.jefesDerrotados = state.jefesDerrotados || [];
    if (!state.jefesDerrotados.includes(def.id)) state.jefesDerrotados.push(def.id);
    state.stats = state.stats || {};
    state.stats.jefes = (state.stats.jefes || 0) + 1;
    save();
    audio.sfx('medalla');
    toast(`🏆 ¡Derrotaste a ${def.nombre}!`);
    if (state.jefesDerrotados.length >= BOSSES.length) {
      setTimeout(() => toast('👑 ¡Venciste a todos los jefes! Eres una leyenda.'), 2600);
    }
    this.refreshBeacons();
    this.onHud?.();
  }

  _flee() {
    const def = this.active.def;
    this.scene.remove(this.active.mesh);
    this.active = null;
    toast(`${def.nombre} volvió a dormir. Acércate para reintentar.`);
    this.refreshBeacons();
    this.onHud?.();
  }

  // golpe del jugador contra el jefe (mismo criterio de mira que los mobs)
  golpear(camera, reach, dañoBase) {
    if (!this.active) return false;
    const a = this.active;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const o = camera.position;
    const to = new THREE.Vector3(a.entity.pos.x - o.x, a.entity.pos.y + a.entity.height * 0.5 - o.y, a.entity.pos.z - o.z);
    const d = to.length();
    if (d > reach + a.def.size) return false;
    if (to.normalize().dot(dir) < 0.9) return false;
    const mult = state.poderEquipado === a.def.power ? 3 : 1;
    a.entity.daño(dañoBase * mult);
    this.onHud?.();
    return true;
  }

  dañoEnCono(origin, dir, range, dañoBase) {
    if (!this.active) return 0;
    const a = this.active;
    const to = new THREE.Vector3(a.entity.pos.x - origin.x, a.entity.pos.y - origin.y, a.entity.pos.z - origin.z);
    if (to.length() > range * 1.5) return 0;
    if (to.normalize().dot(dir) < 0.5) return 0;
    const mult = state.poderEquipado === a.def.power ? 3 : 1;
    a.entity.daño(dañoBase * mult);
    this.onHud?.();
    return 1;
  }

  // Onda Prisma: daño en esfera alrededor de un punto
  dañoEnRadio(pos, radio, dañoBase) {
    if (!this.active) return 0;
    const a = this.active;
    const d = Math.hypot(a.entity.pos.x - pos.x, a.entity.pos.y - pos.y, a.entity.pos.z - pos.z);
    if (d > radio + a.def.size) return 0;
    const mult = state.poderEquipado === a.def.power ? 3 : 1;
    a.entity.daño(dañoBase * mult);
    this.onHud?.();
    return 1;
  }

  estado() {
    if (!this.active) return null;
    return { nombre: this.active.def.nombre, hp: this.active.entity.hp, hpMax: this.active.entity.hpMax };
  }
}
