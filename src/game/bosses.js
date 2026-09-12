import * as THREE from 'three';
import { isSolid, BLOCKS } from '../engine/blocks.js';
import { SX, SZ } from '../engine/world.js';
import { state, save } from './state.js';
import { audio } from './audio.js';
import { powerById, cumpleRequisito } from './powers/registry.js';
import { toast } from '../ui/toast.js';
import { ARMADURA_JEFE, JEFE_ARMADURA } from './recetas.js';
import { capturarEspecimen } from './powers/ovnitrix.js';

// Zonas con jefes. Aparecen (una torre-baliza de color en el mapa) cuando
// desbloqueas el poder asociado. Al acercarte empieza la pelea.
//
// PARTE 5: los 4 jefes tienen formas propias (trol, dragón, titán, elfo
// oscuro), mucha más vida y ATAQUES (proyectiles, embestidas, ondas,
// invocar). El poder de su zona hace 3× de daño (conviene equiparlo).

export const BOSSES = [
  {
    id: 'golem', nombre: 'Trol de las Rocas', power: 'fuerza', forma: 'trol',
    hp: 320, speed: 2.7, size: 2.6, color: 0x6f7d5a, eye: 0xffd166, corner: [0, 0],
    dano: 26, ataques: ['roca', 'pisoton'],
  },
  {
    id: 'rayo', nombre: 'Dragón Tormenta', power: 'velocidad', forma: 'dragon',
    hp: 240, speed: 7.2, size: 2.2, color: 0x33507e, eye: 0x9fe8ff, corner: [1, 0], float: true,
    dano: 22, ataques: ['aliento', 'embestida'],
  },
  {
    id: 'ojo', nombre: 'Titán Ardiente', power: 'laser', forma: 'titan',
    hp: 380, speed: 2.8, size: 3.0, color: 0xb0442e, eye: 0xff3020, corner: [0, 1],
    dano: 34, ataques: ['laser', 'onda', 'pisoton', 'roca'],
  },
  {
    id: 'coloso', nombre: 'Elfo Oscuro', power: 'volar', forma: 'elfo',
    hp: 520, speed: 4.0, size: 2.3, color: 0x3a2f52, eye: 0xc07bff, corner: [1, 1], minions: true,
    dano: 30, ataques: ['sombra', 'invocar', 'parpadeo', 'onda'],
  },
];

export function bossAt(b) {
  return [b.corner[0] ? SX - 15 : 15, b.corner[1] ? SZ - 15 : 15];
}

const TRIGGER = 5.5;   // distancia para iniciar la pelea
const ESCAPE = 30;     // si te alejas tanto, el jefe se calma
const CATCH = 1.6;

