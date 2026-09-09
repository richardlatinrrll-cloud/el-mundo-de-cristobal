import * as THREE from 'three';
import { state } from '../game/state.js';

// Layout de skin estilo Minecraft 64x64 (una sola capa, brazos clásicos 4px).
export const SKIN_W = 64, SKIN_H = 64;

// rects en pixeles [x0,y0,x1,y1], orden de caras three.js BoxGeometry: +x,-x,+y,-y,+z,-z
const UV = {
  head: [[16,8,24,16],[0,8,8,16],[8,0,16,8],[16,0,24,8],[8,8,16,16],[24,8,32,16]],
  body: [[16,20,20,32],[28,20,32,32],[20,16,28,20],[28,16,36,20],[20,20,28,32],[32,20,40,32]],
  armR: [[40,20,44,32],[48,20,52,32],[44,16,48,20],[48,16,52,20],[44,20,48,32],[52,20,56,32]],
  armL: [[32,52,36,64],[40,52,44,64],[36,48,40,52],[40,48,44,52],[36,52,40,64],[44,52,48,64]],
  legR: [[0,20,4,32],[8,20,12,32],[4,16,8,20],[8,16,12,20],[4,20,8,32],[12,20,16,32]],
  legL: [[16,52,20,64],[24,52,28,64],[20,48,24,52],[24,48,28,52],[20,52,24,64],[28,52,32,64]],
};

function setBoxUV(geo, rects) {
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [x0, y0, x1, y1] = rects[f];
    const u0 = x0 / SKIN_W, u1 = x1 / SKIN_W;
    const v0 = 1 - y0 / SKIN_H, v1 = 1 - y1 / SKIN_H;
    const o = f * 4;
    uv.setXY(o + 0, u0, v0);
    uv.setXY(o + 1, u1, v0);
    uv.setXY(o + 2, u0, v1);
    uv.setXY(o + 3, u1, v1);
  }
  uv.needsUpdate = true;
}

function part(w, h, d, rects, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  setBoxUV(g, rects);
  return new THREE.Mesh(g, mat);
}

// Escala: 1 pixel = 0.06 unidades  → personaje ~1.7 de alto
const S = 0.06;

export function makeAvatar(texture) {
  const mat = new THREE.MeshLambertMaterial({ map: texture, transparent: true, alphaTest: 0.5 });
  const g = new THREE.Group();

  const head = part(8 * S, 8 * S, 8 * S, UV.head, mat);
  head.position.y = (12 + 6 + 4) * S;
  const body = part(8 * S, 12 * S, 4 * S, UV.body, mat);
  body.position.y = (12 + 6) * S;
  const armR = part(4 * S, 12 * S, 4 * S, UV.armR, mat);
  armR.position.set(-6 * S, (12 + 6) * S, 0);
  const armL = part(4 * S, 12 * S, 4 * S, UV.armL, mat);
  armL.position.set(6 * S, (12 + 6) * S, 0);
  const legR = part(4 * S, 12 * S, 4 * S, UV.legR, mat);
  legR.position.set(-2 * S, 6 * S, 0);
  const legL = part(4 * S, 12 * S, 4 * S, UV.legL, mat);
  legL.position.set(2 * S, 6 * S, 0);

  // --- pelo dorado del Modo Súper Saya (oculto hasta la transformación) ---
  const peloSaya = new THREE.Group();
  const oroMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  const spike = (x, y, z, h, rx, rz) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(2.1 * S, h * S, 5), oroMat);
    m.position.set(x * S, y * S, z * S);
    m.rotation.set(rx || 0, 0, rz || 0);
    peloSaya.add(m);
  };
  spike(0, 3.4, -0.4, 9, -0.15, 0);
  spike(-2.6, 2.8, -0.8, 8, -0.2, 0.5);
  spike(2.6, 2.8, -0.8, 8, -0.2, -0.5);
  spike(-1.4, 3.0, 1.6, 7, 0.5, 0.25);
  spike(1.4, 3.0, 1.6, 7, 0.5, -0.25);
  spike(0, 2.6, -2.4, 8, -0.7, 0);
  spike(-3.4, 1.8, 0.2, 7, 0, 0.95);
  spike(3.4, 1.8, 0.2, 7, 0, -0.95);
  peloSaya.visible = false;
  head.add(peloSaya);

  g.add(head, body, armR, armL, legR, legL);
  g.userData = { head, body, armR, armL, legR, legL, mat, peloSaya };
  return g;
}

// --- textura de la skin activa ---
let _tex = null;
let _texUrl = null;

