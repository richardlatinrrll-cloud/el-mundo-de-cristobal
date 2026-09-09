import * as THREE from 'three';
import './style.css';
import { World, CHUNK, TIPOS } from './engine/world.js';
import { buildChunkGeometry } from './engine/mesher.js';
import { buildAtlas, BLOCKS, PLACEABLES, blockName, blockEmoji, dropFor, AIR } from './engine/blocks.js';
import { Player } from './engine/player.js';
import { Controls } from './engine/controls.js';
import { state, save, LIMITE_EDITS } from './game/state.js';
import { POWERS, powerById, poderDesbloqueado } from './game/powers/registry.js';
import { mountMenu } from './ui/menu.js';
import { openQuiz } from './quiz/quiz-ui.js';
import { mountAprender } from './quiz/progress-ui.js';
import { mountPoderes } from './game/power-hud.js';
import { mountPersonajes } from './skin/skin-editor.js';
import { applySkinToPlayer, updateAvatar } from './skin/skin-model.js';
import { MobField } from './game/mobs.js';
import { BossArena } from './game/bosses.js';
import { AnimalField } from './game/animals.js';
import { mountMundos } from './ui/mundos.js';
import { mountAjustes } from './ui/ajustes.js';
import { mountCrafteo } from './ui/crafteo.js';
import { mountTablero } from './ui/tablero.js';
import { mountPruebas } from './ui/pruebas.js';
import { mountGemas, dibujarMiniMapa } from './ui/gemas.js';
import { GemQuest, GEMAS, aplicarGemas } from './game/gemas.js';
import { COMIDA, reduccionArmadura, ARMADURA_JEFE } from './game/recetas.js';
import { mountClave, claveDesbloqueada } from './ui/clave.js';
import { audio } from './game/audio.js';
import { DayNight } from './game/daynight.js';
import { TOOLS, tool, tiempoRomper, danoGolpe } from './game/tools.js';
import { ViewModel } from './game/viewmodel.js';
import { toast } from './ui/toast.js';

const app = document.getElementById('app');

// kit de bloques con que empieza un mundo nuevo normal
const KIT_INICIAL = { 2: 20, 3: 20, 4: 12, 7: 12, 9: 8 };

// El audio necesita un gesto del usuario para arrancar (regla de los navegadores)
function arrancarAudio() {
  audio.init();
  audio.resume();
  audio.startMusic();
}
addEventListener('pointerdown', arrancarAudio, { once: true });
addEventListener('touchend', arrancarAudio, { once: true });
addEventListener('keydown', arrancarAudio, { once: true });
// clic suave para los botones del menú
addEventListener('click', (e) => { if (e.target.closest('.btn')) audio.sfx('menu'); });

// ---------- Three.js setup ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x8fc7ff);
app.appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fc7ff, 40, 110);
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
scene.add(camera);   // para que se rendericen los hijos de la cámara (modelo de arma)

const viewModel = new ViewModel(camera);
function vmSwing() { viewModel.swing(); }
function vmSetTool(id) { viewModel.setTool(id, state.poderEquipado); }

const dayNight = new DayNight(scene, renderer);

// Atlas de texturas
const atlas = buildAtlas();
const atlasTex = new THREE.CanvasTexture(atlas.canvas);
atlasTex.flipY = false; // el atlas se dibuja con la fila 0 (cara superior) arriba
atlasTex.magFilter = THREE.NearestFilter;
atlasTex.minFilter = THREE.NearestFilter;
atlasTex.colorSpace = THREE.SRGBColorSpace;

const matOpaque = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true });
const matTrans = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide });
const matGlow = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true }); // lava: brilla siempre

// ---------- Mundo (malla por chunks) ----------
let world;
const chunkMeshes = new Map(); // "cx,cz" -> { opaque, trans }

function disposeChunk(key) {
  const c = chunkMeshes.get(key);
  if (!c) return;
  for (const m of ['opaque', 'trans', 'glow']) if (c[m]) { scene.remove(c[m]); c[m].geometry.dispose(); }
  chunkMeshes.delete(key);
}
function clearAllChunks() {
  for (const key of [...chunkMeshes.keys()]) disposeChunk(key);
}
function buildChunk(key) {
  const [cx, cz] = key.split(',').map(Number);
  world.dirtyChunks.delete(key);
  if (cx < 0 || cz < 0 || cx * CHUNK >= world.SX || cz * CHUNK >= world.SZ) { disposeChunk(key); return; }
  const geos = buildChunkGeometry(world, cx, cz);
  disposeChunk(key);
  const rec = { opaque: null, trans: null, glow: null };
  const mats = { opaque: matOpaque, trans: matTrans, glow: matGlow };
  for (const m of ['opaque', 'trans', 'glow']) {
    const g = geos[m];
    if (g.attributes.position && g.attributes.position.count) {
      rec[m] = new THREE.Mesh(g, mats[m]); scene.add(rec[m]);
    } else g.dispose();
  }
  chunkMeshes.set(key, rec);
}
// distancia de render en chunks (menos en móvil)
const RENDER_DIST = matchMedia('(pointer: coarse)').matches ? 7 : 10;
const KEEP_DIST = RENDER_DIST + 2;
let _lastPcx = -999, _lastPcz = -999;

// Malla solo los chunks cercanos al jugador; descarga los lejanos.
function streamChunks(force = false) {
  if (!world || !player) return;
  const pcx = Math.floor(player.pos.x / CHUNK);
  const pcz = Math.floor(player.pos.z / CHUNK);
  const movió = pcx !== _lastPcx || pcz !== _lastPcz;
  if (!force && !movió && !world.dirtyChunks.size) return;
  _lastPcx = pcx; _lastPcz = pcz;

  const maxCx = Math.ceil(world.SX / CHUNK), maxCz = Math.ceil(world.SZ / CHUNK);

  // descargar lejanos
  for (const key of [...chunkMeshes.keys()]) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - pcx) > KEEP_DIST || Math.abs(cz - pcz) > KEEP_DIST) disposeChunk(key);
  }

  // construir cercanos que falten (de dentro hacia afuera)
  const faltan = [];
  for (let r = 0; r <= RENDER_DIST; r++) {
    for (let cx = pcx - r; cx <= pcx + r; cx++)
      for (let cz = pcz - r; cz <= pcz + r; cz++) {
        if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) !== r) continue;
        if (cx < 0 || cz < 0 || cx >= maxCx || cz >= maxCz) continue;
        const key = cx + ',' + cz;
        if (!chunkMeshes.has(key) || world.dirtyChunks.has(key)) faltan.push(key);
      }
  }
  const budget = force ? Math.min(faltan.length, 170) : 4;
  for (let i = 0; i < Math.min(budget, faltan.length); i++) buildChunk(faltan[i]);
}

let worldSig = '';
let _tableroGuia = null;   // receta elegida en el libro para armar en el tablero
function crearMundo() {
  clearAllChunks();
  world = new World({
    tipo: state.mundo.tipo, tamano: state.mundo.tamano,
    semilla: state.mundo.semilla, edits: state.mundoEdits,
  });
  worldSig = `${state.mundo.tipo}|${state.mundo.tamano}|${state.mundo.semilla}`;
  if (player) player.world = world;
  if (mobs) mobs.world = world;
  if (bosses) bosses.world = world;
  if (animals) animals.world = world;
  if (gemas) gemas.world = world;
  scene.fog.far = Math.max(120, Math.min(320, world.SX * 0.7));
  dayNight._apply();          // el color de cielo lo maneja el ciclo día/noche
  streamChunks(true);         // mallar solo lo cercano al jugador
  // mundo nuevo normal sin bloques todavía => dar un kit para empezar
  if (!state.mundo.creador &&
      Object.keys(state.inventario).length === 0 &&
      Object.keys(state.mundoEdits).length === 0) {
    darKitInicial();
  }
}