export function jefeDisponible(b) {
  if (state.maestro) return true;
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
    this.minionCd = 5;
    this.atkCd = 2.5;
    this.dashT = 0;
    this.dashDir = new THREE.Vector3();
  }

  daño(n) { this.hp = Math.max(0, this.hp - n); this.hurt = 0.18; }

  update(dt, player, arena) {
    const d = this.def;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.catchCd = Math.max(0, this.catchCd - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    const dd = dist || 1;

    // persigue al jugador (o embiste)
    let mx = dx / dd, mz = dz / dd;
    if (this.dashT > 0) { mx = this.dashDir.x; mz = this.dashDir.z; }
    this.face = Math.atan2(mx, mz);
    const spd = this.dashT > 0 ? d.speed * 3.2 : d.speed;
    this.vel.x = mx * spd;
    this.vel.z = mz * spd;

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

    // golpe cuerpo a cuerpo (solo si estás a su altura, no si pasas por encima,
    // y no si hay un muro en medio → un refugio protege)
    const dyOk = Math.abs(player.pos.y - this.pos.y) < this.height * 0.7 + 1;
    const muro = dist > 1.6 && this._muroEntre(player);
    if (dist < CATCH + d.size * 0.5 && dyOk && !muro && this.catchCd === 0) {
      this.catchCd = 1.2;
      const k = player._empuje ?? 1;
      player.pos.x -= mx * 6 * k;
      player.pos.z -= mz * 6 * k;
      player.vel.y = 9 * k;
      player.onDañar?.(d.dano, d.nombre);
      this.dashT = 0;
    }

    // elegir un ataque
    if (this.atkCd === 0 && dist < 26 && d.ataques?.length) {
      this.atkCd = 1.3 + Math.random() * 1.6;
      const a = d.ataques[(Math.random() * d.ataques.length) | 0];
      this._atacar(a, player, arena, mx, mz, dd);
    }

    // el Elfo Oscuro invoca ayudantes
    if (d.minions) {
      this.minionCd -= dt;
      if (this.minionCd <= 0) { this.minionCd = 5.5; arena.pedirMinion?.(this.pos); arena.pedirMinion?.(this.pos); }
    }
  }

  _atacar(tipo, player, arena, mx, mz, dd) {
    const p = this.pos;
    if (tipo === 'roca' || tipo === 'aliento' || tipo === 'sombra') {
      const col = tipo === 'roca' ? 0x8a8f98 : tipo === 'aliento' ? 0x9fe8ff : 0x9b5fd0;
      const from = new THREE.Vector3(p.x, p.y + this.height * 0.6, p.z);
      const to = new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z);
      const dir = to.sub(from).normalize();
      arena.lanzarProyectil(from, dir, { vel: tipo === 'aliento' ? 20 : 15, dano: Math.round(this.def.dano * 0.7), color: col });
      if (tipo === 'aliento') { // aliento = ráfaga de 3
        arena.lanzarProyectil(from, dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.18), { vel: 20, dano: 8, color: col });
        arena.lanzarProyectil(from, dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.18), { vel: 20, dano: 8, color: col });
      }
      audio.sfx('jefe');
    } else if (tipo === 'embestida') {
      this.dashDir.set(mx, 0, mz);
      this.dashT = 0.55;
      audio.sfx('golpe');
      toast(`💨 ¡${this.def.nombre} embiste!`, 900);
    } else if (tipo === 'laser') {
      const from = new THREE.Vector3(p.x, p.y + this.height * 0.92, p.z);
      const to = new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z);
      arena.lanzarRayo(from, to, Math.round(this.def.dano * 0.9), player);
      audio.sfx('jefe');
    } else if (tipo === 'onda' || tipo === 'pisoton') {
      arena.ondaEnSuelo(this.pos.clone(), tipo === 'onda' ? 8 : 5.5, Math.round(this.def.dano * 0.8), player);
      audio.sfx('sonico');
    } else if (tipo === 'invocar') {
      arena.pedirMinion?.(this.pos);
      arena.pedirMinion?.(this.pos);
      toast(`🌑 ${this.def.nombre} invoca sombras…`, 1000);
    } else if (tipo === 'parpadeo') {
      const ang = Math.random() * Math.PI * 2;
      this.pos.x = player.pos.x + Math.cos(ang) * 3.5;
      this.pos.z = player.pos.z + Math.sin(ang) * 3.5;
      audio.sfx('menu');
    }
  }

  _muroEntre(player) {
    const ox = this.pos.x, oz = this.pos.z, oy = player.pos.y + 0.9;
    const dx = player.pos.x - ox, dz = player.pos.z - oz;
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      if (isSolid(this.world.get(Math.floor(ox + dx * f), Math.floor(oy), Math.floor(oz + dz * f)))) return true;
    }
    return false;
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

function shade(hex, f) {
  const r = Math.max(0, Math.min(255, ((hex >> 16 & 255) * f) | 0));
  const gr = Math.max(0, Math.min(255, ((hex >> 8 & 255) * f) | 0));
  const b = Math.max(0, Math.min(255, ((hex & 255) * f) | 0));
  return (r << 16) | (gr << 8) | b;
}

