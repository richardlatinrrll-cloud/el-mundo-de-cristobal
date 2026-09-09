import * as THREE from 'three';
import { isSolid } from '../engine/blocks.js';
import { SX, SZ, SY } from '../engine/world.js';

// Animales pacíficos que vagan por el mundo. Algunos huyen del jugador,
// otros lo ignoran, y un par pueden dar un empujón si te acercas demasiado.

// bioma: 1=pasto, 5=cerca de árboles/bosque, 6=arena, 10=agua/orilla
export const ESPECIES = {
  conejo:   { nombre: 'Conejo',   emoji: '🐇', color: 0xe8e2d8, size: 0.5, vel: 3.8, huye: 14, salta: true,  bioma: ['pasto'], hp: 2, botin: { carne: 1, cuero: 1 } },
  ciervo:   { nombre: 'Ciervo',   emoji: '🦌', color: 0x9c6b3f, size: 1.3, vel: 4.4, huye: 16,               bioma: ['pasto', 'bosque'], hp: 4, botin: { carne: 2, cuero: 2 } },
  zorro:    { nombre: 'Zorro',    emoji: '🦊', color: 0xd9702e, size: 0.8, vel: 4.0, huye: 10,               bioma: ['pasto', 'bosque'], hp: 3, botin: { carne: 1, cuero: 1 } },
  oveja:    { nombre: 'Oveja',    emoji: '🐑', color: 0xf1eee6, size: 1.0, vel: 2.2, huye: 7,                bioma: ['pasto'], hp: 3, botin: { carne: 1, lana: 2 } },
  vaca:     { nombre: 'Vaca',     emoji: '🐄', color: 0x4a4038, size: 1.3, vel: 2.0, huye: 6,                bioma: ['pasto'], hp: 5, botin: { carne: 3, cuero: 3 } },
  jabali:   { nombre: 'Jabalí',   emoji: '🐗', color: 0x5a4636, size: 1.1, vel: 3.4, huye: 8,  carga: true,  bioma: ['bosque', 'pasto'], hp: 4, botin: { carne: 2, cuero: 1 } },
  oso:      { nombre: 'Oso',      emoji: '🐻', color: 0x6b4a2f, size: 1.7, vel: 3.0, huye: 0,  carga: true,  bioma: ['bosque'], hp: 7, botin: { carne: 3, cuero: 2 } },
  tortuga:  { nombre: 'Tortuga',  emoji: '🐢', color: 0x3f7d4a, size: 0.7, vel: 0.9, huye: 5,                bioma: ['arena', 'agua'], hp: 3, botin: { carne: 1, cuero: 1 } },
  pajaro:   { nombre: 'Pájaro',   emoji: '🐦', color: 0x3a6bd0, size: 0.4, vel: 5.5, huye: 12, vuela: true,  bioma: ['pasto', 'bosque', 'arena'], hp: 1, botin: { carne: 1, pluma: 2 } },
};

function biomaDe(world, x, z) {
  const y = world.surfaceY(x, z) - 1;
  const b = world.get(x, y, z);
  if (b === 10 || world.get(x, y + 1, z) === 10) return 'agua';
  if (b === 6) return 'arena';
  // ¿árboles cerca?
  for (let dx = -3; dx <= 3; dx += 3) for (let dz = -3; dz <= 3; dz += 3)
    if (world.get(x + dx, y + 2, z + dz) === 4) return 'bosque';
  return 'pasto';
}

function spot(world, bioma) {
  for (let i = 0; i < 40; i++) {
    const x = 6 + ((Math.random() * (SX - 12)) | 0);
    const z = 6 + ((Math.random() * (SZ - 12)) | 0);
    if (Math.abs(x - SX / 2) < 10 && Math.abs(z - SZ / 2) < 10) continue;
    const y = world.surfaceY(x, z);
    if (y <= 2 || y >= SY - 3) continue;
    if (bioma && !bioma.includes(biomaDe(world, x, z))) continue;
    return { x, y, z };
  }
  return null;
}

