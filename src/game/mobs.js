import * as THREE from 'three';
import { isSolid } from '../engine/blocks.js';
import { SX, SZ, SY } from '../engine/world.js';
import { state, save } from './state.js';
import { audio } from './audio.js';
import { toast } from '../ui/toast.js';

// Enemigos por tipo. Aparecen más y más difíciles a medida que subes de nivel
// (nivel = total de medallas bronce+plata+oro acumuladas).
//
// - INVISIBLE o VOLANDO: casi ningún enemigo te detecta (el Acechador sí, a media distancia).
// - SÚPER VELOCIDAD: dejas atrás a casi todos (el Rayo-menor no).
// - Los golpeas con clic/⛏️ apuntándoles de cerca, o con el GRITO SÓNICO en área.

const TYPES = {
  sombra:    { nombre: 'Sombra',    hp: 1, speed: 3.4, view: 13, lose: 22, knock: 4,  dano: 6,  color: 0x2b1e3a, eye: 0xff4d4d, size: 1.0, minNivel: 0,  peso: 5 },
  veloz:     { nombre: 'Espectro',  hp: 1, speed: 5.3, view: 10, lose: 18, knock: 3,  dano: 5,  color: 0x1e2f3a, eye: 0x4dd2ff, size: 0.9, minNivel: 3,  peso: 3, verInvisible: false },
  saltarin:  { nombre: 'Brincón',   hp: 2, speed: 3.1, view: 12, lose: 20, knock: 4,  dano: 7,  color: 0x143a1e, eye: 0xa8e10c, size: 0.95, minNivel: 6, peso: 3, salta: true },
  bruto:     { nombre: 'Bruto',     hp: 4, speed: 2.3, view: 14, lose: 20, knock: 9,  dano: 14, color: 0x3a1e1e, eye: 0xff8a3d, size: 1.35, minNivel: 10, peso: 2 },
  acechador: { nombre: 'Acechador', hp: 3, speed: 3.9, view: 19, lose: 28, knock: 5,  dano: 10, color: 0x241a2e, eye: 0xff2bd0, size: 1.05, minNivel: 15, peso: 2, verInvisible: true },
  // --- Parte 4: enemigos originales grandes ---
  larguirucho: {
    nombre: 'El Larguirucho', hp: 5, speed: 7.4, view: 26, lose: 46, knock: 5,
    dano: 12,
    color: 0xe9e5da, eye: 0x4be0ff, size: 1.2, minNivel: 9, peso: 1,
    verInvisible: true, forma: 'alto', congelaConMirada: true,
    grito: '👁️ El Larguirucho te atrapó. No le quites la vista de encima.',
  },
  gigante: {
    nombre: 'El Gigante', hp: 14, speed: 1.8, view: 17, lose: 26, knock: 15, dano: 30,
    color: 0x8a7357, eye: 0xffcf6a, size: 3.1, minNivel: 14, peso: 1,
    forma: 'gigante',
    grito: '🦶 ¡EL GIGANTE te aplastó! Es lento: corre lejos.',
  },
};

const CATCH_DIST = 1.15;

export function nivelDificultad() {
  const m = state.medallas || {};
  return (m.bronce || 0) + (m.plata || 0) + (m.oro || 0);
}

export function cantidadEnemigos() {
  return Math.min(4 + Math.round(nivelDificultad() * 0.8), 20);
}

function tiposDisponibles() {
  const n = nivelDificultad();
  return Object.entries(TYPES).filter(([, t]) => n >= t.minNivel);
}

function eligeTipo() {
  const disp = tiposDisponibles();
  const total = disp.reduce((s, [, t]) => s + t.peso, 0);
  let r = Math.random() * total;
  for (const [id, t] of disp) { r -= t.peso; if (r <= 0) return id; }
  return 'sombra';
}

