import * as THREE from 'three';
import { isSolid } from './blocks.js';
import { SX, SY, SZ } from './world.js';

// Jugador en primera persona: física AABB simple contra el mundo de voxels.
export class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.pos = new THREE.Vector3(48, SY - 2, 48);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.yaw = 0;
    this.pitch = 0;

    // dimensiones del cuerpo
    this.radius = 0.3;
    this.height = 1.7;
    this.eye = 1.55;

    // parámetros ajustables por poderes
    this.speed = 4.6;
    this.sprintMul = 1.0;      // súper velocidad lo sube
    this.jumpV = 8.2;          // súper salto lo sube
    this.flying = false;       // poder volar

    this.spawnOnSurface();
  }

  spawnOnSurface() {
    const w = this.world;
    const x = (w.SX ?? SX) >> 1, z = (w.SZ ?? SZ) >> 1;
    const y = w.surfaceY(x, z);
    this.pos.set(x + 0.5, y + 0.4, z + 0.5);
    this.vel.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
  }

  addLook(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  // input: {forward, right, jump, sprint} con forward/right en [-1,1]
  update(dt, input) {
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // "adelante" siempre es hacia donde mira la cámara (yaw), sin importar el giro.
    // dirección cámara-adelante (horizontal) = (-sinY, -cosY); cámara-derecha = (cosY, -sinY)
    let mx = -input.forward * sinY + input.right * cosY;
    let mz = -input.forward * cosY - input.right * sinY;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const spd = this.speed * (input.sprint ? 1.6 : 1) * this.sprintMul;

    if (this.flying) {
      this.vel.x = mx * spd;
      this.vel.z = mz * spd;
      this.vel.y = (input.jump ? 1 : 0) * spd - (input.crouch ? spd : 0);
      if (!input.jump && !input.crouch) this.vel.y *= 0.6;
    } else {
      this.vel.x = mx * spd;
      this.vel.z = mz * spd;
      this.vel.y -= 24 * dt; // gravedad
      if (input.jump && this.onGround) { this.vel.y = this.jumpV; this.onGround = false; }
      if (this.vel.y < -40) this.vel.y = -40;
    }

    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('y', this.vel.y * dt);
    this.moveAxis('z', this.vel.z * dt);

    // no caer al vacío
    if (this.pos.y < -8) this.spawnOnSurface();

    // cámara
    this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }

  moveAxis(axis, amount) {
    if (amount === 0) return;
    this.pos[axis] += amount;
    const p = this.pos;
    const r = this.radius;
    const minX = Math.floor(p.x - r), maxX = Math.floor(p.x + r);
    const minY = Math.floor(p.y), maxY = Math.floor(p.y + this.height);
    const minZ = Math.floor(p.z - r), maxZ = Math.floor(p.z + r);

    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++) {
          if (!isSolid(this.world.get(x, y, z))) continue;
          // colisión: empujar fuera en el eje de movimiento
          if (axis === 'y') {
            if (amount > 0) { p.y = y - this.height - 0.0001; this.vel.y = 0; }
            else { p.y = y + 1 + 0.0001; this.vel.y = 0; this.onGround = true; }
          } else if (axis === 'x') {
            if (amount > 0) p.x = x - r - 0.0001; else p.x = x + 1 + r + 0.0001;
            this.vel.x = 0;
          } else {
            if (amount > 0) p.z = z - r - 0.0001; else p.z = z + 1 + r + 0.0001;
            this.vel.z = 0;
          }
          return;
        }
    if (axis === 'y' && amount > 0) this.onGround = false;
  }

  // Raycast DDA por voxels desde el ojo. Devuelve {hit, place} o null.
  raycast(maxDist = 6) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const ox = this.camera.position.x, oy = this.camera.position.y, oz = this.camera.position.z;
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = stepX > 0 ? (Math.floor(ox) + 1 - ox) * tDeltaX : (ox - Math.floor(ox)) * tDeltaX;
    let tMaxY = stepY > 0 ? (Math.floor(oy) + 1 - oy) * tDeltaY : (oy - Math.floor(oy)) * tDeltaY;
    let tMaxZ = stepZ > 0 ? (Math.floor(oz) + 1 - oz) * tDeltaZ : (oz - Math.floor(oz)) * tDeltaZ;
    if (stepX === 0) tMaxX = Infinity;
    if (stepY === 0) tMaxY = Infinity;
    if (stepZ === 0) tMaxZ = Infinity;

    let px = x, py = y, pz = z;
    let t = 0;
    for (let i = 0; i < 200; i++) {
      if (isSolid(this.world.get(x, y, z))) {
        return { hit: { x, y, z }, place: { x: px, y: py, z: pz } };
      }
      px = x; py = y; pz = z;
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; }
      else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; }
      if (t > maxDist) break;
    }
    return null;
  }
}