export function currentSkinTexture() {
  const skin = state.skins.find((s) => s.id === state.skinActiva);
  const url = skin?.png || null;
  if (url === _texUrl && _tex) return _tex;
  _texUrl = url;
  if (_tex) _tex.dispose();
  const canvas = document.createElement('canvas');
  canvas.width = SKIN_W; canvas.height = SKIN_H;
  const ctx = canvas.getContext('2d');
  if (url) {
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, SKIN_W, SKIN_H); ctx.drawImage(img, 0, 0, SKIN_W, SKIN_H); _tex.needsUpdate = true; };
    img.src = url;
  } else {
    drawDefaultSkin(ctx);
  }
  _tex = new THREE.CanvasTexture(canvas);
  _tex.magFilter = THREE.NearestFilter;
  _tex.minFilter = THREE.NearestFilter;
  _tex.colorSpace = THREE.SRGBColorSpace;
  return _tex;
}

// mezcla un color hex con negro/blanco: k<0 oscurece, k>0 aclara
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('')}`;
}

export const PRESETS_SKIN = {
  clasico:  { piel: '#e8b98c', pelo: '#3a2a1a', ojos: '#4b3020', ropa: '#c0392b', pantalon: '#2b3a6b', zapato: '#241a12' },
  aventurera: { piel: '#f0c9a0', pelo: '#6b3410', ojos: '#3a6b3a', ropa: '#2e9e6b', pantalon: '#4a3520', zapato: '#1b1b1b' },
  heroe:    { piel: '#dca87c', pelo: '#1b1b1b', ojos: '#2b6bd0', ropa: '#2b4fd0', pantalon: '#1a1a2e', zapato: '#8a1e1e' },
  invierno: { piel: '#f2d2b6', pelo: '#8a6a3a', ojos: '#4b6b8a', ropa: '#8a4fd0', pantalon: '#3a4a5a', zapato: '#2a2a2a' },
};

// Dibuja una skin 64×64 con sombreado (caras laterales más oscuras, luz arriba).
export function paintSkin(ctx, p = PRESETS_SKIN.clasico) {
  ctx.clearRect(0, 0, SKIN_W, SKIN_H);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };

  const piel = p.piel, pielS = shade(piel, -0.16), pielL = shade(piel, 0.12);
  const pelo = p.pelo, peloS = shade(pelo, -0.25), peloL = shade(pelo, 0.18);
  const ropa = p.ropa, ropaS = shade(ropa, -0.2), ropaL = shade(ropa, 0.14);
  const pant = p.pantalon, pantS = shade(pant, -0.2);
  const zap = p.zapato;

  // ---- CABEZA ----
  // caras: front (8,8) left (16,8) right (0,8) back (24,8)  top (8,0) bottom (16,0)
  R(8, 8, 8, 8, piel);                 // cara
  R(0, 8, 8, 8, pielS); R(16, 8, 8, 8, pielS);   // orejas / laterales
  R(24, 8, 8, 8, pielS);               // nuca (piel bajo el pelo)
  // pelo
  R(8, 0, 8, 8, pelo);                 // top
  R(8, 8, 8, 3, pelo);                 // flequillo sobre la frente
  R(24, 8, 8, 5, pelo);                // pelo por detrás
  R(0, 8, 2, 8, peloS); R(22, 8, 2, 8, peloS);  // pelo en los lados
  for (let x = 8; x < 16; x++) px(x, 0, x % 2 ? peloL : pelo);
  // cara: rasgos
  R(9, 12, 2, 2, '#ffffff'); R(13, 12, 2, 2, '#ffffff');   // blanco de los ojos
  px(10, 12, p.ojos); px(14, 12, p.ojos);                   // iris
  px(9, 11, peloS); px(14, 11, peloS);                      // cejas
  px(12, 13, pielS);                                        // sombra de nariz
  R(11, 15, 3, 1, shade(piel, -0.28));                      // boca
  px(9, 14, pielL); px(14, 14, pielL);                      // pómulos

  // ---- CUERPO ---- front (20,20) back (32,20) right (16,20) left (28,20) top (20,16)
  R(20, 20, 8, 12, ropa);              // frente
  R(20, 16, 8, 4, ropaL);              // hombros (arriba)
  R(28, 16, 8, 4, ropaS);              // espalda arriba
  R(32, 20, 8, 12, ropaS);             // espalda
  R(16, 20, 4, 12, ropaS); R(28, 20, 4, 12, ropaS);   // costados
  R(23, 20, 2, 12, ropaL);             // cierre / franja central
  R(20, 20, 8, 2, shade(ropa, -0.28)); // cuello de la ropa
  R(20, 29, 8, 3, ropaS);              // borde inferior (sombra)

  // ---- BRAZO DERECHO ---- front (44,20) top (44,16) right (40,20) left (48,20) back (52,20)
  R(44, 16, 4, 4, pielL);              // tope (mano/hombro visto de arriba)
  R(44, 20, 4, 8, ropa);               // manga
  R(40, 20, 4, 8, ropaS); R(48, 20, 4, 8, ropaS); R(52, 20, 4, 8, ropaS);
  R(44, 28, 4, 4, piel);               // mano
  R(40, 28, 4, 4, pielS); R(48, 28, 4, 4, pielS); R(52, 28, 4, 4, pielS);

  // ---- BRAZO IZQUIERDO ---- front (36,52) top (36,48) right (32,52) left (40,52) back (44,52)
  R(36, 48, 4, 4, pielL);
  R(36, 52, 4, 8, ropa);
  R(32, 52, 4, 8, ropaS); R(40, 52, 4, 8, ropaS); R(44, 52, 4, 8, ropaS);
  R(36, 60, 4, 4, piel);
  R(32, 60, 4, 4, pielS); R(40, 60, 4, 4, pielS); R(44, 60, 4, 4, pielS);

  // ---- PIERNA DERECHA ---- front (4,20) top (4,16) right (0,20) left (8,20) back (12,20)
  R(4, 20, 4, 9, pant); R(0, 20, 4, 9, pantS); R(8, 20, 4, 9, pantS); R(12, 20, 4, 9, pantS);
  R(4, 29, 4, 3, zap);  R(0, 29, 4, 3, shade(zap, -0.2)); R(8, 29, 4, 3, shade(zap, -0.2)); R(12, 29, 4, 3, shade(zap, -0.2));
  R(4, 16, 4, 4, pantS);

  // ---- PIERNA IZQUIERDA ---- front (20,52) top (20,48) right (16,52) left (24,52) back (28,52)
  R(20, 52, 4, 9, pant); R(16, 52, 4, 9, pantS); R(24, 52, 4, 9, pantS); R(28, 52, 4, 9, pantS);
  R(20, 61, 4, 3, zap);  R(16, 61, 4, 3, shade(zap, -0.2)); R(24, 61, 4, 3, shade(zap, -0.2)); R(28, 61, 4, 3, shade(zap, -0.2));
  R(20, 48, 4, 4, pantS);

  // grano de ruido muy sutil
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 220; i++) px((Math.random() * SKIN_W) | 0, (Math.random() * SKIN_H) | 0, i % 2 ? '#000' : '#fff');
  ctx.globalAlpha = 1;
}

export function drawDefaultSkin(ctx) {
  paintSkin(ctx, PRESETS_SKIN.clasico);
}

// --- avatar en el juego (tercera persona) ---
let avatar = null;

export function applySkinToPlayer(player, scene) {
  const tex = currentSkinTexture();
  if (avatar) { scene.remove(avatar); }
  avatar = makeAvatar(tex);
  scene.add(avatar);
  player._avatar = avatar;
}

export function updateAvatar(player, dt, moving) {
  if (!avatar) return;
  avatar.visible = player._thirdPerson === true;
  if (!avatar.visible) return;
  avatar.position.set(player.pos.x, player.pos.y, player.pos.z);
  // el monigote mira hacia donde camina (su cara está en +z, así que +PI)
  avatar.rotation.y = player.yaw + Math.PI;
  const p = avatar.userData;
  const t = performance.now() / 140;
  const saya = (player._furiaT || 0) > 0;
  const arranque = (player._sayaStartT || 0) > 0;   // animación de transformación

  p.peloSaya.visible = saya;
  // brillo dorado en piel y ropa mientras dura el Súper Saya
  if (p.mat.emissive) {
    const glow = arranque ? 0x8a6b00 : saya ? 0x3a2d00 : 0x000000;
    p.mat.emissive.setHex(glow);
  }

  if (arranque) {
    // pose de carga: mira al cielo, brazos abajo y afuera, temblando por el esfuerzo
    const tr = Math.sin(performance.now() / 35) * 0.06;
    p.head.rotation.x = -0.65 + tr;
    p.body.rotation.x = -0.16;
    p.armR.rotation.set(0.15 + tr, 0, 0.6);
    p.armL.rotation.set(0.15 - tr, 0, -0.6);
    p.legR.rotation.x = 0.18; p.legL.rotation.x = -0.18;
  } else {
    const sw = moving ? Math.sin(t) * 0.5 : 0;
    p.head.rotation.x = 0;
    p.body.rotation.x = 0;
    p.armR.rotation.set(sw, 0, saya ? 0.14 : 0);
    p.armL.rotation.set(-sw, 0, saya ? -0.14 : 0);
    p.legR.rotation.x = -sw; p.legL.rotation.x = sw;
  }

  const opacity = player.invisible ? 0.15 : 1;
  p.mat.opacity = opacity; p.mat.transparent = opacity < 1 ? true : p.mat.transparent;
}