function makeBossMesh(def) {
  const s = def.size;
  const g = new THREE.Group();
  const c = def.color;
  const cD = shade(c, 0.72), cL = shade(c, 1.22);
  const mats = [];
  const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  const add = (w, h, d, color, x, y, z, rot) => {
    const m = box(w * s, h * s, d * s, color);
    m.position.set(x * s, y * s, z * s);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    g.add(m); mats.push(m.material); return m;
  };
  const eyeMat = new THREE.MeshBasicMaterial({ color: def.eye });
  const eye = (x, y, z, sz = 0.16) => { const e = new THREE.Mesh(new THREE.BoxGeometry(sz * s, sz * s, 0.06), eyeMat); e.position.set(x * s, y * s, z * s); g.add(e); };
  const pincho = (color, x, y, z, len, rot) => add(0.12, len, 0.12, color, x, y, z, rot);

  if (def.forma === 'trol') {
    add(1.5, 1.5, 1.0, c, 0, 1.1, 0);                 // torso
    add(1.6, 0.5, 1.05, cD, 0, 0.6, 0);               // vientre
    add(1.5, 0.4, 1.06, cL, 0, 1.75, 0);              // pectoral
    add(0.7, 0.6, 0.65, cL, 0, 2.15, 0.05);           // cabeza
    add(0.75, 0.25, 0.4, cD, 0, 1.9, 0.25);           // mandíbula
    add(0.42, 1.7, 0.42, c, -1.02, 1.0, 0);           // brazos
    add(0.42, 1.7, 0.42, c, 1.02, 1.0, 0);
    add(0.5, 0.5, 0.5, cD, -1.02, 0.2, 0);            // puños
    add(0.5, 0.5, 0.5, cD, 1.02, 0.2, 0);
    add(0.55, 1.0, 0.55, cD, -0.4, 0.45, 0);          // piernas
    add(0.55, 1.0, 0.55, cD, 0.4, 0.45, 0);
    for (let i = -1; i <= 1; i++) pincho(0x6b5a44, i * 0.4, 2.05, -0.4, 0.5, [-0.3, 0, 0]); // crin de púas
    add(0.22, 0.34, 0.22, 0xf2ead6, -0.22, 1.86, 0.42); // colmillos
    add(0.22, 0.34, 0.22, 0xf2ead6, 0.22, 1.86, 0.42);
    eye(-0.16, 2.24, 0.36); eye(0.16, 2.24, 0.36);
  } else if (def.forma === 'dragon') {
    add(1.1, 0.95, 1.7, c, 0, 1.0, 0);                // cuerpo
    add(0.9, 0.5, 1.5, cL, 0, 0.6, 0.05);             // vientre claro (escamas)
    add(0.38, 0.4, 1.3, c, 0, 1.35, 1.05);            // cuello
    add(0.34, 0.34, 1.2, c, 0, 1.75, 1.35, [0.5, 0, 0]);
    add(0.58, 0.5, 0.72, cL, 0, 1.9, 2.05);           // cabeza
    add(0.5, 0.2, 0.4, cD, 0, 1.72, 2.35);            // hocico
    pincho(cD, 0, 2.25, 1.9, 0.4, [0.3, 0, 0]);       // cuernos
    pincho(cD, -0.18, 2.2, 1.85, 0.35, [0.4, 0, -0.2]);
    pincho(cD, 0.18, 2.2, 1.85, 0.35, [0.4, 0, 0.2]);
    for (let i = 0; i < 4; i++) pincho(cD, 0, 1.55 - i * 0.05, 0.7 - i * 0.55, 0.3, [0.2, 0, 0]); // cresta
    add(0.26, 0.24, 1.6, c, 0, 0.85, -1.4);           // cola
    add(0.14, 0.14, 0.5, cD, 0, 0.85, -2.3, [0.3, 0, 0]); // punta de cola
    const wL = add(1.6, 0.07, 1.0, 0x27406b, -1.05, 1.35, -0.1);
    const wR = add(1.6, 0.07, 1.0, 0x27406b, 1.05, 1.35, -0.1);
    add(0.35, 1.0, 0.35, cD, -0.55, 0.5, 0.3);        // patas
    add(0.35, 1.0, 0.35, cD, 0.55, 0.5, 0.3);
    g.userData.alas = [wL, wR];
    eye(-0.17, 2.0, 2.32, 0.13); eye(0.17, 2.0, 2.32, 0.13);
  } else if (def.forma === 'titan') {
    add(1.7, 1.9, 1.1, c, 0, 1.4, 0);                 // torso
    add(1.75, 0.6, 1.14, 0xff8a3d, 0, 1.0, 0);        // grieta ardiente
    add(1.4, 0.35, 1.13, shade(0xff8a3d, 1.3), 0, 1.75, 0);
    add(0.85, 0.85, 0.8, cL, 0, 2.75, 0);             // cabeza
    add(0.9, 0.25, 0.5, cD, 0, 2.45, 0.2);            // ceño
    add(0.58, 1.65, 0.58, c, -1.22, 1.45, 0);         // brazos
    add(0.58, 1.65, 0.58, c, 1.22, 1.45, 0);
    add(0.95, 0.8, 0.95, 0xff8a3d, -1.22, 0.5, 0);    // puños ardientes
    add(0.95, 0.8, 0.95, 0xff8a3d, 1.22, 0.5, 0);
    add(0.7, 1.1, 0.75, cD, -0.5, 0.5, 0);            // piernas
    add(0.7, 1.1, 0.75, cD, 0.5, 0.5, 0);
    for (let i = -1; i <= 1; i++) pincho(cD, i * 0.55, 3.15, -0.1, 0.55, [-0.15, 0, i * 0.15]); // corona de rocas
    eye(-0.2, 2.85, 0.42, 0.24); eye(0.2, 2.85, 0.42, 0.24);
  } else { // elfo oscuro
    add(0.6, 1.35, 0.5, c, 0, 1.0, 0);                // cuerpo
    add(0.66, 0.4, 0.54, shade(0x8a5fd0, 0.9), 0, 1.55, 0); // peto
    add(0.46, 0.52, 0.46, cL, 0, 1.95, 0);            // cabeza
    add(1.0, 1.6, 0.28, 0x201a30, 0, 1.15, -0.28);    // capa
    add(1.15, 0.5, 0.3, 0x201a30, 0, 0.5, -0.28, [0, 0, 0]); // vuelo de la capa
    add(0.64, 0.56, 0.62, 0x201a30, 0, 2.18, -0.06);  // capucha
    pincho(0x201a30, -0.28, 2.35, -0.1, 0.45, [0.1, 0, -0.5]); // puntas de capucha
    pincho(0x201a30, 0.28, 2.35, -0.1, 0.45, [0.1, 0, 0.5]);
    add(0.32, 1.15, 0.32, cD, -0.42, 0.9, 0);         // brazos
    add(0.32, 1.15, 0.32, cD, 0.42, 0.9, 0);
    add(0.34, 1.2, 0.34, 0x201a30, -0.22, 0.55, 0);   // piernas
    add(0.34, 1.2, 0.34, 0x201a30, 0.22, 0.55, 0);
    add(0.1, 2.4, 0.1, 0x4a3a5a, 0.55, 1.4, 0.12);    // bastón
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 * s), new THREE.MeshBasicMaterial({ color: def.eye }));
    orb.position.set(0.55 * s, 2.7 * s, 0.12 * s); g.add(orb);
    eye(-0.1, 1.99, 0.24, 0.1); eye(0.1, 1.99, 0.24, 0.1);
  }

  g.userData.mats = mats;
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
    this.proyectiles = [];      // { mesh, pos, vel, dano, vida }
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
    for (const p of this.proyectiles) this.scene.remove(p.mesh);
    this.proyectiles = [];
    for (const arr of [this._ondas, this._rayos]) if (arr) { for (const m of arr) this.scene.remove(m); arr.length = 0; }
    if (this.active) { this.scene.remove(this.active.mesh); this.active = null; }
  }

  pedirMinion(pos) { this.onMinion?.(pos); }

  lanzarProyectil(from, dir, opts) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: opts.color || 0xffffff })
    );
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.proyectiles.push({ mesh, pos: from.clone(), vel: dir.clone().multiplyScalar(opts.vel || 16), dano: opts.dano || 8, vida: 3 });
  }

  // rayo de los ojos del Titán: línea roja + daño si estás cerca de la línea
  lanzarRayo(from, to, dano, player) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    dir.normalize();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, len, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2418, transparent: true })
    );
    beam.position.copy(from).addScaledVector(dir, len / 2);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    beam.userData = { t: 0, vida: 0.35 };
    this.scene.add(beam);
    this._rayos = this._rayos || [];
    this._rayos.push(beam);
    // ¿el jugador está sobre la línea del rayo?
    const pv = player.pos.clone().add(new THREE.Vector3(0, 1, 0)).sub(from);
    const proj = pv.dot(dir);
    if (proj > 0 && proj < len + 1.5) {
      const perp = pv.clone().addScaledVector(dir, -proj).length();
      if (perp < 1.4) {
        const k = player._empuje ?? 1;
        player.pos.addScaledVector(dir, 3 * k); player.vel.y = 4 * k;
        player.onDañar?.(dano, 'rayo');
      }
    }
  }

  ondaEnSuelo(pos, radio, dano, player) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.3, 8, 22),
      new THREE.MeshBasicMaterial({ color: 0xffcf6a, transparent: true })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.4, pos.z);
    ring.userData = { t: 0, radio };
    this.scene.add(ring);
    this._ondas = this._ondas || [];
    this._ondas.push(ring);
    const d = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
    if (d < radio) {
      const k = player._empuje ?? 1;
      const nx = (player.pos.x - pos.x) / (d || 1), nz = (player.pos.z - pos.z) / (d || 1);
      player.pos.x += nx * 4 * k; player.pos.z += nz * 4 * k; player.vel.y = 8 * k;
      player.onDañar?.(dano, 'onda');
    }
  }

  _updateProyectiles(dt, player) {
    for (let i = this.proyectiles.length - 1; i >= 0; i--) {
      const p = this.proyectiles[i];
      p.vida -= dt;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 6 * dt;
      p.mesh.position.copy(p.pos);
      const hitPlayer = Math.hypot(p.pos.x - player.pos.x, p.pos.y - (player.pos.y + 1), p.pos.z - player.pos.z) < 1.1;
      const bid = this.world.get(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(p.pos.z));
      const hitBlock = bid && isSolid(bid);
      if (hitPlayer) player.onDañar?.(p.dano, 'proyectil');
      if (hitPlayer || hitBlock || p.vida <= 0) { this.scene.remove(p.mesh); this.proyectiles.splice(i, 1); }
    }
    if (this._ondas) {
      for (let i = this._ondas.length - 1; i >= 0; i--) {
        const r = this._ondas[i]; r.userData.t += dt;
        const k = r.userData.t / 0.5;
        if (k >= 1) { this.scene.remove(r); this._ondas.splice(i, 1); continue; }
        r.scale.setScalar(1 + k * r.userData.radio); r.material.opacity = 0.8 * (1 - k);
      }
    }
    if (this._rayos) {
      for (let i = this._rayos.length - 1; i >= 0; i--) {
        const b = this._rayos[i]; b.userData.t += dt;
        const k = b.userData.t / b.userData.vida;
        if (k >= 1) { this.scene.remove(b); this._rayos.splice(i, 1); continue; }
        b.material.opacity = 1 - k;
      }
    }
  }

  update(dt, player) {
    const t = performance.now() / 1000;
    for (const m of this.beacons.values()) {
      m.userData.orb.rotation.y += dt * 1.5;
      m.userData.orb.position.y = 2.2 + Math.sin(t * 2) * 0.25;
    }
    this._updateProyectiles(dt, player);

    if (!this.active) {
      for (const b of BOSSES) {
        if (!jefeDisponible(b) || jefeDerrotado(b)) continue;
        const at = bossAt(b);
        const dist = Math.hypot(player.pos.x - (at[0] + 0.5), player.pos.z - (at[1] + 0.5));
        if (dist < TRIGGER) { this._start(b); break; }
      }
      return;
    }

    const a = this.active;
    a.entity.update(dt, player, this);
    if (!this.active) return;   // el jugador se desmayó (clear() durante el update)
    a.mesh.position.set(a.entity.pos.x, a.entity.pos.y, a.entity.pos.z);
    a.mesh.rotation.y = a.entity.face;
    if (a.mesh.userData.alas) {
      const f = Math.sin(t * 6) * 0.6;
      a.mesh.userData.alas[0].rotation.z = f; a.mesh.userData.alas[1].rotation.z = -f;
    }
    const flash = a.entity.hurt > 0;
    a.mesh.userData.mats.forEach((mm) => mm.emissive?.setHex(flash ? 0xaa0000 : 0x000000));

    const dist = Math.hypot(player.pos.x - a.entity.home.x, player.pos.z - a.entity.home.z);
    if (a.entity.hp <= 0) { this._win(); return; }
    if (dist > ESCAPE) { this._flee(); return; }
    this.onHud?.();
  }

  // Sala de pruebas: invocar un jefe justo al lado del jugador
  spawnPrueba(defId, playerPos) {
    const def = BOSSES.find((b) => b.id === defId);
    if (!def || this.active) return;
    const entity = new BossEntity(this.world, def);
    entity.pos.set(playerPos.x + 4, playerPos.y + 1, playerPos.z);
    entity.home.copy(entity.pos);
    const mesh = makeBossMesh(def);
    this.scene.add(mesh);
    this.active = { def, entity, mesh };
    audio.sfx('jefe');
    toast(`🧪 ${def.nombre} invocado`);
    this.onHud?.();
  }

  // OLEADA: aparece un jefe al azar cerca del jugador (si no hay ninguno activo).
  oleadaJefe(player) {
    if (this.active) return;
    const def = BOSSES[(Math.random() * BOSSES.length) | 0];
    const entity = new BossEntity(this.world, def);
    const ang = Math.random() * Math.PI * 2;
    entity.pos.set(player.pos.x + Math.cos(ang) * 14, player.pos.y + 1, player.pos.z + Math.sin(ang) * 14);
    entity.home.copy(entity.pos);
    const mesh = makeBossMesh(def);
    this.scene.add(mesh);
    this.active = { def, entity, mesh, oleada: true };
    audio.sfx('jefe');
    toast(`⚔️ ¡${def.nombre} se sumó a la oleada!`, 3500);
    this.onHud?.();
  }

  // al terminar la oleada, el jefe de la oleada se retira
  calmarOleada() {
    if (this.active && this.active.oleada) this._flee();
  }

  _start(def) {
    const entity = new BossEntity(this.world, def);
    const mesh = makeBossMesh(def);
    this.scene.add(mesh);
    this.active = { def, entity, mesh };
    if (this.beacons.has(def.id)) { this.scene.remove(this.beacons.get(def.id)); this.beacons.delete(def.id); }
    const tienePoder = state.poderEquipado === def.power;
    audio.sfx('jefe');
    toast(`⚔️ ¡${def.nombre} despertó! ${tienePoder ? 'Tienes el poder correcto: 3× daño.' : 'Equipa ' + (powerById(def.power)?.nombre || def.power) + ' para hacer 3× daño.'}`);
    this.onHud?.();
  }

  _win() {
    const def = this.active.def;
    const eraOleada = !!this.active.oleada;
    this.scene.remove(this.active.mesh);
    this.active = null;
    for (const p of this.proyectiles) this.scene.remove(p.mesh);
    this.proyectiles = [];
    // el jefe de una OLEADA no cuenta como "derrotado" (su torre-baliza sigue)
    if (!eraOleada) {
      state.jefesDerrotados = state.jefesDerrotados || [];
      if (!state.jefesDerrotados.includes(def.id)) state.jefesDerrotados.push(def.id);
      capturarEspecimen(def.id);   // Ovnitrix: escanea el ADN del jefe
    }
    state.stats = state.stats || {};
    state.stats.jefes = (state.stats.jefes || 0) + 1;
    // armadura inspirada en el jefe
    const arm = JEFE_ARMADURA[def.id];
    if (arm) {
      state.armadura = state.armadura || [];
      const key = 'jefe_' + arm;
      if (!state.armadura.includes(key)) {
        state.armadura.push(key);
        setTimeout(() => toast(`🛡️ ¡Ganaste la ${ARMADURA_JEFE[arm].nombre}! Menos daño.`), 2400);
      }
    }
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
    for (const p of this.proyectiles) this.scene.remove(p.mesh);
    this.proyectiles = [];
    toast(`${def.nombre} volvió a dormir. Acércate para reintentar.`);
    this.refreshBeacons();
    this.onHud?.();
  }

  // golpe del jugador contra el jefe (mismo criterio de mira que los mobs)
  golpear(camera, reach, dañoBase, empuje = 0) {
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
    if (empuje > 0) {  // los jefes son pesados: empujón chico
      const dx = a.entity.pos.x - o.x, dz = a.entity.pos.z - o.z, dd = Math.hypot(dx, dz) || 1;
      a.entity.pos.x += (dx / dd) * empuje * 0.25;
      a.entity.pos.z += (dz / dd) * empuje * 0.25;
    }
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
