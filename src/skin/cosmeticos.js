import * as THREE from 'three';

// Ropa y accesorios que se van desbloqueando a medida que subes de nivel
// (total de medallas bronce+plata+oro, igual que los poderes). 4 lugares:
// cabeza (gorros/sombreros), cuerpo (poleras/polerones/armaduras), piernas
// (pantalones) y cara (anteojos/máscaras). Se equipan desde "Personajes" y
// se ven puestos en el jugador (editor 3D y en el juego).

export const COSMETICOS = {
  // --- cabeza ---
  gorro_lana:  { slot: 'cabeza', nombre: 'Gorro de lana', emoji: '🧢', medallas: 1, color: 0xc0392b },
  gorra:       { slot: 'cabeza', nombre: 'Gorra',          emoji: '🧢', medallas: 4, color: 0x2b6bd0 },
  sombrero:    { slot: 'cabeza', nombre: 'Sombrero explorador', emoji: '🤠', medallas: 9, color: 0xb08a4e },
  casco:       { slot: 'cabeza', nombre: 'Casco de acero', emoji: '⛑️', medallas: 16, color: 0x9aa3ad },
  corona:      { slot: 'cabeza', nombre: 'Corona',          emoji: '👑', medallas: 26, color: 0xe8c440 },
  // --- cuerpo ---
  polera:      { slot: 'cuerpo', nombre: 'Polera a rayas',  emoji: '👕', medallas: 2, color: 0x2f8fd9 },
  poleron:     { slot: 'cuerpo', nombre: 'Polerón con capucha', emoji: '🧥', medallas: 6, color: 0x3a6b46 },
  armadura_cuero: { slot: 'cuerpo', nombre: 'Armadura de cuero', emoji: '🥋', medallas: 13, color: 0x8a5a2e },
  armadura_acero: { slot: 'cuerpo', nombre: 'Armadura de acero', emoji: '🛡️', medallas: 23, color: 0x8b93a0 },
  // --- piernas ---
  pantalon_cargo: { slot: 'piernas', nombre: 'Pantalón cargo', emoji: '👖', medallas: 3, color: 0x5a6b3a },
  pantalon_camuflado: { slot: 'piernas', nombre: 'Pantalón camuflado', emoji: '🎖️', medallas: 10, color: 0x4a5a3a },
  grebas:      { slot: 'piernas', nombre: 'Grebas de acero', emoji: '🦿', medallas: 20, color: 0x8b93a0 },
  // --- cara ---
  anteojos:    { slot: 'cara', nombre: 'Anteojos',          emoji: '👓', medallas: 5, color: 0x1b1b1b },
  antifaz:     { slot: 'cara', nombre: 'Antifaz de héroe',  emoji: '🦸', medallas: 8, color: 0x1b1b6b },
  goggles:     { slot: 'cara', nombre: 'Goggles explorador', emoji: '🥽', medallas: 15, color: 0x3a3a3a },
};

export const SLOTS = ['cabeza', 'cuerpo', 'piernas', 'cara'];
export const SLOT_NOMBRE = { cabeza: '🧢 Cabeza', cuerpo: '👕 Cuerpo', piernas: '👖 Piernas', cara: '👓 Cara' };

export function nivelTotal(state) {
  const m = state.medallas || {};
  return (m.bronce || 0) + (m.plata || 0) + (m.oro || 0);
}

export function cosmeticoDesbloqueado(id, state) {
  if (state.maestro) return true;
  const c = COSMETICOS[id];
  return !!c && nivelTotal(state) >= c.medallas;
}

export function equiparCosmetico(state, id) {
  const c = COSMETICOS[id];
  if (!c) return;
  state.cosmeticos = state.cosmeticos || { equipados: {} };
  state.cosmeticos.equipados = state.cosmeticos.equipados || {};
  // tocar el mismo ya puesto = quitárselo
  state.cosmeticos.equipados[c.slot] = state.cosmeticos.equipados[c.slot] === id ? null : id;
}

export function equipadoEn(state, slot) {
  return state.cosmeticos?.equipados?.[slot] || null;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, ...opts });
}
function metal(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.7 });
}

