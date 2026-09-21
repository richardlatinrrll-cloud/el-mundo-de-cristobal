import * as THREE from 'three';
import { matCriatura } from '../../engine/creature-parts.js';

// Modelos propios y más detallados para los alienígenas del Ovnitrix (y los
// enemigos "espécimen" que los dan). Cada uno tiene una silueta distinta,
// no el humanoide genérico. Se usan tanto para el enemigo salvaje
// (game/mobs.js `makeMesh`) como para la transformación del jugador
// (main.js), así se ve igual lo que derrotaste y en lo que te conviertes.
//
// Todas devuelven un THREE.Group con `userData = { body, mats, brazos: null,
// brazos4: null }` para ser compatibles con la animación y el flash de golpe
// que ya usa game/mobs.js (MobField.update).

function partesComunes() {
  const mats = [];
  const mat = (color) => { const m = matCriatura(color); mats.push(m); return m; };
  const glow = (color) => new THREE.MeshBasicMaterial({ color });
  return { mats, mat, glow };
}

function ojos(g, eyeColor, size, pos) {
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
  const eL = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.06), eyeMat);
  const eR = eL.clone();
  eL.position.set(-pos[0], pos[1], pos[2]);
  eR.position.set(pos[0], pos[1], pos[2]);
  g.add(eL, eR);
}

// --- Calorox: fuego, corona de llamas ---
function calorox(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat, glow } = partesComunes();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.85 * s, 0.42 * s), mat(color));
  body.position.y = 0.7 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46 * s, 0.42 * s, 0.44 * s), mat(color));
  head.position.y = 1.34 * s;
  const legGeo = new THREE.BoxGeometry(0.2 * s, 0.5 * s, 0.2 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.15 * s, 0.25 * s, 0);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.15 * s, 0.25 * s, 0);
  const flameMat = glow(eye);
  const flama = (x, y, z, h, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, h * s, 6), flameMat);
    m.position.set(x * s, y * s, z * s); m.rotation.set(rx, 0, rz);
    g.add(m);
  };
  flama(0, 1.72, 0, 0.55, 0, 0);
  flama(-0.16, 1.6, -0.05, 0.4, -0.1, 0.35);
  flama(0.16, 1.6, -0.05, 0.4, -0.1, -0.35);
  flama(-0.34, 0.95, 0, 0.32, 0, 0.6);
  flama(0.34, 0.95, 0, 0.32, 0, -0.6);
  ojos(g, eye, 0.1 * s, [0.13 * s, 1.4 * s, 0.23 * s]);
  g.add(body, head, lL, lR);
  g.userData = { body, mats, brazos: null, brazos4: null };
  return g;
}

// --- Rafaguero: cuerpo aerodinámico inclinado, aletas de velocidad ---
function rafaguero(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat } = partesComunes();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.55 * s, 0.85 * s), mat(color));
  body.position.set(0, 0.62 * s, 0.05 * s);
  body.rotation.x = -0.18;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.24 * s, 0.55 * s, 4), mat(color));
  head.rotation.x = Math.PI / 2; head.rotation.y = Math.PI / 4;
  head.position.set(0, 0.95 * s, 0.55 * s);
  const finGeo = new THREE.BoxGeometry(0.06 * s, 0.3 * s, 0.55 * s);
  const finL = new THREE.Mesh(finGeo, mat(color)); finL.position.set(-0.26 * s, 0.68 * s, -0.15 * s); finL.rotation.z = 0.5;
  const finR = new THREE.Mesh(finGeo, mat(color)); finR.position.set(0.26 * s, 0.68 * s, -0.15 * s); finR.rotation.z = -0.5;
  const legGeo = new THREE.BoxGeometry(0.14 * s, 0.42 * s, 0.14 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.12 * s, 0.21 * s, -0.1 * s);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.12 * s, 0.21 * s, -0.1 * s);
  ojos(g, eye, 0.09 * s, [0.1 * s, 0.95 * s, 0.72 * s]);
  g.add(body, head, finL, finR, lL, lR);
  g.userData = { body, mats, brazos: null, brazos4: null };
  return g;
}