// registrar lo que el jugador construye/rompe (para que se guarde)
let saveTimer = null, avisoTope = false;
function registrarEdit(x, y, z, id) {
  if (Object.keys(state.mundoEdits).length >= LIMITE_EDITS && !(x + ',' + y + ',' + z in state.mundoEdits)) {
    if (!avisoTope) { toast('Límite de construcción alcanzado en este mundo'); avisoTope = true; }
    return;
  }
  state.mundoEdits[x + ',' + y + ',' + z] = id;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1200);
}

// ---------- Jugador, enemigos y jefes ----------
let player, mobs, bosses, animals, gemas;
let hotIndex = 0;

crearMundo();                       // crea `world` + malla + color de cielo

player = new Player(world, camera);
mobs = new MobField(world, scene);
bosses = new BossArena(world, scene);
animals = new AnimalField(world, scene);
gemas = new GemQuest(world, scene);
bosses.onMinion = (pos) => mobs.spawnAt(pos, 'sombra');
bosses.onHud = () => updateBossBar();
gemas.onMinion = (pos) => mobs.spawnAt(pos, 'sombra');
gemas.onHud = () => updateBossBar();
gemas.onCollect = () => { aplicarPoderEquipado(); updateToolChip(); updateHotbar(); };
player.onDañar = (n, motivo) => dañarJugador(n, motivo);
animals.onBotin = (botin, nombre) => {
  const partes = [];
  for (const [k, v] of Object.entries(botin)) { invAdd(k, v); partes.push(`${v} ${k}`); }
  toast(`🥩 ${nombre}: +${partes.join(', ')}`, 1400);
};
player.spawnOnSurface();

// resaltado del bloque apuntado
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x000000 })
);
highlight.visible = false;
scene.add(highlight);

// "grieta" que crece mientras minas un bloque
const grieta = new THREE.Mesh(
  new THREE.BoxGeometry(1.04, 1.04, 1.04),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
);
grieta.visible = false;

// Rayos de la Visión láser: dos haces rojos SÓLIDOS desde los ojos hacia la mira.
// Solo un instante al pulsar ✨ (no en el botón de la herramienta). En 1ª y 3ª persona.
const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1a10, depthWrite: false });
function mkBeam() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), laserMat));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0.35, depthWrite: false })));
  g.frustumCulled = false; g.renderOrder = 998; g.visible = false;
  scene.add(g);
  return g;
}
const laserL = mkBeam(), laserR = mkBeam();
const laserPunto = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10),
  new THREE.MeshBasicMaterial({ color: 0xff3a1a, depthWrite: false }));
laserPunto.renderOrder = 999; laserPunto.visible = false; scene.add(laserPunto);
const _lYup = new THREE.Vector3(0, 1, 0);

function actualizarLaser() {
  const on = mode === 'jugar' && _laserT > 0;
  if (!on) { laserL.visible = laserR.visible = laserPunto.visible = false; return; }
  const r = player.raycast(16);
  // dirección desde la mirada del jugador (sirve en 1ª y 3ª persona)
  const dirLook = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, player.yaw, 0, 'YXZ'));
  const eyeC = new THREE.Vector3(player.pos.x, player.pos.y + player.eye, player.pos.z);
  const target = r
    ? new THREE.Vector3(r.hit.x + 0.5, r.hit.y + 0.5, r.hit.z + 0.5)
    : eyeC.clone().addScaledVector(dirLook, 12);
  for (const [beam, s] of [[laserL, -1], [laserR, 1]]) {
    // arranca bien adelante del ojo para que no se vea gigante pegado a la cámara
    const eye = eyeC.clone().addScaledVector(dirLook, 0.9).addScaledVector(right, 0.14 * s).addScaledVector(_lYup, -0.04);
    const dir = target.clone().sub(eye);
    const len = dir.length();
    dir.normalize();
    beam.position.copy(eye).addScaledVector(dir, len / 2);
    beam.quaternion.setFromUnitVectors(_lYup, dir);
    beam.scale.set(0.035, len, 0.035);
    beam.visible = true;
  }
  laserPunto.position.copy(target);
  laserPunto.visible = true;
}
scene.add(grieta);

// ---------- flechas (arco) ----------
const flechas = [];
const flechaGeo = new THREE.BoxGeometry(0.08, 0.08, 0.6);
const flechaMat = new THREE.MeshBasicMaterial({ color: 0x6b4a2f });
let _disparoCd = 0;
function disparar() {
  if (_disparoCd > 0) return;
  if (!state.mundo.creador) {
    if ((state.inventario.flecha || 0) <= 0) { toast('Sin flechas. Fabrica más 🏹', 1100); return; }
    state.inventario.flecha--;
    if (state.inventario.flecha <= 0) delete state.inventario.flecha;
  }
  _disparoCd = 0.5;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const m = new THREE.Mesh(flechaGeo, flechaMat);
  m.position.copy(camera.position).addScaledVector(dir, 0.6);
  m.quaternion.copy(camera.quaternion);
  scene.add(m);
  flechas.push({ mesh: m, vel: dir.clone().multiplyScalar(38), vida: 3 });
  audio.sfx('poder');
}
function actualizarFlechas(dt) {
  for (let i = flechas.length - 1; i >= 0; i--) {
    const a = flechas[i];
    a.vida -= dt;
    a.vel.y -= 22 * dt;
    a.mesh.position.addScaledVector(a.vel, dt);
    a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), a.vel.clone().normalize());
    const p = a.mesh.position;
    let quitar = a.vida <= 0;
    // choque con bloque
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    if (BLOCKS[world.get(bx, by, bz)] && world.get(bx, by, bz) !== 10) quitar = true;
    // choque con enemigo / jefe (mira desde la punta de la flecha)
    if (!quitar) {
      const fakeCam = { position: p, quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), a.vel.clone().normalize()) };
      if (bosses.golpear(fakeCam, 1.6, 6) || gemas.golpear(fakeCam, 1.6, 6) || mobs.golpear(fakeCam, 1.6, 5) || animals.golpear(fakeCam, 1.6, 5)) { quitar = true; audio.sfx('golpe'); }
    }
    if (quitar) { scene.remove(a.mesh); flechas.splice(i, 1); }
  }
  _disparoCd = Math.max(0, _disparoCd - dt);
}

// ---------- HUD (debe existir antes de crear los controles táctiles) ----------
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="crosshair"></div>
  <button class="btn-back">☰ Menú</button>
  <button class="btn-craft" title="Crafteo (Q)">🔨</button>
  <button class="btn-gemas" title="Mini-mapa de gemas (G)">🔮</button>
  <div class="power-picker">
    <div class="pp-label">Poder</div>
    <button class="power-badge"><span class="dot"></span><span class="pb-name">Sin poder</span><span class="pb-arrow">▾</span></button>
    <div class="power-list" hidden></div>
  </div>
  <div class="vida-row">
    <div class="hearts"></div>
    <span class="arm-badge" hidden>🛡️ <span class="arm-n">0</span></span>
  </div>
  <canvas class="mini-mapa" width="150" height="150" hidden></canvas>
  <button class="btn-comer" hidden>🍖 Comer</button>
  <div class="mob-badge" hidden>👤 <span class="mb-n">0</span> enemigo(s) persiguiéndote</div>
  <div class="modo-badge" hidden>🎨 Modo creador</div>
  <div class="boss-bar" hidden>
    <div class="boss-name">Jefe</div>
    <div class="boss-hp"><i></i></div>
  </div>
  <button class="tool-chip" title="Cambiar herramienta (T)">✋ <span class="tc-name">Mano</span></button>
  <div class="hotbar"></div>