class Animal {
  constructor(world, x, y, z, id) {
    this.world = world;
    this.id = id;
    this.def = ESPECIES[id];
    this.pos = new THREE.Vector3(x + 0.5, y + 0.3, z + 0.5);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.radius = 0.28 * this.def.size + 0.05;
    this.height = Math.max(0.5, 1.1 * this.def.size);
    this.dir = new THREE.Vector3(1, 0, 0);
    this.timer = 0;
    this.estado = 'pasta';   // pasta | camina | huye | carga
    this.face = 0;
    this.cargaCd = 0;
    this.bob = Math.random() * 6;
    this.hp = this.def.hp || 3;
    this.hurt = 0;
    this.dead = false;
  }

  daño(n) {
    this.hp -= n;
    this.hurt = 0.18;
    this.estado = 'huye';
    this.timer = Math.max(this.timer, 3);
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, player) {
    const d = this.def;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.cargaCd = Math.max(0, this.cargaCd - dt);
    this.timer -= dt;
    this.hurt = Math.max(0, this.hurt - dt);

    // decidir estado
    if (d.carga && dist < 2.4 && this.cargaCd === 0 && Math.random() < 0.02) {
      this.estado = 'carga'; this.timer = 0.8; this.cargaCd = 4;
    } else if (d.huye && dist < d.huye && this.estado !== 'carga') {
      this.estado = 'huye'; this.timer = Math.max(this.timer, 1.5);
    } else if (this.timer <= 0) {
      this.estado = Math.random() < 0.5 ? 'pasta' : 'camina';
      this.timer = 2 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      this.dir.set(Math.cos(a), 0, Math.sin(a));
    }

    let mx = 0, mz = 0, speed = 0;
    const dd = dist || 1;
    if (this.estado === 'huye') { mx = -dx / dd; mz = -dz / dd; speed = d.vel; }
    else if (this.estado === 'carga') { mx = dx / dd; mz = dz / dd; speed = d.vel * 1.6;
      if (dist < 1.3) { player.pos.x -= mx * 3; player.pos.z -= mz * 3; player.vel.y = 5; this.estado = 'huye'; this.timer = 2; }
    }
    else if (this.estado === 'camina') { mx = this.dir.x; mz = this.dir.z; speed = d.vel * 0.4; }
    // 'pasta' = quieto

    if (mx || mz) this.face = Math.atan2(mx, mz);

    if (d.vuela) {
      const objetivoY = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z)) + 6 + Math.sin(this.bob + performance.now() / 600) * 1.5;
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      this.pos.y += (objetivoY - this.pos.y) * Math.min(1, dt * 2);
      this.onGround = false;
    } else {
      this.vel.x = mx * speed;
      this.vel.z = mz * speed;
      this.vel.y -= 22 * dt;
      const blocked = this._blockedAhead(mx, mz);
      this._move('x', this.vel.x * dt);
      this._move('z', this.vel.z * dt);
      this._move('y', this.vel.y * dt);
      if (blocked && this.onGround) this.vel.y = d.salta ? 7 : 6;
    }
    if (this.pos.y < -6) this.pos.y = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z)) + 1;
  }

  _blockedAhead(mx, mz) {
    if (!mx && !mz) return false;
    const nx = Math.floor(this.pos.x + Math.sign(mx) * 0.5);
    const nz = Math.floor(this.pos.z + Math.sign(mz) * 0.5);
    return isSolid(this.world.get(nx, Math.floor(this.pos.y), nz));
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

function makeMesh(def) {
  const s = def.size;
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: def.color });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.45 * s, 0.85 * s), mat);
  cuerpo.position.y = 0.45 * s;
  const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.38 * s, 0.38 * s), mat);
  cabeza.position.set(0, 0.55 * s, 0.5 * s);
  g.add(cuerpo, cabeza);
  g.userData.mats = [cuerpo.material, cabeza.material];
  if (!def.vuela) {
    for (const [px, pz] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]]) {
      const pata = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.35 * s, 0.12 * s), mat);
      pata.position.set(px * s, 0.17 * s, pz * s);
      g.add(pata);
    }
  } else {
    const alaMat = new THREE.MeshLambertMaterial({ color: def.color });
    const aL = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.06 * s, 0.3 * s), alaMat);
    const aR = aL.clone();
    aL.position.set(-0.35 * s, 0.45 * s, 0); aR.position.set(0.35 * s, 0.45 * s, 0);
    g.add(aL, aR); g.userData.alas = [aL, aR];
  }
  g.userData.cuerpo = cuerpo;
  return g;
}