// --- Diamantoide: cuerpo pesado y anguloso tallado como una gema, facetas
// brillantes (pesado y resistente, no ágil — ver stats en ovnitrix.js) ---
function diamantoide(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat, glow } = partesComunes();
  const gemaMat = () => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.12, metalness: 0.1 }); mats.push(m); return m; };
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.95 * s, 0.55 * s, 0.75 * s), gemaMat());
  base.position.set(0, 0.32 * s, 0); base.rotation.y = 0.2;
  const medio = new THREE.Mesh(new THREE.OctahedronGeometry(0.44 * s), gemaMat());
  medio.position.set(0.04 * s, 0.78 * s, -0.02 * s); medio.rotation.y = -0.15;
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * s), gemaMat());
  head.position.set(-0.03 * s, 1.24 * s, 0); head.rotation.y = 0.1;
  const brazoGeo = new THREE.BoxGeometry(0.3 * s, 0.4 * s, 0.3 * s);
  const bL = new THREE.Mesh(brazoGeo, gemaMat()); bL.position.set(-0.58 * s, 0.6 * s, 0); bL.rotation.z = 0.15;
  const bR = new THREE.Mesh(brazoGeo, gemaMat()); bR.position.set(0.58 * s, 0.6 * s, 0); bR.rotation.z = -0.15;
  // facetas talladas: triángulos delgados que brillan, como el filo de una gema
  const facetaMat = glow(0xffffff);
  const faceta = (x, y, z, w, h, rz) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(w * s, h * s, 3), facetaMat);
    m.position.set(x * s, y * s, z * s); m.rotation.z = rz || 0; m.rotation.x = Math.PI / 2;
    g.add(m);
  };
  faceta(-0.12, 1.26, 0.3, 0.08, 0.14, 0.3);
  faceta(0.14, 1.22, 0.28, 0.07, 0.12, -0.4);
  faceta(-0.22, 0.36, 0.4, 0.09, 0.16, 0.5);
  g.add(base, medio, head, bL, bR);
  g.userData = { body: medio, mats, brazos: null, brazos4: null };
  return g;
}

// --- Voltarión: núcleo eléctrico, rayos en zigzag ---
function voltarion(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat, glow } = partesComunes();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.8 * s, 0.42 * s), mat(color));
  body.position.y = 0.75 * s;
  const nucleo = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * s), glow(eye));
  nucleo.position.set(0, 0.8 * s, 0.23 * s);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.38 * s, 0.4 * s), mat(color));
  head.position.y = 1.32 * s;
  const legGeo = new THREE.BoxGeometry(0.16 * s, 0.5 * s, 0.16 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.14 * s, 0.25 * s, 0);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.14 * s, 0.25 * s, 0);
  const rayoMat = glow(eye);
  const rayo = (x, y, z, rz) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.26 * s, 0.05 * s), rayoMat);
    a.position.set(x * s, y * s, z * s); a.rotation.z = rz;
    const b = a.clone(); b.position.y += 0.14 * s; b.rotation.z = -rz;
    g.add(a, b);
  };
  rayo(0, 1.6, 0, 0.5);
  rayo(-0.2, 1.02, 0.18, -0.6);
  rayo(0.24, 1.0, -0.14, 0.6);
  ojos(g, eye, 0.09 * s, [0.11 * s, 1.36 * s, 0.21 * s]);
  g.add(body, nucleo, head, lL, lR);
  g.userData = { body, mats, brazos: null, brazos4: null };
  return g;
}

// --- Sombrizo: cuerpo fantasma, sin piernas, cola difuminada ---
function sombrizo(s, color, eye) {
  const g = new THREE.Group();
  const { mats } = partesComunes();
  const velo = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.15 * s, 8, 1, true),
    matCriatura(color, { transparent: true, opacity: 0.72 }));
  mats.push(velo.material);
  velo.rotation.x = Math.PI; velo.position.y = 0.85 * s;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 12, 8),
    matCriatura(color, { transparent: true, opacity: 0.85 }));
  mats.push(cabeza.material);
  cabeza.position.y = 1.32 * s;
  const jironGeo = new THREE.ConeGeometry(0.1 * s, 0.35 * s, 5, 1, true);
  const jMat = matCriatura(color, { transparent: true, opacity: 0.55 });
  mats.push(jMat);
  for (const [x, z] of [[-0.18, 0], [0, 0.05], [0.18, 0]]) {
    const j = new THREE.Mesh(jironGeo, jMat);
    j.position.set(x * s, 0.16 * s, z * s);
    g.add(j);
  }
  ojos(g, eye, 0.1 * s, [0.11 * s, 1.36 * s, 0.24 * s]);
  g.add(velo, cabeza);
  g.userData = { body: velo, mats, brazos: null, brazos4: null };
  return g;
}

// --- Congelim: cristales de hielo angulares ---
function congelim(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat } = partesComunes();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.38 * s), mat(color));
  core.position.y = 0.75 * s; core.rotation.y = 0.4;
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.26 * s), mat(color));
  head.position.y = 1.35 * s;
  const shardGeo = new THREE.ConeGeometry(0.08 * s, 0.4 * s, 5);
  const shardMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mats.push(shardMat);
  const shard = (x, y, z, rx, rz) => {
    const m = new THREE.Mesh(shardGeo, shardMat);
    m.position.set(x * s, y * s, z * s); m.rotation.set(rx, 0, rz);
    g.add(m);
  };
  shard(0, 1.68, 0, 0, 0);
  shard(-0.34, 0.85, 0, 0, 1.3);
  shard(0.34, 0.85, 0, 0, -1.3);
  shard(0, 0.45, 0.3, -1.0, 0);
  const legGeo = new THREE.BoxGeometry(0.16 * s, 0.42 * s, 0.16 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.14 * s, 0.21 * s, 0);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.14 * s, 0.21 * s, 0);
  ojos(g, eye, 0.09 * s, [0.1 * s, 1.38 * s, 0.2 * s]);
  g.add(core, head, lL, lR);
  g.userData = { body: core, mats, brazos: null, brazos4: null };
  return g;
}