// --- cabeza: se agregan como hijos de `head` (centrado en su propio origen,
// caja de 0.48 de lado) ---
function mkGorroLana(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const copa = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), m);
  copa.position.y = 0.18;
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 16), m);
  borde.rotation.x = Math.PI / 2; borde.position.y = 0.24;
  const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffffff));
  pompon.position.y = 0.42;
  g.add(copa, borde, pompon);
  return g;
}
function mkGorra(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const copa = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m);
  copa.position.y = 0.19;
  const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, 0, Math.PI), m);
  visera.rotation.x = Math.PI / 2; visera.position.set(0, 0.17, 0.24);
  g.add(copa, visera);
  return g;
}
function mkSombrero(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 12), m);
  copa.position.y = 0.26;
  const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 20), m);
  ala.position.y = 0.15;
  g.add(copa, ala);
  return g;
}
function mkCasco(c) {
  const g = new THREE.Group();
  const m = metal(c.color);
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), m);
  cupula.position.y = 0.16;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), metal(0x2a2f36));
  visor.position.set(0, 0.02, 0.25);
  g.add(cupula, visor);
  return g;
}
function mkCorona(c) {
  const g = new THREE.Group();
  const m = metal(c.color);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 8, 20), m);
  aro.rotation.x = Math.PI / 2; aro.position.y = 0.24;
  const puntaGeo = new THREE.ConeGeometry(0.05, 0.16, 4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(puntaGeo, m);
    p.position.set(Math.cos(a) * 0.25, 0.34, Math.sin(a) * 0.25);
    g.add(p);
  }
  g.add(aro);
  return g;
}

// --- cuerpo: hijos de `body` (caja 0.48×0.72×0.24, origen al centro) ---
function mkPolera(c) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.27), mat(c.color));
  torso.position.y = 0.08;
  const franja = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.28), mat(0xffffff));
  franja.position.y = 0.02;
  g.add(torso, franja);
  return g;
}
function mkPoleron(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.74, 0.28), m);
  const capucha = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m);
  capucha.position.set(0, 0.42, -0.08); capucha.rotation.x = 0.3;
  const bolsillo = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.04), mat(_sombra(c.color)));
  bolsillo.position.set(0, -0.18, 0.16);
  g.add(torso, capucha, bolsillo);
  return g;
}
function mkArmaduraCuero(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const peto = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.7, 0.3), m);
  const hL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.32), m); hL.position.set(-0.32, 0.28, 0);
  const hR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.32), m); hR.position.set(0.32, 0.28, 0);
  const cinturon = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.32), mat(0x4a2f1a));
  cinturon.position.y = -0.3;
  g.add(peto, hL, hR, cinturon);
  return g;
}
function mkArmaduraAcero(c) {
  const g = new THREE.Group();
  const m = metal(c.color);
  const peto = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.3), m);
  const hL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 4), m); hL.position.set(-0.33, 0.3, 0); hL.rotation.z = -0.3;
  const hR = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 4), m); hR.position.set(0.33, 0.3, 0); hR.rotation.z = 0.3;
  const franja = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.32), metal(0xffd166));
  g.add(peto, hL, hR, franja);
  return g;
}

// --- piernas: hijos de legR/legL (cápsula, radio 0.12, largo 0.24) ---
function mkPantalon(color) {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 4, 8), mat(color));
  g.add(cover);
  return g;
}
function mkGrebas(color) {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 4, 8), metal(color));
  const rodillera = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), metal(color));
  rodillera.position.y = 0.12;
  g.add(cover, rodillera);
  return g;
}

// --- cara: hijos de `head`, delante de los ojos ---
function mkAnteojos(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const marco = (x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 14), m); r.position.set(x, 0, 0.22); return r; };
  const puente = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.014, 0.014), m);
  puente.position.set(0, 0, 0.22);
  g.add(marco(-0.11), marco(0.11), puente);
  return g;
}
function mkAntifaz(c) {
  const g = new THREE.Group();
  const banda = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.06), mat(c.color));
  banda.position.set(0, 0.02, 0.22);
  g.add(banda);
  return g;
}
function mkGoggles(c) {
  const g = new THREE.Group();
  const m = mat(c.color);
  const lente = (x) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), mat(0x9fe8ff, { transparent: true, opacity: 0.75 })); l.rotation.x = Math.PI / 2; l.position.set(x, 0, 0.22); return l; };
  const banda = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 12, Math.PI), m);
  banda.rotation.y = Math.PI / 2; banda.position.set(0, 0, -0.02);
  g.add(lente(-0.11), lente(0.11), banda);
  return g;
}

function _sombra(hex) {
  const r = ((hex >> 16) & 255) * 0.7, g = ((hex >> 8) & 255) * 0.7, b = (hex & 255) * 0.7;
  return (r << 16) | (g << 8) | b;
}

const BUILDERS = {
  gorro_lana: mkGorroLana, gorra: mkGorra, sombrero: mkSombrero, casco: mkCasco, corona: mkCorona,
  polera: mkPolera, poleron: mkPoleron, armadura_cuero: mkArmaduraCuero, armadura_acero: mkArmaduraAcero,
  pantalon_cargo: (c) => mkPantalon(c.color), pantalon_camuflado: (c) => mkPantalon(c.color), grebas: (c) => mkGrebas(c.color),
  anteojos: mkAnteojos, antifaz: mkAntifaz, goggles: mkGoggles,
};

// arma la malla de un cosmético equipado. Devuelve null si no hay builder.
export function makeCosmeticoMesh(id) {
  const c = COSMETICOS[id];
  const fn = c && BUILDERS[id];
  return fn ? fn(c) : null;
}