export class AnimalField {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.animals = [];
    this.meshes = [];
    this.onBotin = null;   // callback(botin, nombre) al cazar un animal
  }

  cantidad() { return Math.min(40, Math.round((SX * SZ) / 4500)); }

  spawn(n = this.cantidad()) {
    this.clear();
    const ids = Object.keys(ESPECIES);
    for (let i = 0; i < n; i++) {
      const id = ids[(Math.random() * ids.length) | 0];
      const s = spot(this.world, ESPECIES[id].bioma);
      if (!s) continue;
      const a = new Animal(this.world, s.x, s.y, s.z, id);
      const mesh = makeMesh(a.def);
      this.animals.push(a); this.meshes.push(mesh); this.scene.add(mesh);
    }
  }

  clear() {
    for (const m of this.meshes) this.scene.remove(m);
    this.animals = []; this.meshes = [];
  }

  update(dt, player) {
    const t = performance.now() / 200;
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i], mesh = this.meshes[i];
      if (a.dead) { this._kill(i); continue; }
      // solo simular los cercanos
      const lejos = Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) > 90;
      if (lejos) { mesh.visible = false; continue; }
      mesh.visible = true;
      a.update(dt, player);
      mesh.position.set(a.pos.x, a.pos.y, a.pos.z);
      mesh.rotation.y = a.face;
      const activo = a.estado === 'huye' || a.estado === 'carga' || a.estado === 'camina';
      mesh.userData.cuerpo.rotation.x = activo ? Math.sin(t * 2 + i) * 0.18 : 0;
      if (mesh.userData.mats) mesh.userData.mats.forEach((m) => m.emissive?.setHex(a.hurt > 0 ? 0xaa3333 : 0x000000));
      if (mesh.userData.alas) {
        const flap = Math.sin(performance.now() / 90 + i) * 0.9;
        mesh.userData.alas[0].rotation.z = flap;
        mesh.userData.alas[1].rotation.z = -flap;
      }
    }
    // reponer si quedan pocos cerca
    const cerca = this.animals.filter((a) => Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) < 70).length;
    if (cerca < 5 && this.animals.length < this.cantidad() + 6) this._spawnCercaDe(player);
  }

  _kill(i) {
    const a = this.animals[i];
    this.scene.remove(this.meshes[i]);
    this.animals.splice(i, 1);
    this.meshes.splice(i, 1);
    if (a.def.botin) this.onBotin?.(a.def.botin, a.def.nombre);
  }

  // golpe del jugador: apunta con la mirada. Devuelve true si acertó.
  golpear(camera, reach, daño, empuje = 0) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const o = camera.position;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      const to = new THREE.Vector3(a.pos.x - o.x, a.pos.y + a.height * 0.5 - o.y, a.pos.z - o.z);
      const d = to.length();
      if (d > reach + a.def.size) continue;
      if (to.normalize().dot(dir) < 0.9) continue;
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return false;
    const a = this.animals[best];
    a.daño(daño);
    if (empuje > 0 && !a.dead) {
      const dx = a.pos.x - o.x, dz = a.pos.z - o.z, dd = Math.hypot(dx, dz) || 1;
      a.pos.x += (dx / dd) * empuje; a.pos.z += (dz / dd) * empuje; a.vel.y = 4;
    }
    return true;
  }

  // Onda Prisma y similares
  dañoEnRadio(pos, radio, daño) {
    let n = 0;
    for (const a of this.animals) {
      if (Math.hypot(a.pos.x - pos.x, a.pos.y - pos.y, a.pos.z - pos.z) <= radio) { a.daño(daño); n++; }
    }
    return n;
  }

  _spawnCercaDe(player) {
    for (let tries = 0; tries < 8; tries++) {
      const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 30;
      const x = Math.floor(player.pos.x + Math.cos(ang) * r);
      const z = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.inside(x, 0, z)) continue;
      const y = this.world.surfaceY(x, z);
      if (y <= 2 || y >= SY - 3) continue;
      const ids = Object.keys(ESPECIES);
      const id = ids[(Math.random() * ids.length) | 0];
      const a = new Animal(this.world, x, y, z, id);
      const mesh = makeMesh(a.def);
      this.animals.push(a); this.meshes.push(mesh); this.scene.add(mesh);
      return;
    }
  }
}
