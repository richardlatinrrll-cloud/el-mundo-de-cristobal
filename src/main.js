import * as THREE from 'three';
import './style.css';
import { World, CHUNK, TIPOS } from './engine/world.js';
import { buildChunkGeometry } from './engine/mesher.js';
import { buildAtlas, BLOCKS, PLACEABLES, blockName, blockEmoji, dropFor, AIR } from './engine/blocks.js';
import { Player } from './engine/player.js';
import { Controls } from './engine/controls.js';
import { state, save, LIMITE_EDITS } from './game/state.js';
import { POWERS, powerById } from './game/powers/registry.js';
import { mountMenu } from './ui/menu.js';
import { openQuiz } from './quiz/quiz-ui.js';
import { mountAprender } from './quiz/progress-ui.js';
import { mountPoderes } from './game/power-hud.js';
import { mountPersonajes } from './skin/skin-editor.js';
import { applySkinToPlayer, updateAvatar } from './skin/skin-model.js';
import { MobField } from './game/mobs.js';
import { BossArena } from './game/bosses.js';
import { mountMundos } from './ui/mundos.js';
import { mountAjustes } from './ui/ajustes.js';
import { mountClave, claveDesbloqueada } from './ui/clave.js';
import { audio } from './game/audio.js';
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

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(60, 120, 30);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x4a5a3a, 0.75));

// Atlas de texturas
const atlas = buildAtlas();
const atlasTex = new THREE.CanvasTexture(atlas.canvas);
atlasTex.flipY = false; // el atlas se dibuja con la fila 0 (cara superior) arriba
atlasTex.magFilter = THREE.NearestFilter;
atlasTex.minFilter = THREE.NearestFilter;
atlasTex.colorSpace = THREE.SRGBColorSpace;

const matOpaque = new THREE.MeshLambertMaterial({ map: atlasTex });
const matTrans = new THREE.MeshLambertMaterial({ map: atlasTex, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide });

// ---------- Mundo (malla por chunks) ----------
let world;
const chunkMeshes = new Map(); // "cx,cz" -> { opaque, trans }

function disposeChunk(key) {
  const c = chunkMeshes.get(key);
  if (!c) return;
  if (c.opaque) { scene.remove(c.opaque); c.opaque.geometry.dispose(); }
  if (c.trans) { scene.remove(c.trans); c.trans.geometry.dispose(); }
  chunkMeshes.delete(key);
}
function clearAllChunks() {
  for (const key of [...chunkMeshes.keys()]) disposeChunk(key);
}
function buildChunk(key) {
  const [cx, cz] = key.split(',').map(Number);
  world.dirtyChunks.delete(key);
  if (cx < 0 || cz < 0 || cx * CHUNK >= world.SX || cz * CHUNK >= world.SZ) { disposeChunk(key); return; }
  const { opaque, trans } = buildChunkGeometry(world, cx, cz);
  disposeChunk(key);
  const rec = { opaque: null, trans: null };
  if (opaque.attributes.position && opaque.attributes.position.count) {
    rec.opaque = new THREE.Mesh(opaque, matOpaque); scene.add(rec.opaque);
  } else opaque.dispose();
  if (trans.attributes.position && trans.attributes.position.count) {
    rec.trans = new THREE.Mesh(trans, matTrans); scene.add(rec.trans);
  } else trans.dispose();
  chunkMeshes.set(key, rec);
}
function processDirtyChunks(budget = 3) {
  if (!world.dirtyChunks.size) return;
  let n = 0;
  for (const key of world.dirtyChunks) { buildChunk(key); if (++n >= budget) break; }
}
function buildAllChunksNow() {
  for (const key of [...world.dirtyChunks]) buildChunk(key);
}

let worldSig = '';
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
  const sky = TIPOS[world.tipo]?.cielo ?? 0x8fc7ff;
  renderer.setClearColor(sky);
  scene.fog.color.setHex(sky);
  scene.fog.far = Math.max(110, Math.min(280, world.SX * 0.85));
  buildAllChunksNow();
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
let player, mobs, bosses;
let hotIndex = 0;