class Mob {
  constructor(world, x, y, z, typeId) {
    this.world = world;
    this.type = typeId;
    const t = TYPES[typeId];
    this.def = t;
    this.pos = new THREE.Vector3(x + 0.5, y + 0.2, z + 0.5);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.radius = 0.3 * t.size + 0.08;
    this.height = 1.5 * t.size;
    this.hp = t.hp;
    this.state = 'wander';
    this.dir = new THREE.Vector3(1, 0, 0);
    this.wanderTimer = 0;
    this.catchCooldown = 0;
    this.hurt = 0;
    this.face = 0;
    this.dead = false;
  }

  daño(n) {
    this.hp -= n;
    this.hurt = 0.15;
    if (this.hp <= 0) { this.dead = true; audio.sfx('golpe'); }
  }

  update(dt, player) {
    const t = this.def;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.catchCooldown = Math.max(0, this.catchCooldown - dt);
    this.hurt = Math.max(0, this.hurt - dt);

    let puedeVer = !player.flying;
    if (player.invisible) puedeVer = t.verInvisible && dist < t.view * 0.55;

    if (this.state === 'wander') {
      if (puedeVer && dist < t.view) this.state = 'chase';
    } else if (!puedeVer || dist > t.lose) {
      this.state = 'wander';
    }

    let mx = 0, mz = 0, speed = 1.4;
    if (this.state === 'chase') {
      speed = t.speed;
      const d = dist || 1;
      mx = dx / d; mz = dz / d;
      // El Larguirucho se congela mientras lo miras; avanza cuando le quitas la vista
      this._mirado = false;
      if (t.congelaConMirada) {
        // cámara-adelante del jugador = (-sinY, -cosY); ¿apunta hacia el mob?
        const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
        if ((-dx / d) * fx + (-dz / d) * fz > 0.42) { this._mirado = true; speed = 0.2; mx = 0; mz = 0; }
      }
      if (dist < CATCH_DIST && this.catchCooldown === 0 && !this._mirado) {
        this.catchCooldown = t.forma === 'gigante' ? 1.6 : 2.2;
        const k = player._empuje ?? 1;   // Gema Vital reduce el empujón
        player.pos.x -= (dx / d) * (t.knock * 0.5) * k;
        player.pos.z -= (dz / d) * (t.knock * 0.5) * k;
        player.vel.y = (6 + t.knock * 0.4) * k;
        player.onDañar?.(t.dano || 6, t.nombre);
        if (t.grito) toast(t.grito);
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2;
        this.dir.set(Math.cos(a), 0, Math.sin(a));
      }
      mx = this.dir.x; mz = this.dir.z;
    }
    this.face = Math.atan2(mx, mz);

    this.vel.x = mx * speed;
    this.vel.z = mz * speed;
    this.vel.y -= 22 * dt;
    if (this.vel.y < -35) this.vel.y = -35;

    const blocked = this._blockedAhead(mx, mz);
    this._move('x', this.vel.x * dt);
    this._move('z', this.vel.z * dt);
    this._move('y', this.vel.y * dt);
    if (blocked && this.onGround) this.vel.y = t.salta ? 9 : 6.5;

    if (this.pos.y < -6) this.respawn();
  }

  _blockedAhead(mx, mz) {
    if (mx === 0 && mz === 0) return false;
    const nx = Math.floor(this.pos.x + Math.sign(mx) * 0.5);
    const nz = Math.floor(this.pos.z + Math.sign(mz) * 0.5);
    return isSolid(this.world.get(nx, Math.floor(this.pos.y), nz));
  }

  _move(axis, amount) {
    if (!amount) return;
    this.pos[axis] += amount;
    const p = this.pos, r = this.radius;
    const minX = Math.floor(p.x - r), maxX = Math.floor(p.x + r);
    const minY = Math.floor(p.y), maxY = Math.floor(p.y + this.height);
    const minZ = Math.floor(p.z - r), maxZ = Math.floor(p.z + r);
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++) {
          if (!isSolid(this.world.get(x, y, z))) continue;
          if (axis === 'y') {
            if (amount > 0) { p.y = y - this.height - 0.001; this.vel.y = 0; }
            else { p.y = y + 1 + 0.001; this.vel.y = 0; this.onGround = true; }
          } else if (axis === 'x') {
            p.x = amount > 0 ? x - r - 0.001 : x + 1 + r + 0.001; this.vel.x = 0;
          } else {
            p.z = amount > 0 ? z - r - 0.001 : z + 1 + r + 0.001; this.vel.z = 0;
          }
          return;
        }
    if (axis === 'y' && amount > 0) this.onGround = false;
  }

  respawn() {
    const s = randomSpot(this.world);
    this.pos.set(s.x + 0.5, s.y + 0.2, s.z + 0.5);
    this.vel.set(0, 0, 0);
    this.state = 'wander';
  }
}