// --- Alado: alas grandes, cuerpo liviano ---
function alado(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat } = partesComunes();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.62 * s, 0.36 * s), mat(color));
  body.position.y = 0.68 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36 * s, 0.34 * s, 0.4 * s), mat(color));
  head.position.set(0, 1.14 * s, 0.06 * s);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.08 * s, 0.22 * s, 4), mat(color));
  pico.rotation.x = Math.PI / 2; pico.position.set(0, 1.1 * s, 0.32 * s);
  const wingGeo = new THREE.BoxGeometry(0.75 * s, 0.05 * s, 0.4 * s);
  const wingMat = mat(color);
  const wL = new THREE.Mesh(wingGeo, wingMat); wL.position.set(-0.62 * s, 0.85 * s, -0.05 * s); wL.rotation.z = 0.35; wL.rotation.y = 0.25;
  const wR = new THREE.Mesh(wingGeo, wingMat); wR.position.set(0.62 * s, 0.85 * s, -0.05 * s); wR.rotation.z = -0.35; wR.rotation.y = -0.25;
  g.userData.alas = [wL, wR];
  const legGeo = new THREE.BoxGeometry(0.13 * s, 0.4 * s, 0.13 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.12 * s, 0.2 * s, 0);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.12 * s, 0.2 * s, 0);
  ojos(g, eye, 0.09 * s, [0.1 * s, 1.16 * s, 0.24 * s]);
  g.add(body, head, pico, wL, wR, lL, lR);
  g.userData = { body, mats, brazos: null, brazos4: null, alas: [wL, wR] };
  return g;
}

// --- Elastiko: cuerpo alto y flaco, extremidades en segmentos (elástico) ---
function elastiko(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat } = partesComunes();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 1.5 * s, 0.34 * s), mat(color));
  body.position.y = 1.1 * s;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44 * s, 0.4 * s, 0.4 * s), mat(color));
  head.position.y = 2.05 * s;
  const segGeo = new THREE.BoxGeometry(0.14 * s, 0.28 * s, 0.14 * s);
  const cadena = (x0, y0, z0, n, dy) => {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(segGeo, mat(color));
      m.position.set(x0 * s, (y0 + i * dy) * s, z0 * s);
      g.add(m);
    }
  };
  cadena(-0.32, 1.55, 0, 4, -0.3);   // brazo izq
  cadena(0.32, 1.55, 0, 4, -0.3);    // brazo der
  cadena(-0.14, 0.35, 0, 2, -0.3);   // pierna izq
  cadena(0.14, 0.35, 0, 2, -0.3);    // pierna der
  ojos(g, eye, 0.11 * s, [0.13 * s, 2.1 * s, 0.22 * s]);
  g.add(body, head);
  g.userData = { body, mats, brazos: null, brazos4: null };
  return g;
}

// --- Espinoide: cuerpo redondo, púas hacia todos lados ---
function espinoide(s, color, eye) {
  const g = new THREE.Group();
  const { mats, mat } = partesComunes();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 12, 10), mat(color));
  body.position.y = 0.7 * s;
  const spikeGeo = new THREE.ConeGeometry(0.09 * s, 0.34 * s, 6);
  const spikeMat = mat(color);
  const dirs = [
    [0, 1, 0], [0, -0.3, 1], [0, -0.3, -1], [1, -0.2, 0], [-1, -0.2, 0],
    [0.7, 0.7, 0.7], [-0.7, 0.7, 0.7], [0.7, 0.7, -0.7], [-0.7, 0.7, -0.7],
  ];
  for (const [dx, dy, dz] of dirs) {
    const v = new THREE.Vector3(dx, dy, dz).normalize();
    const m = new THREE.Mesh(spikeGeo, spikeMat);
    m.position.set(v.x * 0.45 * s + 0 , 0.7 * s + v.y * 0.45 * s, v.z * 0.45 * s);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    g.add(m);
  }
  const legGeo = new THREE.BoxGeometry(0.16 * s, 0.35 * s, 0.16 * s);
  const lL = new THREE.Mesh(legGeo, mat(color)); lL.position.set(-0.16 * s, 0.18 * s, 0);
  const lR = new THREE.Mesh(legGeo, mat(color)); lR.position.set(0.16 * s, 0.18 * s, 0);
  ojos(g, eye, 0.1 * s, [0.14 * s, 0.75 * s, 0.4 * s]);
  g.add(body, lL, lR);
  g.userData = { body, mats, brazos: null, brazos4: null };
  return g;
}

const BUILDERS = { calorox, rafaguero, diamantoide, voltarion, sombrizo, congelim, alado, elastiko, espinoide };

export function tieneModeloPropio(forma) {
  return !!BUILDERS[forma];
}

export function makeAlienMesh(def) {
  const fn = BUILDERS[def.forma];
  return fn(def.size, def.color, def.eye);
}
