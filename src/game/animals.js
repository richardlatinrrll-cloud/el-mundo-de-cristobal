import * as THREE from 'three';
import { isSolid } from '../engine/blocks.js';
import { SX, SZ, SY } from '../engine/world.js';

// Animales pacíficos que vagan por el mundo. Algunos huyen del jugador,
// otros lo ignoran, y un par pueden dar un empujón si te acercas demasiado.

// bioma: 1=pasto, 5=cerca de árboles/bosque, 6=arena, 10=agua/orilla
export const ESPECIES = {
  conejo:   { nombre: 'Conejo',   emoji: '🐇', color: 0xe8e2d8, size: 0.5, vel: 3.8, huye: 14, salta: true,  bioma: ['pasto'], hp: 2, botin: { carne: 1, cuero: 1 }, forma: 'peludo' },
  ciervo:   { nombre: 'Ciervo',   emoji: '🦌', color: 0x9c6b3f, size: 1.3, vel: 4.4, huye: 16,               bioma: ['pasto', 'bosque'], hp: 4, botin: { carne: 2, cuero: 2 }, forma: 'ciervo' },
  zorro:    { nombre: 'Zorro',    emoji: '🦊', color: 0xd9702e, size: 0.8, vel: 4.0, huye: 10,               bioma: ['pasto', 'bosque'], hp: 3, botin: { carne: 1, cuero: 1 }, forma: 'canido' },
  oveja:    { nombre: 'Oveja',    emoji: '🐑', color: 0xf1eee6, size: 1.0, vel: 2.2, huye: 7,                bioma: ['pasto'], hp: 3, botin: { carne: 1, lana: 2 }, forma: 'peludo' },
  vaca:     { nombre: 'Vaca',     emoji: '🐄', color: 0x4a4038, size: 1.3, vel: 2.0, huye: 6,                bioma: ['pasto'], hp: 5, botin: { carne: 3, cuero: 3 }, forma: 'bovino' },
  jabali:   { nombre: 'Jabalí',   emoji: '🐗', color: 0x5a4636, size: 1.1, vel: 3.4, huye: 8,  carga: true,  bioma: ['bosque', 'pasto'], hp: 4, botin: { carne: 2, cuero: 1 }, forma: 'jabali' },
  oso:      { nombre: 'Oso',      emoji: '🐻', color: 0x6b4a2f, size: 1.7, vel: 3.0, huye: 0,  carga: true,  bioma: ['bosque'], hp: 7, botin: { carne: 3, cuero: 2 }, forma: 'oso' },
  tortuga:  { nombre: 'Tortuga',  emoji: '🐢', color: 0x3f7d4a, size: 0.7, vel: 0.9, huye: 5,                bioma: ['arena', 'agua'], hp: 3, botin: { carne: 1, cuero: 1 }, forma: 'caparazon' },
  pajaro:   { nombre: 'Pájaro',   emoji: '🐦', color: 0x3a6bd0, size: 0.4, vel: 5.5, huye: 12, vuela: true,  bioma: ['pasto', 'bosque', 'arena'], hp: 1, botin: { carne: 1, pluma: 2 }, forma: 'ave' },
  // --- Dinosaurios (Parte 9) ---
  trex:          { nombre: 'T-Rex',        emoji: '🦖', color: 0x5f6b3a, size: 3.2, vel: 4.6, huye: 0,  carga: true, cargaFuerte: true, bioma: ['bosque', 'pasto'], hp: 40, botin: { carne: 8, cuero: 5 }, forma: 'trex', peso: 1 },
  braquiosaurio: { nombre: 'Braquiosaurio',emoji: '🦕', color: 0x6a7d8f, size: 4.2, vel: 1.7, huye: 4,               bioma: ['pasto', 'bosque'], hp: 55, botin: { carne: 12, cuero: 8 }, forma: 'cuellolargo', peso: 1 },
  triceratops:   { nombre: 'Triceratops',  emoji: '🦏', color: 0x7a6a54, size: 2.6, vel: 2.6, huye: 0,  carga: true, bioma: ['pasto'], hp: 34, botin: { carne: 6, cuero: 6 }, forma: 'trike', peso: 1 },
  raptor:        { nombre: 'Raptor',       emoji: '🦎', color: 0x8a6a3a, size: 1.3, vel: 6.4, huye: 0,  carga: true, bioma: ['bosque', 'pasto'], hp: 12, botin: { carne: 2, cuero: 1 }, forma: 'raptor', peso: 2 },
};