function randomSpot(world) {
  for (let i = 0; i < 50; i++) {
    const x = 4 + ((Math.random() * (SX - 8)) | 0);
    const z = 4 + ((Math.random() * (SZ - 8)) | 0);
    if (Math.abs(x - SX / 2) < 12 && Math.abs(z - SZ / 2) < 12) continue;
    const y = world.surfaceY(x, z);
    if (y > 2 && y < SY - 3) return { x, y, z };
  }
  return { x: 8, y: world.surfaceY(8, 8), z: 8 };
}

function makeMesh(def) {
  const g = new THREE.Group();
  const s = def.size;
  const mat = () => new THREE.MeshLambertMaterial({ color: def.color });
  let body, head, eLpos, eRpos, eSize;

  if (def.forma === 'alto') {
    // El Larguirucho: altísimo y flaco, brazos largos
    body = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 3.0 * s, 0.42 * s), mat());
    body.position.y = 1.8 * s;
    head = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 0.55 * s, 0.55 * s), mat());
    head.position.y = 3.5 * s;
    const armGeo = new THREE.BoxGeometry(0.16 * s, 2.0 * s, 0.16 * s);
    const aL = new THREE.Mesh(armGeo, mat()); aL.position.set(-0.38 * s, 2.0 * s, 0);
    const aR = new THREE.Mesh(armGeo, mat()); aR.position.set(0.38 * s, 2.0 * s, 0);
    g.add(aL, aR);
    eSize = 0.2 * s; eLpos = [-0.14 * s, 3.55 * s, 0.28 * s]; eRpos = [0.14 * s, 3.55 * s, 0.28 * s];
  } else if (def.forma === 'gigante') {
    // El Gigante: enorme y macizo, con piernas
    body = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 1.5 * s, 0.9 * s), mat());
    body.position.y = 1.15 * s;
    head = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.8 * s, 0.8 * s), mat());
    head.position.y = 2.25 * s;
    const legGeo = new THREE.BoxGeometry(0.5 * s, 1.0 * s, 0.5 * s);
    const lL = new THREE.Mesh(legGeo, mat()); lL.position.set(-0.34 * s, 0.5 * s, 0);
    const lR = new THREE.Mesh(legGeo, mat()); lR.position.set(0.34 * s, 0.5 * s, 0);
    g.add(lL, lR);
    eSize = 0.16 * s; eLpos = [-0.2 * s, 2.35 * s, 0.42 * s]; eRpos = [0.2 * s, 2.35 * s, 0.42 * s];
  } else {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.9 * s, 0.5 * s), mat());
    body.position.y = 0.75 * s;
    head = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.5 * s, 0.5 * s), mat());
    head.position.y = 1.45 * s;
    eSize = 0.12 * s; eLpos = [-0.13 * s, 1.5 * s, 0.26 * s]; eRpos = [0.13 * s, 1.5 * s, 0.26 * s];
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: def.eye });
  const eL = new THREE.Mesh(new THREE.BoxGeometry(eSize, eSize, 0.06), eyeMat);
  const eR = eL.clone();
  eL.position.set(...eLpos);
  eR.position.set(...eRpos);
  g.add(body, head, eL, eR);
  g.userData = { body, mats: [body.material, head.material] };
  return g;
}