`;
app.appendChild(hud);

const touch = document.createElement('div');
touch.id = 'touch';
touch.innerHTML = `
  <div class="stick"><div class="nub"></div></div>
  <div class="tbtns">
    <div class="tbtn t-view">👁️</div>
    <div class="tbtn t-power">✨</div>
    <div class="tbtn t-break">⛏️</div>
    <div class="tbtn t-place">🧱</div>
    <div class="tbtn t-jump">⤒</div>
  </div>
`;
app.appendChild(touch);

// aviso "gira el teléfono" (solo móvil en vertical durante el juego)
const rotar = document.createElement('div');
rotar.id = 'rotar';
rotar.innerHTML = `<div class="ico">📱</div><h2>Gira el teléfono</h2>
  <p class="sub">El juego se ve mucho mejor en horizontal.</p>`;
app.appendChild(rotar);
function checkOrientacion() {
  const esMovil = matchMedia('(pointer: coarse)').matches;
  const vertical = innerHeight > innerWidth;
  rotar.classList.toggle('show', esMovil && vertical && mode === 'jugar');
}
addEventListener('resize', checkOrientacion);
addEventListener('orientationchange', () => setTimeout(checkOrientacion, 200));
touch.querySelector('.t-view').addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (mode === 'jugar') player._thirdPerson = !player._thirdPerson;
}, { passive: false });

hud.querySelector('.btn-back').addEventListener('click', () => showMenu());
hud.querySelector('.btn-craft').addEventListener('click', () => abrirCrafteoEnJuego());
hud.querySelector('.btn-gemas').addEventListener('click', () => toggleMiniMapa());
hud.querySelector('.btn-comer').addEventListener('click', () => comer());

// ---------- Mini-mapa (transparente, no pausa el juego) ----------
const miniMapa = hud.querySelector('.mini-mapa');
const miniCtx = miniMapa.getContext('2d');
let _miniCd = 0;
function toggleMiniMapa() { miniMapa.hidden = !miniMapa.hidden; audio.sfx('menu'); }
function updateMiniMapa(dt) {
  if (miniMapa.hidden || mode !== 'jugar') return;
  _miniCd -= dt;
  if (_miniCd > 0) return;
  _miniCd = 0.35;
  dibujarMiniMapa(miniCtx, miniMapa.width, miniMapa.height, world, player, { grid: false });
}
addEventListener('keydown', (e) => { if (mode === 'jugar' && e.code === 'KeyG' && hud.style.display === 'block') toggleMiniMapa(); });
addEventListener('keydown', (e) => { if (mode === 'jugar' && e.code === 'KeyF' && hud.style.display === 'block') comer(); });

// ---------- Inventario ----------
function darKitInicial() {
  state.inventario = { ...KIT_INICIAL };
  if (!state.herramientas.includes('pico_madera')) state.herramientas.push('pico_madera');
  state.herramienta = 'pico_madera';
}
function invAdd(id, n = 1) {
  if (!id) return;
  state.inventario[id] = (state.inventario[id] || 0) + n;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1200);
  updateHotbar();
}
function invTake(id) {
  if ((state.inventario[id] || 0) <= 0) return false;
  state.inventario[id]--;
  if (state.inventario[id] <= 0) delete state.inventario[id];
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1200);
  return true;
}

// bloques colocables que se muestran en la barra ahora mismo
function slotsActuales() {
  if (state.mundo.creador) return PLACEABLES.slice();
  return Object.keys(state.inventario)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0 && BLOCKS[id] && state.inventario[id] > 0)
    .sort((a, b) => a - b);
}
function bloqueSeleccionado() {
  const s = slotsActuales();
  return s[Math.min(hotIndex, s.length - 1)] ?? null;
}

function updateHotbar() {
  const bar = hud.querySelector('.hotbar');
  const slots = slotsActuales();
  if (hotIndex >= slots.length) hotIndex = Math.max(0, slots.length - 1);
  if (!slots.length) {
    bar.innerHTML = `<div class="slot hint-slot">⛏️ Rompe bloques para juntar y construir</div>`;
    return;
  }
  bar.innerHTML = slots.map((id, i) => {
    const n = state.mundo.creador ? '' : `<span class="cnt">${state.inventario[id]}</span>`;
    return `<div class="slot ${i === hotIndex ? 'active' : ''}" title="${blockName(id)}">${blockEmoji(id)}${n}</div>`;
  }).join('');
  bar.querySelectorAll('.slot').forEach((el, i) => el.addEventListener('click', () => { hotIndex = i; updateHotbar(); }));
}
updateHotbar();

const modoBadge = hud.querySelector('.modo-badge');
function updateModoBadge() { modoBadge.hidden = !state.mundo.creador; }

// ---------- Vida / corazones ----------
const heartsEl = hud.querySelector('.hearts');
const armBadge = hud.querySelector('.arm-badge');
const btnComer = hud.querySelector('.btn-comer');
let _regenCd = 0, _invulnCd = 0;

function updateHearts() {
  const s = Math.max(0, Math.round(state.salud));
  const total = 10;                       // 10 corazones
  const porCorazon = state.saludMax / total;
  let html = '';
  for (let i = 0; i < total; i++) {
    const v = s - i * porCorazon;
    html += `<span class="hp">${v >= porCorazon ? '❤️' : v > 0 ? '🧡' : '🖤'}</span>`;
  }
  heartsEl.innerHTML = html;
  const n = (state.armadura || []).length;
  armBadge.hidden = n === 0;
  armBadge.querySelector('.arm-n').textContent = n;
  btnComer.hidden = !hayComida();
}

function hayComida() {
  return Object.keys(COMIDA).some((k) => COMIDA[k] > 0 && (state.inventario[k] || 0) > 0);
}

function comer() {
  if (mode !== 'jugar') return;
  if (state.salud >= state.saludMax) { toast('Ya tienes toda la vida', 900); return; }
  // elige la mejor comida disponible
  let mejor = null, val = 0;
  for (const [k, v] of Object.entries(COMIDA)) {
    if (v > val && (state.inventario[k] || 0) > 0) { mejor = k; val = v; }
  }
  if (!mejor) { toast('No tienes comida. Caza animales 🥩', 1100); return; }
  state.inventario[mejor]--;
  if (state.inventario[mejor] <= 0) delete state.inventario[mejor];
  state.salud = Math.min(state.saludMax, state.salud + val);
  audio.sfx('medalla');
  toast(`😋 +${val} vida`, 900);
  updateHearts(); updateHotbar();
  if (screens.crafteo && !screens.crafteo.classList.contains('hidden')) screens.crafteo.refresh?.();
}

function dañarJugador(n, motivo) {
  if (mode !== 'jugar' || _invulnCd > 0) return;
  if (state.mundo.creador) return;   // en modo creador no te hacen daño
  const red = reduccionArmadura(state.armadura || []);
  n = Math.max(1, Math.round(n * (1 - red)));
  state.salud = Math.max(0, state.salud - n);
  _regenCd = 5;
  _invulnCd = 0.5;
  audio.sfx('dano');
  updateHearts();
  if (state.salud <= 0) desmayo();
}

const desmayoEl = document.createElement('div');
desmayoEl.id = 'desmayo';
desmayoEl.innerHTML = '<div class="ico">😵</div><h2>Te desmayaste</h2><p class="sub">Vuelves al punto de inicio con tus cosas.</p>';
app.appendChild(desmayoEl);

let _desmayado = false;
function desmayo() {
  if (_desmayado) return;
  _desmayado = true;
  desmayoEl.classList.add('show');
  audio.sfx('jefe');
  _invulnCd = 99;
  // limpiar y revivir fuera del ciclo de update (evita mutar en medio)
  setTimeout(() => { mobs.clear(); bosses.clear(); gemas.clear(); }, 60);
  setTimeout(() => {
    player.spawnOnSurface();
    state.salud = state.saludMax;
    _invulnCd = 3;
    _desmayado = false;
    updateHearts();
    desmayoEl.classList.remove('show');
    if (state.mundo.creador) return;
    if (mode === 'jugar' && !mobs.arenaMode) { mobs.spawn(); bosses.refreshBeacons(); gemas.refreshShrines(); }
  }, 1900);
}

const toolChip = hud.querySelector('.tool-chip');
function updateToolChip() {
  const t = tool(state.herramienta);
  toolChip.querySelector('.tc-name').textContent = t.nombre;
  toolChip.firstChild.textContent = t.emoji + ' ';
  toolChip.hidden = state.herramientas.length <= 1 && state.herramienta === 'mano';
}
function cambiarHerramienta() {
  const tengo = ['mano', ...state.herramientas.filter((h) => h !== 'mano')];
  const i = tengo.indexOf(state.herramienta);
  state.herramienta = tengo[(i + 1) % tengo.length];
  save();
  updateToolChip();
  updatePowerBadge();
  vmSetTool(state.herramienta);
  audio.sfx('menu');
  toast(`${tool(state.herramienta).emoji} ${tool(state.herramienta).nombre}`, 900);
}
toolChip.addEventListener('click', cambiarHerramienta);
addEventListener('keydown', (e) => { if (mode === 'jugar' && e.code === 'KeyT') cambiarHerramienta(); });
addEventListener('keydown', (e) => { if (mode === 'jugar' && e.code === 'KeyQ' && hud.style.display === 'block') abrirCrafteoEnJuego(); });

const mobBadge = hud.querySelector('.mob-badge');
function updateMobBadge() {
  const n = mobs.chasing();
  mobBadge.hidden = n === 0;
  if (n) mobBadge.querySelector('.mb-n').textContent = n;
}

const bossBar = hud.querySelector('.boss-bar');
function updateBossBar() {
  const e = bosses.estado() || gemas.estado();
  bossBar.hidden = !e;
  if (e) {
    bossBar.querySelector('.boss-name').textContent = e.nombre;
    bossBar.querySelector('.boss-hp > i').style.width = `${(e.hp / e.hpMax) * 100}%`;
  }
}

const powerPicker = hud.querySelector('.power-picker');
const powerBadgeBtn = powerPicker.querySelector('.power-badge');
const powerListEl = powerPicker.querySelector('.power-list');

const tPowerBtn = touch.querySelector('.t-power');
function updatePowerBadge() {
  const power = state.poderEquipado && powerById(state.poderEquipado);
  powerBadgeBtn.querySelector('.pb-name').textContent = power ? `${power.emoji} ${power.nombre}` : 'Sin poder';
  powerBadgeBtn.classList.toggle('on', !!power);
  // el botón ✨ (acción especial) solo aparece si hace algo ahora
  if (tPowerBtn) tPowerBtn.classList.toggle('oculto', !tieneAccionPoder());
}

function poderesDisponibles() {
  return POWERS.filter((p) => poderDesbloqueado(p, state));
}
function renderPowerList() {
  const disp = poderesDisponibles();
  const filas = [`<button data-p="" class="${state.poderEquipado ? '' : 'sel'}">🚫 Sin poder</button>`];
  for (const p of disp) {
    filas.push(`<button data-p="${p.id}" class="${state.poderEquipado === p.id ? 'sel' : ''}">${p.emoji} ${p.nombre}</button>`);
  }
  if (!disp.length) filas.push(`<div class="pl-hint">Estudia para desbloquear poderes 📚</div>`);
  powerListEl.innerHTML = filas.join('');
  powerListEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    state.poderEquipado = b.dataset.p || null;
    save();
    aplicarPoderEquipado();
    powerListEl.hidden = true;
    audio.sfx('menu');
  }));
}
powerBadgeBtn.addEventListener('click', () => {
  const abrir = powerListEl.hidden;
  if (abrir) renderPowerList();
  powerListEl.hidden = !abrir;
});
addEventListener('pointerdown', (e) => {
  if (!powerPicker.contains(e.target)) powerListEl.hidden = true;
});

// ---------- Controles ----------
const controls = new Controls(canvas, {
  ajustes: state.ajustes,
  onLook: (dx, dy) => player.addLook(dx, dy),
  onBreak: () => breakBlock(),
  onPlace: () => placeBlock(),
  onPower: () => activarPoderAccion(),
  onHotbar: (i) => { if (i < slotsActuales().length) { hotIndex = i; updateHotbar(); } },
});

function currentRay() {
  return player.raycast(player.reach || 6);
}

// alternar vista en 1ª / 3ª persona
addEventListener('keydown', (e) => {
  if (mode === 'jugar' && e.code === 'KeyV') player._thirdPerson = !player._thirdPerson;
});

// quita un bloque en (x,y,z), lo recoge y suena. Devuelve true si rompió algo.
function quitarBloque(x, y, z) {
  const id = world.get(x, y, z);
  if (id === AIR) return false;
  if ((BLOCKS[id]?.hard ?? 1) >= 99 && !player.instaBreak) return false;
  world.set(x, y, z, AIR);
  registrarEdit(x, y, z, AIR);
  if (!state.mundo.creador) {
    const drop = dropFor(id);
    if (drop) invAdd(drop, 1);
  }
  return true;
}

// daño de un golpe cuerpo a cuerpo. Los poderes lo suben (fuerte, no instantáneo).
function danoCombate() {
  let d = danoGolpe(state.herramienta) * (player._gemDano || 1);
  if (state.poderEquipado === 'fuerza') d *= 2.4;
  else if (state.poderEquipado === 'laser') d *= 1.6;
  return d;
}
// se llama al pulsar (tap/clic): pega a enemigos; el minado por tiempo va en frame()
function breakBlock() {
  const reach = player.reach || 6;
  const dano = danoCombate();
  const empuje = state.poderEquipado === 'fuerza' ? 3.5 : 1.2;
  vmSwing();
  if (bosses.golpear(camera, reach, dano, empuje)) { audio.sfx('golpe'); return; }
  if (gemas.golpear(camera, reach, dano, empuje)) { audio.sfx('golpe'); return; }
  if (mobs.golpear(camera, reach, dano, empuje)) { audio.sfx('golpe'); return; }
  if (animals.golpear(camera, reach, dano, empuje)) { audio.sfx('golpe'); return; }
}

// minado por tiempo mientras se mantiene pulsado (llamado desde frame)
let _minKey = null, _minProg = 0;
function actualizarMinado(dt) {
  if (!controls.state.breaking) { _minKey = null; _minProg = 0; grieta.visible = false; return; }
  const r = currentRay();
  if (!r) { _minKey = null; _minProg = 0; grieta.visible = false; return; }
  const { x, y, z } = r.hit;
  const id = world.get(x, y, z);
  if (id === AIR || ((BLOCKS[id]?.hard ?? 1) >= 99 && !player.instaBreak)) {
    _minKey = null; _minProg = 0; grieta.visible = false; return;
  }
  const key = x + ',' + y + ',' + z;
  if (key !== _minKey) { _minKey = key; _minProg = 0; }
  const total = player.instaBreak ? 0 : tiempoRomper(id, state.herramienta);
  _minProg += dt;
  const frac = total ? Math.min(1, _minProg / total) : 1;
  // grieta visible sobre el bloque
  grieta.visible = true;
  grieta.position.set(x + 0.5, y + 0.5, z + 0.5);
  grieta.scale.setScalar(0.15 + frac * 0.9);
  grieta.material.opacity = 0.15 + frac * 0.5;

  if (_minProg >= total) {
    const area = tool(state.herramienta).area || 0;
    let rotos = 0;
    for (let dx = -area; dx <= area; dx++)
      for (let dy = -area; dy <= area; dy++)
        for (let dz = -area; dz <= area; dz++)
          if (quitarBloque(x + dx, y + dy, z + dz)) rotos++;
    if (rotos) audio.sfx('romper');
    _minKey = null; _minProg = 0; grieta.visible = false;
  }
}

function placeBlock() {
  // arco equipado: disparar en vez de poner
  if (tool(state.herramienta).arco) { disparar(); return; }

  const r = currentRay();
  if (!r) return;
  // ¿estoy apuntando a una puerta? -> abrir/cerrar las dos mitades
  const ap = world.get(r.hit.x, r.hit.y, r.hit.z);
  if (ap === 20 || ap === 21) {
    const nuevo = ap === 20 ? 21 : 20;
    for (const dy of [0, 1, -1]) {
      const cy = r.hit.y + dy;
      const b = world.get(r.hit.x, cy, r.hit.z);
      if (b === 20 || b === 21) { world.set(r.hit.x, cy, r.hit.z, nuevo); registrarEdit(r.hit.x, cy, r.hit.z, nuevo); }
    }
    audio.sfx('poner');
    return;
  }
  const { x, y, z } = r.place;
  // no colocar dentro del jugador
  const px = Math.floor(player.pos.x), pz = Math.floor(player.pos.z);
  const py = Math.floor(player.pos.y);
  if (x === px && z === pz && (y === py || y === py + 1)) return;
  if (world.get(x, y, z) !== AIR) return;
  const id = bloqueSeleccionado();
  if (!id) { toast('No tienes bloques. Rompe algunos primero.', 1200); return; }
  // la puerta ocupa 2 de alto
  if (id === 20 && world.get(x, y + 1, z) !== AIR) { toast('Falta espacio para la puerta (2 de alto)', 1100); return; }
  if (!state.mundo.creador && !invTake(id)) { toast(`Se te acabó el bloque ${blockName(id)}`, 1200); updateHotbar(); return; }
  world.set(x, y, z, id);
  registrarEdit(x, y, z, id);
  if (id === 20) { world.set(x, y + 1, z, 20); registrarEdit(x, y + 1, z, 20); }
  audio.sfx('poner');
  updateHotbar();
}

let _poderCd = 0;      // enfriamiento de la acción de poder
let _laserT = 0;       // tiempo que el rayo láser sigue visible

// El botón ✨ aparece si tienes CUALQUIER poder equipado.
function tieneAccionPoder() {
  return !!state.poderEquipado;
}
// El botón ✨ activa el poder seleccionado, sea cual sea.
function activarPoderAccion() {
  const id = state.poderEquipado;
  if (!id) return;
  if (_poderCd > 0) { toast(`⏳ Poder listo en ${Math.ceil(_poderCd)}s`, 800); return; }
  // el botón ✨ NO mueve la herramienta (eso es solo del botón ⛏️)
  switch (id) {
    case 'sonico':        sonicBlast(); break;
    case 'rayo_martillo': rayoMartillo(); break;
    case 'onda_prisma':   ondaPrisma(); break;
    case 'laser':         rayoLaser(); break;
    case 'fuerza':        puñetazoFuerza(); break;
    case 'velocidad':     rafagaVelocidad(); break;
    case 'salto':         saltoColosal(); break;
    case 'invisible':     mantoSombra(); break;
    case 'volar':         impulsoVuelo(); break;
  }
}

// --- acciones de cada poder ---
function _enemigosEnCono(o, dir, range, dano) {
  let n = mobs.dañoEnCono(o, dir, range, dano);
  bosses.dañoEnCono(o, dir, range, dano * 2);
  gemas.dañoEnCono(o, dir, range, dano * 2);
  animals.dañoEnCono?.(o, dir, range, Math.round(dano * 0.6));
  for (const m of mobs.mobs) {
    const to = new THREE.Vector3(m.pos.x - o.x, 0, m.pos.z - o.z);
    if (to.length() < range && to.clone().normalize().dot(dir) > 0.55) {
      m.pos.x += dir.x * 5; m.pos.z += dir.z * 5; m.vel.y = 6;
    }
  }
  return n;
}
function _dirMirada() {
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  return d;
}

function puñetazoFuerza() {
  _poderCd = 3;
  const dir = _dirMirada(); dir.y = 0; dir.normalize();
  const o = new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.2, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, depthWrite: false }));
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  addFx(ring, 0.4, (m, k) => { m.position.copy(o).addScaledVector(dir, 0.5 + k * 4); m.scale.setScalar(1 + k * 3); m.material.opacity = 0.9 * (1 - k); });
  const n = _enemigosEnCono(o, dir, 6, 10);
  audio.sfx('golpe');
  toast(n ? `👊 ¡GOLPE DE FUERZA! ${n}` : '👊 ¡GOLPE DE FUERZA!');
}
function rafagaVelocidad() {
  _poderCd = 2.5;
  const dir = _dirMirada(); dir.y = 0; dir.normalize();
  // avanzar en pasos chicos respetando las colisiones
  for (let i = 0; i < 7; i++) { player.moveAxis('x', dir.x * 0.85); player.moveAxis('z', dir.z * 0.85); }
  player.vel.y = Math.max(player.vel.y, 2);
  const tr = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ef, transparent: true, depthWrite: false }));
  tr.position.copy(player.pos).add(new THREE.Vector3(0, 1, 0));
  addFx(tr, 0.35, (m, k) => { m.scale.setScalar(1 + k * 3); m.material.opacity = 0.5 * (1 - k); });
  audio.sfx('saltar');
  toast('💨 ¡RÁFAGA!');
}
function saltoColosal() {
  _poderCd = 2.5;
  player.vel.y = 20;
  player.onGround = false;
  audio.sfx('saltar');
  toast('🦿 ¡SALTO COLOSAL!');
}
function rayoLaser() {
  _poderCd = 1.2;
  _laserT = 0.35;
  const r = player.raycast(16);
  if (r) {
    // rompe el bloque apuntado (y 1 detrás para "perforar")
    if (quitarBloque(r.hit.x, r.hit.y, r.hit.z)) audio.sfx('romper');
  }
  const o = new THREE.Vector3(player.pos.x, player.pos.y + player.eye, player.pos.z);
  const dir = _dirMirada();
  const n = _enemigosEnCono(o, dir, 16, 8);
  audio.sfx('golpe');
  toast(n ? `🔴 ¡LÁSER! ${n}` : '🔴 ¡LÁSER!');
}
function mantoSombra() {
  _poderCd = 8;
  player._mantoT = 6;   // 6 s de invisibilidad reforzada
  const puf = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0x2b1e3a, transparent: true, depthWrite: false }));
  puf.position.copy(player.pos).add(new THREE.Vector3(0, 1, 0));
  addFx(puf, 0.5, (m, k) => { m.scale.setScalar(1 + k * 5); m.material.opacity = 0.5 * (1 - k); });
  audio.sfx('menu');
  toast('👻 ¡MANTO DE SOMBRA! (6 s)');
}
function impulsoVuelo() {
  _poderCd = 0.6;
  player.vel.y = 12;
  audio.sfx('saltar');
}

// ---------- efectos visuales cortos ----------
const fx = [];
function addFx(mesh, vida, fn, delay = 0) {
  mesh.userData.t = -delay; mesh.userData.vida = vida; mesh.userData.fn = fn;
  mesh.visible = delay <= 0;
  scene.add(mesh); fx.push(mesh);
}
function updateFx(dt) {
  _poderCd = Math.max(0, _poderCd - dt);
  _laserT = Math.max(0, _laserT - dt);
  for (let i = fx.length - 1; i >= 0; i--) {
    const m = fx[i];
    m.userData.t += dt;
    if (m.userData.t < 0) continue;
    m.visible = true;
    const k = m.userData.t / m.userData.vida;
    if (k >= 1) { scene.remove(m); fx.splice(i, 1); continue; }
    m.userData.fn?.(m, k);
  }
}

// Rayo del Martillo del Trueno: cae un rayo donde apuntas y golpea alrededor.
function rayoMartillo() {
  if (_poderCd > 0) { toast(`⚡ El Martillo se recarga (${Math.ceil(_poderCd)}s)`, 900); return; }
  _poderCd = 4;
  const r = player.raycast(16);
  const hit = r
    ? new THREE.Vector3(r.hit.x + 0.5, r.hit.y + 1, r.hit.z + 0.5)
    : camera.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(12));
  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 22, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true })
  );
  bolt.position.set(hit.x, hit.y + 11, hit.z);
  addFx(bolt, 0.4, (m, k) => { m.material.opacity = 1 - k; m.scale.x = m.scale.z = 1 + k * 2.5; });
  audio.sfx('jefe');
  const nm = mobs.dañoEnRadio(hit, 4.5, 14);
  bosses.dañoEnRadio(hit, 4.5, 16);
  gemas.dañoEnRadio(hit, 4.5, 16);
  animals.dañoEnRadio(hit, 4.5, 14);
  toast(nm ? `⚡ ¡RAYO! Golpeaste a ${nm}` : '⚡ ¡RAYO!');
}

// Onda Prisma (Guante de Gemas completo): explota en 360° alrededor tuyo.
function ondaPrisma() {
  if (_poderCd > 0) { toast(`✊ Onda Prisma se recarga (${Math.ceil(_poderCd)}s)`, 1000); return; }
  _poderCd = 12;
  const c = player.pos.clone();
  const R = 6;
  for (let dx = -R; dx <= R; dx++)
    for (let dy = -R; dy <= R; dy++)
      for (let dz = -R; dz <= R; dz++) {
        if (dx * dx + dy * dy + dz * dz > R * R) continue;
        const bx = Math.floor(c.x + dx), by = Math.floor(c.y + dy), bz = Math.floor(c.z + dz);
        const bid = world.get(bx, by, bz);
        if (bid !== AIR && (BLOCKS[bid]?.hard ?? 1) < 99) {
          world.set(bx, by, bz, AIR); registrarEdit(bx, by, bz, AIR);
        }
      }
  // --- efecto visual: domo que crece + 3 anillos escalonados en el suelo ---
  const domo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  domo.position.set(c.x, c.y - 0.2, c.z);
  addFx(domo, 0.55, (m, k) => { m.scale.setScalar(1 + k * 17); m.material.opacity = 0.45 * (1 - k); });
  for (let i = 0; i < 3; i++) {
    const col = [0xff5a3c, 0x49b0ff, 0xffffff][i];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.32, 8, 34),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(c.x, c.y + 0.3, c.z);
    addFx(ring, 0.7, (m, k) => { m.scale.setScalar(1 + k * 19); m.material.opacity = 0.9 * (1 - k); }, i * 0.11);
  }
  const nm = mobs.dañoEnRadio(c, 16, 40);
  bosses.dañoEnRadio(c, 16, 40);
  gemas.dañoEnRadio(c, 16, 40);
  animals.dañoEnRadio(c, 16, 40);
  for (const m of mobs.mobs) {
    const ex = m.pos.x - c.x, ez = m.pos.z - c.z, ed = Math.hypot(ex, ez);
    if (ed < 16) { m.pos.x += (ex / (ed || 1)) * 7; m.pos.z += (ez / (ed || 1)) * 7; m.vel.y = 8; }
  }
  audio.sfx('sonico');
  toast(nm ? `✊ ¡ONDA PRISMA! ${nm} enemigos barridos` : '✊ ¡ONDA PRISMA!');
}

// Grito sónico: onda dirigida HACIA ADELANTE (despeja un túnel y golpea en cono).
function sonicBlast() {
  if (_poderCd > 0) { toast(`💥 El grito se recarga (${Math.ceil(_poderCd)}s)`, 900); return; }
  _poderCd = 5;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y *= 0.35; dir.normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();
  const o = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);

  // túnel que se abre hacia adelante
  let removed = 0;
  for (let d = 1; d <= 9; d++)
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++) {
        const p = o.clone().addScaledVector(dir, d).addScaledVector(right, a * 0.95).addScaledVector(up, b * 0.95);
        const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
        const id = world.get(bx, by, bz);
        if (id !== AIR && (BLOCKS[id]?.hard ?? 1) < 99) {
          world.set(bx, by, bz, AIR); registrarEdit(bx, by, bz, AIR); removed++;
          if (!state.mundo.creador) invAdd(dropFor(id), 1);
        }
      }

  // --- efecto visual: 3 anillos que viajan hacia adelante ---
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.16, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, depthWrite: false })
    );
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    addFx(ring, 0.5, (m, k) => {
      m.position.copy(o).addScaledVector(dir, 1 + k * 9);
      m.scale.setScalar(1 + k * 4.5);
      m.material.opacity = 0.9 * (1 - k);
    }, i * 0.08);
  }

  const nMobs = mobs.dañoEnCono(o, dir, 11, 4);
  bosses.dañoEnCono(o, dir, 11, 10);
  gemas.dañoEnCono(o, dir, 11, 10);
  animals.dañoEnCono?.(o, dir, 11, 3);
  // empujar hacia adelante a los enemigos que estén en el cono
  for (const m of mobs.mobs) {
    const to = new THREE.Vector3(m.pos.x - o.x, 0, m.pos.z - o.z);
    if (to.length() < 11 && to.clone().normalize().dot(dir) > 0.55) {
      m.pos.x += dir.x * 6; m.pos.z += dir.z * 6; m.vel.y = 6;
    }
  }
  audio.sfx('sonico');
  toast(nMobs ? `💥 ¡GRITO SÓNICO! ${nMobs} golpeados` : '💥 ¡GRITO SÓNICO!');
}

// aplicar poder equipado a los parámetros del jugador
export function aplicarPoderEquipado() {
  // reset a valores base
  player.speed = 4.6; player.sprintMul = 1; player.jumpV = 8.2;
  player.flying = false; player.instaBreak = false; player.reach = 6; player.invisible = false;
  player._gemDano = 1; player._empuje = 1;
  const id = state.poderEquipado;
  const power = id && powerById(id);
  if (power && power.aplica) power.aplica(player);
  aplicarGemas(player);               // dones pasivos de las gemas (encima del poder)
  if (state.mundo.creador) {          // modo creador: vuelas y rompes al toque
    player.flying = true; player.instaBreak = true; player.reach = 8;
  }
  updatePowerBadge();
  vmSetTool(state.herramienta);
}

// ---------- Bucle ----------
let mode = 'menu'; // 'menu' | 'jugar'

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let _wasGround = true, _pasoT = 0, _lavaCd = 0;
function frame(dt) {
  if (mode === 'jugar') {
    player.update(dt, controls.state);
    // Manto de sombra (acción del poder invisibilidad)
    if (player._mantoT > 0) {
      player._mantoT -= dt;
      player.invisible = true;
      player.sprintMul = Math.max(player.sprintMul, 1.7);
    }
    const moving = Math.abs(controls.state.forward) + Math.abs(controls.state.right) > 0.1;
    // sonido de salto y de pisadas
    if (_wasGround && !player.onGround && player.vel.y > 1) audio.sfx('saltar');
    _wasGround = player.onGround;
    if (moving && player.onGround && !player.flying) {
      _pasoT -= dt;
      if (_pasoT <= 0) { audio.sfx('pisada'); _pasoT = controls.state.sprint ? 0.26 : 0.36; }
    } else _pasoT = 0;
    // ¡lava! rebota al jugador
    if (world.get(Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z)) === 14
        || world.get(Math.floor(player.pos.x), Math.floor(player.pos.y + 1), Math.floor(player.pos.z)) === 14) {
      player.vel.y = 12; player.pos.y += 0.3;
      const cx = Math.floor(world.SX / 2), cz = Math.floor(world.SZ / 2);
      const ax = player.pos.x - cx, az = player.pos.z - cz, al = Math.hypot(ax, az) || 1;
      player.pos.x += (ax / al) * 2; player.pos.z += (az / al) * 2;
      if (!_lavaCd) { dañarJugador(6, 'lava'); toast('🔥 ¡Lava! Aléjate'); _lavaCd = 1; }
    }
    _lavaCd = Math.max(0, _lavaCd - dt);
    // vida: regeneración lenta al no recibir golpes
    _regenCd = Math.max(0, _regenCd - dt);
    _invulnCd = Math.max(0, _invulnCd - dt);
    if (_regenCd === 0 && state.salud < state.saludMax && !state.mundo.creador) {
      state.salud = Math.min(state.saludMax, state.salud + 6 * dt);
      if (Math.random() < 0.06) updateHearts();
    }
    updateAvatar(player, dt, moving);
    mobs.update(dt, player);
    bosses.update(dt, player);
    gemas.update(dt, player);
    animals.update(dt, player);
    updateMobBadge();
    updateMiniMapa(dt);
    streamChunks();
    actualizarMinado(dt);
    actualizarFlechas(dt);
    actualizarLaser();
    viewModel.update(dt, player._thirdPerson || _laserT > 0);   // oculta la herramienta mientras lanzas el láser
    updateFx(dt);
    const r = currentRay();
    if (r) { highlight.visible = true; highlight.position.set(r.hit.x + 0.5, r.hit.y + 0.5, r.hit.z + 0.5); }
    else highlight.visible = false;
    // cámara en tercera persona (después del raycast, que usa el ojo): detrás y
    // un poco arriba del monigote, sin atravesar el suelo/bloques
    if (player._thirdPerson) {
      const eye = camera.position.clone();
      const back = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion).normalize();
      let dist = 4.2;
      for (let d = 0.5; d <= dist; d += 0.3) {
        const px = Math.floor(eye.x + back.x * d);
        const py = Math.floor(eye.y + back.y * d + 0.3);
        const pz = Math.floor(eye.z + back.z * d);
        if (world.get(px, py, pz) !== AIR) { dist = Math.max(1.2, d - 0.4); break; }
      }
      camera.position.copy(eye).addScaledVector(back, dist).add(new THREE.Vector3(0, 0.5, 0));
    }
  }
  dayNight.update(dt, camera);
  if (world && mode !== 'jugar') streamChunks();
  renderer.render(scene, camera);
}

let last = performance.now();
let rafOk = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  rafOk = 2;
  frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Respaldo: si requestAnimationFrame está limitado (algunos navegadores en 2º plano
// o entornos de prueba), un intervalo mantiene el juego vivo.
setInterval(() => {
  if (rafOk > 0) { rafOk--; return; }
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame(dt);
}, 1000 / 30);

// gancho de prueba: avanzar N pasos de simulación
window.__step = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) frame(dt); };

// ---------- Navegación de pantallas ----------
function showMenu() {
  mode = 'menu';
  controls.disable();
  mobs.clear();
  bosses.clear();
  gemas.clear();
  animals.clear();
  hud.style.display = 'none';
  touch.classList.remove('on');
  rotar.classList.remove('show');
  closeAllScreens();                 // ocultar cualquier pantalla secundaria abierta
  menuScreen.classList.remove('hidden');
  menuScreen.refresh?.();
  save();
}

export function jugar() {
  mode = 'jugar';
  menuScreen.classList.add('hidden');
  closeAllScreens();
  // ¿cambió la config del mundo desde la última vez?
  const sig = `${state.mundo.tipo}|${state.mundo.tamano}|${state.mundo.semilla}`;
  if (sig !== worldSig) { crearMundo(); player.spawnOnSurface(); }
  hud.style.display = 'block';
  if (controls.isTouch) { touch.classList.add('on'); controls.applyStickSide(); }
  pedirPantallaCompleta();
  player._thirdPerson = state.ajustes.vista === 'tercera';
  aplicarPoderEquipado();
  applySkinToPlayer(player, scene);
  checkOrientacion();
  mobs.arenaMode = false;
  if (state.mundo.creador) {
    mobs.clear(); mobs.enabled = false;
    bosses.clear();
    gemas.clear();
  } else {
    mobs.enabled = true;
    mobs.spawn();
    bosses.refreshBeacons();
    gemas.refreshShrines();
  }
  animals.spawn();   // los animales están siempre (también en modo creador)
  if (!state.salud || state.salud <= 0) state.salud = state.saludMax;
  updateMobBadge();
  updateBossBar();
  updateModoBadge();
  updateToolChip();
  updateHearts();
  hotIndex = 0;
  updateHotbar();
  controls.enable();
  last = performance.now();
}

// abrir el crafteo sin salir del juego (pausa los controles)
function abrirCrafteoEnJuego() {
  controls.disable();
  hud.style.display = 'none';
  touch.classList.remove('on');
  openScreen('crafteo');
}
function abrirTableroEnJuego() {
  controls.disable();
  hud.style.display = 'none';
  touch.classList.remove('on');
  openScreen('tablero');
}

// --- Sala de pruebas (clave maestra) ---
function aplanarArena() {
  const cx = Math.floor(player.pos.x), cz = Math.floor(player.pos.z);
  const sy = world.surfaceY(cx, cz);
  for (let dx = -14; dx <= 14; dx++)
    for (let dz = -14; dz <= 14; dz++) {
      for (let dy = 1; dy < 24; dy++) world.set(cx + dx, sy + dy, cz + dz, AIR);
      world.set(cx + dx, sy, cz + dz, 1);
    }
  player.pos.set(cx + 0.5, sy + 1.2, cz + 0.5);
  player.vel.set(0, 0, 0);
  player.yaw = -Math.PI / 2;   // mirando hacia +x (donde aparecen los monstruos)
  player.pitch = 0;
  streamChunks(true);
}
// entra al juego en modo arena de pruebas (sin spawnear el mundo normal)
function entrarArenaPrueba() {
  mode = 'jugar';
  menuScreen.classList.add('hidden');
  closeAllScreens();
  hud.style.display = 'block';
  if (controls.isTouch) { touch.classList.add('on'); controls.applyStickSide(); }
  player._thirdPerson = state.ajustes.vista === 'tercera';
  aplicarPoderEquipado();
  applySkinToPlayer(player, scene);
  mobs.enabled = true;
  mobs.arenaMode = true;
  mobs.clear(); bosses.clear(); gemas.clear(); animals.clear();
  if (!state.salud || state.salud <= 0) state.salud = state.saludMax;
  aplanarArena();
  updateHearts(); updateToolChip(); updateHotbar(); updateModoBadge();
  updateMobBadge(); updateBossBar(); checkOrientacion();
  controls.enable();
  last = performance.now();
}
function invocarEnemigoPrueba(tipo) {
  entrarArenaPrueba();
  const p = player.pos;
  const gx = Math.floor(p.x + 5), gz = Math.floor(p.z);
  const gy = world.surfaceY(gx, gz);
  mobs.spawnAt({ x: gx, y: gy, z: gz }, tipo);
  const m = mobs.mobs[mobs.mobs.length - 1];
  if (m) { m.pos.set(gx + 0.5, gy + 1, gz + 0.5); m.state = 'chase'; }
  toast('🧪 Invócalo las veces que quieras. Golpéalo con ⛏️.');
}
function invocarJefePrueba(id) {
  entrarArenaPrueba();
  bosses.spawnPrueba(id, player.pos);
  updateBossBar();
}
function volverAlJuego() {
  closeAllScreens();
  menuScreen.classList.add('hidden');
  hud.style.display = 'block';
  if (controls.isTouch) touch.classList.add('on');
  aplicarPoderEquipado();
  updateHotbar();
  updateToolChip();
  updateHearts();
  controls.enable();
  last = performance.now();
}

function pedirPantallaCompleta() {
  if (!state.ajustes.pantallaCompleta) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}

const menuScreen = mountMenu({
  onJugar: () => jugar(),
  onAprender: () => openScreen('aprender'),
  onPersonajes: () => openScreen('personajes'),
  onPoderes: () => openScreen('poderes'),
  onMundos: () => openScreen('mundos'),
  onAjustes: () => openScreen('ajustes'),
  onCrafteo: () => openScreen('crafteo'),
  onGemas: () => openScreen('gemas'),
  onPruebas: () => openScreen('pruebas'),
});
app.appendChild(menuScreen);

// pantallas secundarias montadas bajo demanda
const screens = {};
function openScreen(name) {
  menuScreen.classList.add('hidden');
  closeAllScreens();
  if (!screens[name]) {
    if (name === 'aprender') {
      screens[name] = mountAprender({
        onVolver: () => showMenu(),
        onJugarTema: (topicId) => startQuiz(topicId),
      });
    } else if (name === 'poderes') {
      screens[name] = mountPoderes({
        onVolver: () => showMenu(),
        onCambio: () => aplicarPoderEquipado(),
      });
    } else if (name === 'personajes') {
      screens[name] = mountPersonajes({ onVolver: () => showMenu() });
    } else if (name === 'mundos') {
      screens[name] = mountMundos({
        onVolver: () => showMenu(),
        onCrear: () => {
          crearMundo();
          player.spawnOnSurface();
          toast(`🌍 Mundo "${TIPOS[state.mundo.tipo]?.label || state.mundo.tipo}" creado`);
          jugar();
        },
      });
    } else if (name === 'ajustes') {
      screens[name] = mountAjustes({
        onVolver: () => showMenu(),
        onCambio: (k) => {
          if (k === 'stickIzquierda') controls.applyStickSide();
        },
      });
    } else if (name === 'crafteo') {
      screens[name] = mountCrafteo({
        onVolver: () => (mode === 'jugar' ? volverAlJuego() : showMenu()),
        onArmar: (f) => { _tableroGuia = f; openScreen('tablero'); },
      });
    } else if (name === 'tablero') {
      screens[name] = mountTablero({
        onVolver: () => (mode === 'jugar' ? volverAlJuego() : showMenu()),
        onLista: () => { _tableroGuia = null; openScreen('crafteo'); },
        onCambio: () => { updateHotbar(); updateToolChip(); updateHearts(); },
      });
    } else if (name === 'pruebas') {
      screens[name] = mountPruebas({
        onVolver: () => showMenu(),
        onEnemigo: (t) => invocarEnemigoPrueba(t),
        onJefe: (id) => invocarJefePrueba(id),
        onLimpiar: () => { mobs.clear(); bosses.clear(); toast('Arena limpia'); },
      });
    } else if (name === 'gemas') {
      screens[name] = mountGemas({
        onVolver: () => (mode === 'jugar' ? volverAlJuego() : showMenu()),
        getWorld: () => world,
        getPlayer: () => player,
      });
    }
    app.appendChild(screens[name]);
  }
  if (name === 'tablero') screens[name].setGuia?.(_tableroGuia);
  screens[name].refresh?.();
  screens[name].classList.remove('hidden');
}
function closeAllScreens() {
  for (const s of Object.values(screens)) s.classList.add('hidden');
}

async function startQuiz(topicId) {
  closeAllScreens();
  const res = await openQuiz(topicId);
  // al cerrar el quiz volvemos a "Aprender" y refrescamos
  if (res?.subioNivel) toast(`🏅 ¡Subiste a ${res.nivel.toUpperCase()} en ${res.tema}!`);
  openScreen('aprender');
}

// arranque
window.__booted = true;
const boot = document.getElementById('boot');
if (boot) boot.remove();

// La clave se pide SIEMPRE al entrar
function activarMaestro() {
  state.maestro = true;
  state.gemas = GEMAS.map((g) => g.id);
  state.medallas = { bronce: 11, plata: 11, oro: 11 };
  for (const h of ['pico_madera', 'pico_piedra', 'pico_hierro', 'pico_cristal', 'martillo_trueno', 'hacha_hierro', 'pala_hierro', 'espada_piedra', 'espada_hierro', 'espada_cristal', 'arco']) {
    if (!state.herramientas.includes(h)) state.herramientas.push(h);
  }
  state.armadura = ['casco_cuero', 'peto_cuero', 'pantalon_cuero', 'botas_cuero'];
  state.inventario = { ...state.inventario, flecha: 128, carne_cocida: 20 };
  toast('🔓 Modo maestro: todo desbloqueado (tu avance normal NO se toca)', 2600);
}
mode = 'menu';
menuScreen.classList.add('hidden');
mountClave(({ maestro }) => { if (maestro) activarMaestro(); showMenu(); });

// PWA: registrar service worker solo en build de producción
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// exponer para debug
window.__game = {
  state, POWERS, jugar, crearMundo, dayNight, controls,
  get world() { return world; },
  get player() { return player; },
  get mobs() { return mobs; },
  get bosses() { return bosses; },
  get animals() { return animals; },
  get gemas() { return gemas; },
  actions: { romper: breakBlock, poner: placeBlock, poder: activarPoderAccion, comer, dañar: dañarJugador },
};