// elige una especie con peso (los dinos son raros)
function eligeEspecie() {
  const ents = Object.entries(ESPECIES);
  const total = ents.reduce((s, [, d]) => s + (d.peso ?? 3), 0);
  let r = Math.random() * total;
  for (const [id, d] of ents) { r -= (d.peso ?? 3); if (r <= 0) return id; }
  return 'conejo';
}

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

    // los depredadores (huye 0 + carga) CAZAN al jugador de lejos
    const depredador = d.carga && d.huye === 0;

    // decidir estado
    if (depredador && dist < (d.forma === 'raptor' ? 22 : 16) && this.estado !== 'carga') {
      this.estado = 'carga'; this.timer = 3;
    } else if (d.carga && !depredador && dist < 2.8 && this.cargaCd === 0 && Math.random() < 0.03) {
      this.estado = 'carga'; this.timer = 0.9; this.cargaCd = 4;
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
    else if (this.estado === 'carga') {
      mx = dx / dd; mz = dz / dd; speed = d.vel * (depredador ? 1.15 : 1.6);
      const alcance = 1.2 + this.def.size * 0.4;
      if (dist < alcance && this.cargaCd === 0 && !this._muroEntre(player)) {
        this.cargaCd = depredador ? 1.4 : 3;
        const k = player._empuje ?? 1;
        player.pos.x -= mx * 4 * k; player.pos.z -= mz * 4 * k; player.vel.y = 6 * k;
        player.onDañar?.(d.cargaFuerte ? 32 : d.forma === 'trike' ? 20 : depredador ? 14 : 8, d.nombre);
        if (!depredador) { this.estado = 'huye'; this.timer = 2; }
      }
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

  // ¿hay un muro entre el animal y el jugador? (para que un refugio proteja)
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
    const minX = Math.floor(p.x - r), maxX = Math.floor(p.x + r);
    const minZ = Math.floor(p.z - r), maxZ = Math.floor(p.z + r);
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + this.height); y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++) {
          if (!isSolid(this.world.get(x, y, z))) continue;
          if (axis === 'y') {
            if (amount > 0) { p.y = y - this.height - 0.001; this.vel.y = 0; }
            else { p.y = y + 1.001; this.vel.y = 0; this.onGround = true; }
          } else {
            // auto-step: subir un escalón de 1 bloque si arriba está libre
            if (this.onGround && this.vel.y <= 0.1) {
              const topY = y + 1;
              let libre = true;
              for (let hy = topY; hy <= topY + Math.ceil(this.height) && libre; hy++)
                for (let hz = minZ; hz <= maxZ && libre; hz++)
                  for (let hx = minX; hx <= maxX && libre; hx++)
                    if (isSolid(this.world.get(hx, hy, hz))) libre = false;
              if (libre) { p.y = topY + 0.02; return; }
            }
            if (axis === 'x') { p.x = amount > 0 ? x - r - 0.001 : x + 1 + r + 0.001; this.vel.x = 0; }
            else { p.z = amount > 0 ? z - r - 0.001 : z + 1 + r + 0.001; this.vel.z = 0; }
          }
          return;
        }
    if (axis === 'y' && amount > 0) this.onGround = false;
  }
}

function _sh(hex, f) {
  const r = Math.max(0, Math.min(255, ((hex >> 16 & 255) * f) | 0));
  const g = Math.max(0, Math.min(255, ((hex >> 8 & 255) * f) | 0));
  const b = Math.max(0, Math.min(255, ((hex & 255) * f) | 0));
  return (r << 16) | (g << 8) | b;
}