export class MobField {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.mobs = [];
    this.meshes = [];
    this.enabled = true;
  }

  spawn(n = cantidadEnemigos()) {
    this.clear();
    for (let i = 0; i < n; i++) {
      const s = randomSpot(this.world);
      const typeId = eligeTipo();
      const mob = new Mob(this.world, s.x, s.y, s.z, typeId);
      const mesh = makeMesh(mob.def);
      this.mobs.push(mob);
      this.meshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  clear() {
    for (const m of this.meshes) this.scene.remove(m);
    this.mobs = [];
    this.meshes = [];
  }

  // usado por el Coloso para invocar ayudantes
  spawnAt(pos, typeId = 'sombra') {
    if (this.mobs.length > 26) return;
    const x = Math.floor(pos.x + (Math.random() * 6 - 3));
    const z = Math.floor(pos.z + (Math.random() * 6 - 3));
    const y = this.world.surfaceY(x, z);
    const mob = new Mob(this.world, x, y, z, typeId);
    mob.state = 'chase';
    const mesh = makeMesh(mob.def);
    this.mobs.push(mob);
    this.meshes.push(mesh);
    this.scene.add(mesh);
  }

  update(dt, player) {
    if (!this.enabled) return;
    const t = performance.now() / 200;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      mob.update(dt, player);
      if (mob.dead) { this._kill(i); continue; }
      const mesh = this.meshes[i];
      mesh.position.set(mob.pos.x, mob.pos.y, mob.pos.z);
      mesh.rotation.y = mob.face;
      // el Larguirucho se queda quieto mientras lo miras
      mesh.userData.body.rotation.x = mob._mirado
        ? 0
        : Math.sin(t + i) * (mob.state === 'chase' ? 0.35 : 0.12);
      const flash = mob.hurt > 0;
      mesh.userData.mats.forEach((m) => m.emissive?.setHex(flash ? 0xff0000 : 0x000000));
    }
  }

  _kill(i) {
    this.scene.remove(this.meshes[i]);
    this.mobs.splice(i, 1);
    this.meshes.splice(i, 1);
    state.stats = state.stats || {};
    state.stats.derrotados = (state.stats.derrotados || 0) + 1;
    save();
    // reponer uno nuevo tras un rato para que el mundo no se vacíe
    setTimeout(() => {
      if (!this.enabled || this.mobs.length >= cantidadEnemigos()) return;
      const s = randomSpot(this.world);
      const mob = new Mob(this.world, s.x, s.y, s.z, eligeTipo());
      const mesh = makeMesh(mob.def);
      this.mobs.push(mob); this.meshes.push(mesh); this.scene.add(mesh);
    }, 6000);
  }

  // golpe del jugador: apunta con la mirada; devuelve true si acertó
  golpear(camera, reach, daño) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const o = camera.position;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      const to = new THREE.Vector3(m.pos.x - o.x, m.pos.y + m.height * 0.5 - o.y, m.pos.z - o.z);
      const d = to.length();
      if (d > reach) continue;
      const ang = to.normalize().dot(dir);
      if (ang < 0.93) continue; // ~21° de tolerancia
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return false;
    this.mobs[best].daño(daño);
    return true;
  }

  // grito sónico: daño en cono
  dañoEnCono(origin, dir, range, daño) {
    let n = 0;
    for (const m of this.mobs) {
      const to = new THREE.Vector3(m.pos.x - origin.x, m.pos.y - origin.y, m.pos.z - origin.z);
      const d = to.length();
      if (d > range) continue;
      if (to.normalize().dot(dir) < 0.6) continue;
      m.daño(daño); n++;
    }
    return n;
  }

  // Onda Prisma: daño en esfera alrededor de un punto
  dañoEnRadio(pos, radio, daño) {
    let n = 0;
    for (const m of this.mobs) {
      const d = Math.hypot(m.pos.x - pos.x, m.pos.y - pos.y, m.pos.z - pos.z);
      if (d <= radio) { m.daño(daño); n++; }
    }
    return n;
  }

  chasing() { return this.mobs.filter((m) => m.state === 'chase').length; }
  vivos() { return this.mobs.length; }
}