crearMundo();                       // crea `world` + malla + color de cielo

player = new Player(world, camera);
mobs = new MobField(world, scene);
bosses = new BossArena(world, scene);
bosses.onMinion = (pos) => mobs.spawnAt(pos, 'sombra');
bosses.onHud = () => updateBossBar();
player.spawnOnSurface();

// resaltado del bloque apuntado
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x000000 })
);
highlight.visible = false;
scene.add(highlight);

// ---------- HUD (debe existir antes de crear los controles táctiles) ----------
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="crosshair"></div>
  <button class="btn-back">☰ Menú</button>
  <div class="power-badge"><span class="dot"></span><span class="pb-name">Sin poder</span></div>
  <div class="mob-badge" hidden>👤 <span class="mb-n">0</span> enemigo(s) persiguiéndote</div>
  <div class="modo-badge" hidden>🎨 Modo creador</div>
  <div class="boss-bar" hidden>
    <div class="boss-name">Jefe</div>
    <div class="boss-hp"><i></i></div>
  </div>
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

// ---------- Inventario ----------
function darKitInicial() {
  state.inventario = { ...KIT_INICIAL };
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

// bloques que se muestran en la barra ahora mismo
function slotsActuales() {
  if (state.mundo.creador) return PLACEABLES.slice();
  return Object.keys(state.inventario).map(Number).filter((id) => state.inventario[id] > 0)
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

const mobBadge = hud.querySelector('.mob-badge');
function updateMobBadge() {
  const n = mobs.chasing();
  mobBadge.hidden = n === 0;
  if (n) mobBadge.querySelector('.mb-n').textContent = n;
}

const bossBar = hud.querySelector('.boss-bar');
function updateBossBar() {
  const e = bosses.estado();
  bossBar.hidden = !e;
  if (e) {
    bossBar.querySelector('.boss-name').textContent = e.nombre;
    bossBar.querySelector('.boss-hp > i').style.width = `${(e.hp / e.hpMax) * 100}%`;
  }
}

function updatePowerBadge() {
  const badge = hud.querySelector('.power-badge');
  const power = state.poderEquipado && powerById(state.poderEquipado);
  badge.querySelector('.pb-name').textContent = power ? `${power.emoji} ${power.nombre}` : 'Sin poder';
  badge.classList.toggle('on', !!power);
}

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

function breakBlock() {
  // 1º: ¿le estoy pegando a un jefe o a un enemigo?
  const reach = player.reach || 6;
  if (bosses.golpear(camera, reach, 4)) { audio.sfx('golpe'); return; }
  if (mobs.golpear(camera, reach, player.instaBreak ? 3 : 2)) { audio.sfx('golpe'); return; }
  // 2º: romper bloque
  const r = currentRay();
  if (!r) return;
  const id = world.get(r.hit.x, r.hit.y, r.hit.z);
  if (id === AIR) return;
  if (BLOCKS[id]?.hard >= 99 && !player.instaBreak) return; // agua/indestructible
  world.set(r.hit.x, r.hit.y, r.hit.z, AIR);
  registrarEdit(r.hit.x, r.hit.y, r.hit.z, AIR);
  audio.sfx('romper');
  // recoger el bloque roto (en modo creador no hace falta juntar)
  if (!state.mundo.creador) {
    const drop = dropFor(id);
    if (drop) { invAdd(drop, 1); toast(`+1 ${blockName(drop)}`, 900); }
  }
}

function placeBlock() {
  const r = currentRay();
  if (!r) return;
  const { x, y, z } = r.place;
  // no colocar dentro del jugador
  const px = Math.floor(player.pos.x), pz = Math.floor(player.pos.z);
  const py = Math.floor(player.pos.y);
  if (x === px && z === pz && (y === py || y === py + 1)) return;
  if (world.get(x, y, z) !== AIR) return;
  const id = bloqueSeleccionado();
  if (!id) { toast('No tienes bloques. Rompe algunos primero.', 1200); return; }
  if (!state.mundo.creador && !invTake(id)) { toast(`Se te acabó el bloque ${blockName(id)}`, 1200); updateHotbar(); return; }
  world.set(x, y, z, id);
  registrarEdit(x, y, z, id);
  audio.sfx('poner');
  updateHotbar();
}

function activarPoderAccion() {
  const id = state.poderEquipado;
  const power = id && powerById(id);
  if (!power || !power.accion) return;
  if (power.accion === 'sonico') { audio.sfx('sonico'); sonicBlast(); }
}

function sonicBlast() {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const o = camera.position.clone();
  let removed = 0;
  for (let d = 1; d <= 8; d++) {
    for (let ox = -1; ox <= 1; ox++)
      for (let oy = -1; oy <= 1; oy++) {
        const p = o.clone().add(dir.clone().multiplyScalar(d)).add(new THREE.Vector3(ox, oy, 0));
        const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
        const id = world.get(bx, by, bz);
        if (id !== AIR && (BLOCKS[id]?.hard ?? 1) < 99) {
          world.set(bx, by, bz, AIR); registrarEdit(bx, by, bz, AIR); removed++;
          if (!state.mundo.creador) invAdd(dropFor(id), 1);
        }
      }
  }
  const nMobs = mobs.dañoEnCono(o, dir, 9, 3);
  bosses.dañoEnCono(o, dir, 9, 10);
  toast(nMobs ? `💥 ¡BOOM! Golpeaste a ${nMobs}` : '💥 ¡BOOM!');
}

// aplicar poder equipado a los parámetros del jugador
export function aplicarPoderEquipado() {
  // reset a valores base
  player.speed = 4.6; player.sprintMul = 1; player.jumpV = 8.2;
  player.flying = false; player.instaBreak = false; player.reach = 6; player.invisible = false;
  const id = state.poderEquipado;
  const power = id && powerById(id);
  if (power && power.aplica) power.aplica(player);
  if (state.mundo.creador) {          // modo creador: vuelas y rompes al toque
    player.flying = true; player.instaBreak = true; player.reach = 8;
  }
  updatePowerBadge();
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

let _wasGround = true, _pasoT = 0;
function frame(dt) {
  if (mode === 'jugar') {
    player.update(dt, controls.state);
    const moving = Math.abs(controls.state.forward) + Math.abs(controls.state.right) > 0.1;
    // sonido de salto y de pisadas
    if (_wasGround && !player.onGround && player.vel.y > 1) audio.sfx('saltar');
    _wasGround = player.onGround;
    if (moving && player.onGround && !player.flying) {
      _pasoT -= dt;
      if (_pasoT <= 0) { audio.sfx('pisada'); _pasoT = controls.state.sprint ? 0.26 : 0.36; }
    } else _pasoT = 0;
    updateAvatar(player, dt, moving);
    mobs.update(dt, player);
    bosses.update(dt, player);
    updateMobBadge();
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
  if (world) processDirtyChunks(mode === 'jugar' ? 3 : 8);
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
  if (state.mundo.creador) {
    mobs.clear(); mobs.enabled = false;
    bosses.clear();
  } else {
    mobs.enabled = true;
    mobs.spawn();
    bosses.refreshBeacons();
  }
  updateMobBadge();
  updateBossBar();
  updateModoBadge();
  hotIndex = 0;
  updateHotbar();
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
    }
    app.appendChild(screens[name]);
  }
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

if (claveDesbloqueada()) showMenu();
else { mode = 'menu'; menuScreen.classList.add('hidden'); mountClave(() => showMenu()); }

// PWA: registrar service worker solo en build de producción
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// exponer para debug
window.__game = {
  state, POWERS, jugar, crearMundo,
  get world() { return world; },
  get player() { return player; },
  get mobs() { return mobs; },
  get bosses() { return bosses; },
  actions: { romper: breakBlock, poner: placeBlock, poder: activarPoderAccion },
};