// Modelos con más partes: cuerpo, cabeza, hocico, patas, cola, orejas…
function makeMesh(def) {
  const s = def.size;
  const g = new THREE.Group();
  const c = def.color, cD = _sh(c, 0.78), cL = _sh(c, 1.15);
  const mats = [];
  const box = (w, h, d, col, x, y, z, rot) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s),
      new THREE.MeshLambertMaterial({ color: col }));
    m.position.set(x * s, y * s, z * s);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    g.add(m); mats.push(m.material); return m;
  };
  const ojo = (x, y, z) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.07 * s, 0.05), new THREE.MeshBasicMaterial({ color: 0x101010 })); e.position.set(x * s, y * s, z * s); g.add(e); };
  const f = def.forma || 'peludo';
  let cuerpo;
  const patas = (bw, y, cols) => {
    for (const [px, pz] of [[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]]) {
      box(bw, y * 2, bw, cols || cD, px, y, pz);
    }
  };

  if (f === 'ave') {
    cuerpo = box(0.34, 0.34, 0.5, c, 0, 0.45, 0);
    box(0.28, 0.28, 0.28, cL, 0, 0.62, 0.28);        // cabeza
    box(0.1, 0.08, 0.16, 0xffb020, 0, 0.6, 0.46);    // pico
    const aL = box(0.5, 0.06, 0.32, c, -0.32, 0.46, 0);
    const aR = box(0.5, 0.06, 0.32, c, 0.32, 0.46, 0);
    box(0.12, 0.1, 0.3, cD, 0, 0.42, -0.3);          // cola
    g.userData.alas = [aL, aR];
    ojo(-0.09, 0.65, 0.4); ojo(0.09, 0.65, 0.4);
  } else if (f === 'caparazon') {
    cuerpo = box(0.7, 0.4, 0.85, cD, 0, 0.32, 0);
    box(0.62, 0.28, 0.78, cL, 0, 0.5, 0);            // caparazón
    box(0.26, 0.24, 0.26, c, 0, 0.36, 0.5);          // cabeza
    for (const [px, pz] of [[-0.32, 0.32], [0.32, 0.32], [-0.32, -0.32], [0.32, -0.32]]) box(0.16, 0.16, 0.2, c, px, 0.14, pz);
    ojo(-0.07, 0.4, 0.6); ojo(0.07, 0.4, 0.6);
  } else if (f === 'trex') {
    cuerpo = box(0.75, 0.9, 1.7, c, 0, 1.6, 0);
    box(0.6, 0.45, 1.5, cL, 0, 1.3, 0.05);           // vientre claro
    box(0.65, 0.7, 0.9, c, 0, 2.15, 1.05);           // cabeza grande
    box(0.55, 0.25, 0.55, cD, 0, 1.92, 1.5);         // mandíbula
    for (let i = 0; i < 4; i++) box(0.06, 0.14, 0.06, 0xf2ead6, -0.15 + i * 0.1, 1.86, 1.62); // dientes
    box(0.26, 0.22, 1.7, c, 0, 1.5, -1.35);          // cola gruesa
    box(0.12, 0.12, 0.7, cD, 0, 1.4, -2.4, [0.25, 0, 0]);
    box(0.18, 0.55, 0.18, cD, -0.4, 1.55, 0.5); box(0.18, 0.55, 0.18, cD, 0.4, 1.55, 0.5); // bracitos
    box(0.42, 1.3, 0.42, cD, -0.42, 0.65, -0.1); box(0.42, 1.3, 0.42, cD, 0.42, 0.65, -0.1); // patotas
    box(0.5, 0.12, 0.7, cD, -0.42, 0.06, 0.1); box(0.5, 0.12, 0.7, cD, 0.42, 0.06, 0.1);     // pies
    ojo(-0.2, 2.35, 1.45); ojo(0.2, 2.35, 1.45);
  } else if (f === 'cuellolargo') {
    cuerpo = box(1.0, 1.1, 2.0, c, 0, 1.5, 0);
    box(0.4, 0.4, 1.6, c, 0, 2.3, 1.0, [-0.5, 0, 0]); // cuello inclinado
    box(0.42, 0.4, 1.3, c, 0, 3.1, 1.7, [-0.7, 0, 0]);
    box(0.5, 0.45, 0.6, cL, 0, 3.8, 2.2);            // cabecita
    box(0.24, 0.24, 2.4, c, 0, 1.2, -1.7);           // cola larga
    box(0.14, 0.14, 1.0, cD, 0, 1.1, -3.2, [0.2, 0, 0]);
    for (const [px, pz] of [[-0.4, 0.55], [0.4, 0.55], [-0.4, -0.55], [0.4, -0.55]]) box(0.42, 1.5, 0.42, cD, px, 0.75, pz);
    ojo(-0.16, 3.9, 2.4); ojo(0.16, 3.9, 2.4);
  } else if (f === 'trike') {
    cuerpo = box(1.1, 1.0, 1.7, c, 0, 1.0, 0);
    box(0.9, 0.5, 1.5, cL, 0, 0.7, 0);
    box(0.75, 0.7, 0.7, c, 0, 1.0, 1.0);             // cabeza
    box(1.15, 0.9, 0.25, cD, 0, 1.25, 0.65);         // gola/escudo
    box(0.12, 0.5, 0.12, 0xf2ead6, -0.28, 1.35, 1.3, [0.5, 0, 0]); // 2 cuernos frente
    box(0.12, 0.5, 0.12, 0xf2ead6, 0.28, 1.35, 1.3, [0.5, 0, 0]);
    box(0.12, 0.35, 0.12, 0xf2ead6, 0, 1.0, 1.45, [0.9, 0, 0]);    // cuerno nariz
    box(0.22, 0.2, 1.3, c, 0, 0.9, -1.3);            // cola
    for (const [px, pz] of [[-0.42, 0.5], [0.42, 0.5], [-0.42, -0.5], [0.42, -0.5]]) box(0.36, 1.0, 0.36, cD, px, 0.5, pz);
    ojo(-0.22, 1.15, 1.3); ojo(0.22, 1.15, 1.3);
  } else if (f === 'raptor') {
    cuerpo = box(0.42, 0.5, 1.1, c, 0, 0.95, 0);
    box(0.34, 0.4, 0.9, cL, 0, 0.75, 0.05);
    box(0.34, 0.36, 0.55, c, 0, 1.15, 0.75);         // cabeza
    box(0.3, 0.16, 0.32, cD, 0, 1.0, 1.0);           // hocico
    box(0.16, 0.14, 1.3, c, 0, 0.95, -0.9, [0.1, 0, 0]);  // cola rígida
    box(0.12, 0.3, 0.12, cD, -0.22, 0.85, 0.35); box(0.12, 0.3, 0.12, cD, 0.22, 0.85, 0.35); // brazos
    box(0.2, 0.85, 0.2, cD, -0.24, 0.42, -0.1); box(0.2, 0.85, 0.2, cD, 0.24, 0.42, -0.1);   // patas
    ojo(-0.12, 1.22, 0.95); ojo(0.12, 1.22, 0.95);
  } else {
    // cuadrúpedos: peludo / ciervo / canido / bovino / jabali / oso
    const bodyH = f === 'oso' ? 0.65 : f === 'bovino' ? 0.55 : 0.45;
    cuerpo = box(0.55, bodyH, 0.95, c, 0, 0.55, 0);
    box(0.5, bodyH * 0.7, 0.9, cL, 0, 0.42, 0);
    box(0.4, 0.4, 0.42, c, 0, 0.75, 0.55);           // cabeza
    box(0.26, 0.2, 0.28, cD, 0, 0.66, 0.78);         // hocico
    patas(f === 'oso' ? 0.16 : 0.12, f === 'oso' ? 0.32 : 0.26);
    box(0.14, 0.14, f === 'canido' ? 0.5 : 0.3, c, 0, 0.6, -0.5, f === 'peludo' ? [0.9, 0, 0] : [0.3, 0, 0]); // cola
    if (f === 'ciervo') {
      box(0.06, 0.3, 0.06, cD, -0.13, 1.0, 0.5); box(0.06, 0.3, 0.06, cD, 0.13, 1.0, 0.5);   // cornamenta
      box(0.16, 0.06, 0.06, cD, -0.2, 1.12, 0.5); box(0.16, 0.06, 0.06, cD, 0.2, 1.12, 0.5);
    } else if (f !== 'bovino') {
      box(0.1, 0.14, 0.06, cD, -0.14, 0.95, 0.5); box(0.1, 0.14, 0.06, cD, 0.14, 0.95, 0.5); // orejas
    } else {
      box(0.12, 0.28, 0.08, cL, -0.16, 0.9, 0.55, [0, 0, -0.5]); box(0.12, 0.28, 0.08, cL, 0.16, 0.9, 0.55, [0, 0, 0.5]); // cuernos vaca
    }
    if (f === 'jabali') { box(0.06, 0.06, 0.14, 0xf2ead6, -0.1, 0.62, 0.85); box(0.06, 0.06, 0.14, 0xf2ead6, 0.1, 0.62, 0.85); }
    ojo(-0.13, 0.82, 0.68); ojo(0.13, 0.82, 0.68);
  }

  g.userData.cuerpo = cuerpo;
  g.userData.mats = mats;
  return g;
}

