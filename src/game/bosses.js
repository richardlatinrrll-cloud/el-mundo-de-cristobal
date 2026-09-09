import * as THREE from 'three';
import { isSolid, BLOCKS } from '../engine/blocks.js';
import { SX, SZ } from '../engine/world.js';
import { state, save } from './state.js';
import { audio } from './audio.js';
import { powerById, cumpleRequisito } from './powers/registry.js';
import { toast } from '../ui/toast.js';

// Zonas con jefes. Aparecen (una torre-baliza de color en el mapa) cuando
// desbloqueas el poder asociado. Al acercarte empieza la pelea.
//
// PARTE 5: los 4 jefes tienen formas propias (trol, dragón, titán, elfo
// oscuro), mucha más vida y ATAQUES (proyectiles, embestidas, ondas,
// invocar). El poder de su zona hace 3× de daño (conviene equiparlo).

export const BOSSES = [
  {
    id: 'golem', nombre: 'Trol de las Rocas', power: 'fuerza', forma: 'trol',
    hp: 130, speed: 2.3, size: 2.6, color: 0x6f7d5a, eye: 0xffd166, corner: [0, 0],
    dano: 16, ataques: ['roca', 'pisoton'],
  },
  {
    id: 'rayo', nombre: 'Dragón Tormenta', power: 'velocidad', forma: 'dragon',
    hp: 95, speed: 6.4, size: 2.2, color: 0x33507e, eye: 0x9fe8ff, corner: [1, 0], float: true,
    dano: 13, ataques: ['aliento', 'embestida'],
  },
  {
    id: 'ojo', nombre: 'Titán Ardiente', power: 'laser', forma: 'titan',
    hp: 155, speed: 2.4, size: 3.0, color: 0xb0442e, eye: 0xffe08a, corner: [0, 1],
    dano: 22, ataques: ['onda', 'pisoton', 'roca'],
  },
  {
    id: 'coloso', nombre: 'Elfo Oscuro', power: 'volar', forma: 'elfo',
    hp: 210, speed: 3.5, size: 2.3, color: 0x3a2f52, eye: 0xc07bff, corner: [1, 1], minions: true,
    dano: 18, ataques: ['sombra', 'invocar', 'parpadeo'],
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

    // golpe cuerpo a cuerpo
    if (dist < CATCH + d.size * 0.5 && this.catchCd === 0) {
      this.catchCd = 1.6;
      const k = player._empuje ?? 1;
      player.pos.x -= mx * 6 * k;
      player.pos.z -= mz * 6 * k;
      player.vel.y = 9 * k;
      player.onDañar?.(d.dano, d.nombre);
      this.dashT = 0;
    }

    // elegir un ataque
    if (this.atkCd === 0 && dist < 26 && d.ataques?.length) {
      this.atkCd = 2.4 + Math.random() * 2.4;
      const a = d.ataques[(Math.random() * d.ataques.length) | 0];
      this._atacar(a, player, arena, mx, mz, dd);
    }

    // el Elfo Oscuro invoca ayudantes
    if (d.minions) {
      this.minionCd -= dt;
      if (this.minionCd <= 0) { this.minionCd = 8; arena.pedirMinion?.(this.pos); }
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

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
}

function makeBossMesh(def) {
  const s = def.size;
  const g = new THREE.Group();
  const c = def.color;
  const mats = [];
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); mats.push(m.material); return m; };
  const eyeMat = new THREE.MeshBasicMaterial({ color: def.eye });
  const eye = (x, y, z, sz = 0.16) => { const e = new THREE.Mesh(new THREE.BoxGeometry(sz * s, sz * s, 0.06), eyeMat); e.position.set(x, y, z); g.add(e); };

  if (def.forma === 'trol') {
    add(box(1.5 * s, 1.5 * s, 1.0 * s, c), 0, 1.1 * s, 0);         // torso
    add(box(0.7 * s, 0.6 * s, 0.65 * s, c), 0, 2.1 * s, 0.05 * s); // cabeza pequeña
    add(box(0.4 * s, 1.7 * s, 0.4 * s, c), -1.0 * s, 1.0 * s, 0);  // brazos largos
    add(box(0.4 * s, 1.7 * s, 0.4 * s, c), 1.0 * s, 1.0 * s, 0);
    add(box(0.2 * s, 0.3 * s, 0.2 * s, 0xf2ead6), -0.2 * s, 1.95 * s, 0.4 * s); // colmillos
    add(box(0.2 * s, 0.3 * s, 0.2 * s, 0xf2ead6), 0.2 * s, 1.95 * s, 0.4 * s);
    eye(-0.16 * s, 2.2 * s, 0.36 * s); eye(0.16 * s, 2.2 * s, 0.36 * s);
  } else if (def.forma === 'dragon') {
    add(box(1.1 * s, 0.9 * s, 1.6 * s, c), 0, 1.0 * s, 0);          // cuerpo
    add(box(0.35 * s, 0.35 * s, 1.2 * s, c), 0, 1.4 * s, 1.0 * s);  // cuello
    add(box(0.55 * s, 0.5 * s, 0.7 * s, c), 0, 1.6 * s, 1.8 * s);   // cabeza
    add(box(0.25 * s, 0.2 * s, 1.4 * s, c), 0, 0.9 * s, -1.3 * s);  // cola
    const wL = add(box(1.5 * s, 0.08 * s, 0.9 * s, 0x27406b), -1.0 * s, 1.3 * s, 0);
    const wR = add(box(1.5 * s, 0.08 * s, 0.9 * s, 0x27406b), 1.0 * s, 1.3 * s, 0);
    g.userData.alas = [wL, wR];
    eye(-0.16 * s, 1.7 * s, 2.05 * s); eye(0.16 * s, 1.7 * s, 2.05 * s);
  } else if (def.forma === 'titan') {
    add(box(1.7 * s, 1.9 * s, 1.1 * s, c), 0, 1.4 * s, 0);          // torso enorme
    add(box(0.85 * s, 0.8 * s, 0.8 * s, c), 0, 2.7 * s, 0);        // cabeza
    add(box(0.55 * s, 1.6 * s, 0.55 * s, c), -1.2 * s, 1.4 * s, 0); // brazos
    add(box(0.55 * s, 1.6 * s, 0.55 * s, c), 1.2 * s, 1.4 * s, 0);
    add(box(0.9 * s, 0.7 * s, 0.9 * s, 0xff8a3d), -1.2 * s, 0.5 * s, 0); // puños ardientes
    add(box(0.9 * s, 0.7 * s, 0.9 * s, 0xff8a3d), 1.2 * s, 0.5 * s, 0);
    eye(-0.2 * s, 2.8 * s, 0.42 * s, 0.22); eye(0.2 * s, 2.8 * s, 0.42 * s, 0.22);
  } else { // elfo oscuro
    add(box(0.6 * s, 1.3 * s, 0.5 * s, c), 0, 1.0 * s, 0);          // cuerpo esbelto
    add(box(0.45 * s, 0.5 * s, 0.45 * s, c), 0, 1.9 * s, 0);       // cabeza
    add(box(0.95 * s, 1.5 * s, 0.3 * s, 0x241d38), 0, 1.1 * s, -0.25 * s); // capa
    add(box(0.6 * s, 0.5 * s, 0.6 * s, 0x241d38), 0, 2.15 * s, -0.05 * s);  // capucha
    const staff = add(box(0.1 * s, 2.2 * s, 0.1 * s, 0x5a4a2f), 0.5 * s, 1.3 * s, 0.1 * s);
    add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * s), new THREE.MeshBasicMaterial({ color: def.eye })), 0.5 * s, 2.5 * s, 0.1 * s);
    eye(-0.1 * s, 1.95 * s, 0.24 * s, 0.1); eye(0.1 * s, 1.95 * s, 0.24 * s, 0.1);
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
    this.scene.remove(this.active.mesh);
    this.active = null;
    for (const p of this.proyectiles) this.scene.remove(p.mesh);
    this.proyectiles = [];
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
    for (const p of this.proyectiles) this.scene.remove(p.mesh);
    this.proyectiles = [];
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