export class AnimalField {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.animals = [];
    this.meshes = [];
    this.onBotin = null;   // callback(botin, nombre) al cazar un animal
    this.arenaMode = false; // Sala de pruebas: no repoblar con animales al azar
  }

  cantidad() { return Math.min(40, Math.round((SX * SZ) / 4500)); }

  spawn(n = this.cantidad()) {
    this.clear();
    for (let i = 0; i < n; i++) {
      const id = eligeEspecie();
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

  // OLEADA: aparecen dinosaurios depredadores en anillo alrededor del jugador.
  oleadaDinos(player, n = 4) {
    const deps = ['trex', 'raptor', 'raptor', 'triceratops'];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 24 + Math.random() * 20;
      const x = Math.floor(player.pos.x + Math.cos(ang) * r);
      const z = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.inside(x, 0, z)) continue;
      const y = this.world.surfaceY(x, z);
      if (y <= 2 || y >= SY - 3) continue;
      const a = this.spawnUno(deps[i % deps.length], x, y, z);
      if (a) { a.estado = 'carga'; a.timer = 999; a._oleada = true; }
    }
  }

  // al terminar la oleada se van los dinos de la oleada
  limpiarOleada() {
    for (let i = this.animals.length - 1; i >= 0; i--) {
      if (this.animals[i]._oleada) { this.scene.remove(this.meshes[i]); this.animals.splice(i, 1); this.meshes.splice(i, 1); }
    }
  }

  // Sala de pruebas: aparece un animal concreto (por id) al lado del jugador.
  spawnUno(id, x, y, z) {
    if (!ESPECIES[id]) return null;
    const a = new Animal(this.world, Math.floor(x), Math.floor(y), Math.floor(z), id);
    a.pos.set(x + 0.5, y + 0.5, z + 0.5);
    const mesh = makeMesh(a.def);
    this.animals.push(a); this.meshes.push(mesh); this.scene.add(mesh);
    return a;
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
    // reponer si quedan pocos cerca (en la Sala de pruebas no)
    if (this.arenaMode) return;
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

  // grito sónico (cono hacia adelante)
  dañoEnCono(origin, dir, range, daño) {
    let n = 0;
    for (const a of this.animals) {
      const to = new THREE.Vector3(a.pos.x - origin.x, a.pos.y - origin.y, a.pos.z - origin.z);
      if (to.length() > range) continue;
      if (to.normalize().dot(dir) < 0.55) continue;
      a.daño(daño); n++;
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
      const a = new Animal(this.world, x, y, z, eligeEspecie());
      const mesh = makeMesh(a.def);
      this.animals.push(a); this.meshes.push(mesh); this.scene.add(mesh);
      return;
    }
  }
}
