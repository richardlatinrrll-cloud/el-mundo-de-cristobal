import * as THREE from 'three';
import { state, save } from '../game/state.js';
import { SKIN_W, SKIN_H, makeAvatar, drawDefaultSkin, paintSkin, PRESETS_SKIN } from './skin-model.js';
import { toast } from '../ui/toast.js';

const PALETTE = [
  '#f1c9a5', '#e8b98c', '#dca87c', '#c48a52', '#8a5a2b', '#5b3a1e', '#3a2a1a', '#1b1b1b',
  '#ffffff', '#c0c0c0', '#6b7280', '#0c2340', '#2b3a6b', '#3aa0ff', '#00e5d0', '#2bb673',
  '#4ade80', '#a8e10c', '#ffd166', '#ff8a3d', '#e23b3b', '#8b1e1e', '#ff5da2', '#7b3ff2',
];

const PRESET_BOTONES = [
  ['clasico', '👦 Clásico'], ['aventurera', '🧭 Aventurera'],
  ['heroe', '🦸 Héroe'], ['invierno', '❄️ Invierno'],
];

const GUIDES = [
  ['Cabeza', 0, 0, 32, 16], ['Cuerpo', 16, 16, 40, 32],
  ['Brazo der.', 40, 16, 56, 32], ['Pierna der.', 0, 16, 16, 32],
  ['Brazo izq.', 32, 48, 48, 64], ['Pierna izq.', 16, 48, 32, 64],
];

export function mountPersonajes({ onVolver }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🎨 Personajes</h2>
    <p class="sub">Elige un personaje para empezar y dibújalo a tu gusto.</p>

    <div class="row" data-presets style="margin-bottom:4px"></div>

    <div class="skin-editor">
      <div class="paint">
        <div class="canvas-holder"><canvas id="skin-canvas" width="${SKIN_W}" height="${SKIN_H}"></canvas></div>
        <div class="tools">
          <button class="tool active" data-tool="lapiz" title="Pincel">✏️</button>
          <button class="tool" data-tool="borrar" title="Borrador">🧽</button>
          <button class="tool" data-tool="balde" title="Rellenar zona">🪣</button>
          <button class="tool" data-tool="cuenta" title="Copiar color">💧</button>
          <button class="tool" data-act="deshacer" title="Deshacer">↩️</button>
          <span class="tool-sep"></span>
          <button class="tool" data-brush="1" title="Pincel fino">·</button>
          <button class="tool active" data-brush="2" title="Pincel medio">●</button>
          <button class="tool" data-brush="3" title="Pincel grueso">⬤</button>
          <button class="tool" data-act="espejo" title="Cara simétrica">🙂</button>
          <button class="tool active" data-act="guias" title="Mostrar guías">▦</button>
        </div>
        <div class="palette" data-palette></div>
      </div>
      <div class="preview-col">
        <canvas id="skin-preview"></canvas>
        <div class="row" style="gap:6px;margin-top:4px">
          <button class="btn small secondary" data-rot="-1">⟲</button>
          <button class="btn small secondary" data-rot="0">⏸️</button>
          <button class="btn small secondary" data-rot="1">⟳</button>
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:8px">
      <button class="btn small" data-guardar>💾 Guardar</button>
      <button class="btn small secondary" data-importar>📥 Importar PNG</button>
      <button class="btn small secondary" data-exportar>📤 Exportar PNG</button>
      <input type="file" accept="image/png" data-file hidden />
    </div>
    <p class="hint">Skins guardadas (toca para usarla):</p>
    <div class="skins-strip" data-strip></div>
  `;
  el.querySelector('[data-volver]').addEventListener('click', () => { stopPreview(); onVolver(); });

  const canvas = el.querySelector('#skin-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let tool = 'lapiz';
  let brush = 2;
  let color = PALETTE[20];
  let showGuides = true;
  let espejo = false;
  const history = [];

  function loadIntoCanvas(png) {
    if (png) {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0, 0, SKIN_W, SKIN_H); ctx.drawImage(img, 0, 0, SKIN_W, SKIN_H); refreshPreview(); };
      img.src = png;
    } else {
      drawDefaultSkin(ctx);
      refreshPreview();
    }
  }
  function loadPreset(nombre) {
    pushHistory();
    if (nombre === 'vacio') ctx.clearRect(0, 0, SKIN_W, SKIN_H);
    else paintSkin(ctx, PRESETS_SKIN[nombre] || PRESETS_SKIN.clasico);
    refreshPreview();
  }

  function pushHistory() {
    history.push(ctx.getImageData(0, 0, SKIN_W, SKIN_H));
    if (history.length > 40) history.shift();
  }
  function undo() { if (history.length) { ctx.putImageData(history.pop(), 0, 0); refreshPreview(); } }

  function pointerPixel(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return [Math.floor((cx / r.width) * SKIN_W), Math.floor((cy / r.height) * SKIN_H)];
  }

  function stamp(x, y) {
    const off = brush >> 1;
    for (let dy = 0; dy < brush; dy++)
      for (let dx = 0; dx < brush; dx++) {
        const px = x - off + dx, py = y - off + dy;
        if (px < 0 || py < 0 || px >= SKIN_W || py >= SKIN_H) continue;
        if (tool === 'borrar') ctx.clearRect(px, py, 1, 1);
        else { ctx.fillStyle = color; ctx.fillRect(px, py, 1, 1); }
      }
  }
  function putPixel(x, y) {
    stamp(x, y);
    // cara simétrica: espejo dentro de la cara (cols 8-15, filas 8-15)
    if (espejo && x >= 8 && x <= 15 && y >= 8 && y <= 15) stamp(23 - x, y);
  }

  function pickColor(x, y) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return;
    color = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    renderPalette();
  }

  function fill(x, y) {
    const img = ctx.getImageData(0, 0, SKIN_W, SKIN_H);
    const data = img.data;
    const at = (x, y) => (y * SKIN_W + x) * 4;
    const s = at(x, y);
    const target = [data[s], data[s + 1], data[s + 2], data[s + 3]];
    const rgb = hexToRgb(color);
    const repl = [rgb[0], rgb[1], rgb[2], 255];
    if (target.every((v, i) => v === repl[i])) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= SKIN_W || cy >= SKIN_H) continue;
      const o = at(cx, cy);
      if (data[o] !== target[0] || data[o + 1] !== target[1] || data[o + 2] !== target[2] || data[o + 3] !== target[3]) continue;
      data[o] = repl[0]; data[o + 1] = repl[1]; data[o + 2] = repl[2]; data[o + 3] = repl[3];
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(img, 0, 0);
  }

  let drawing = false;
  function onDown(e) {
    e.preventDefault();
    const [x, y] = pointerPixel(e);
    if (tool === 'cuenta') { pickColor(x, y); return; }
    pushHistory();
    if (tool === 'balde') { fill(x, y); refreshPreview(); return; }
    drawing = true;
    putPixel(x, y);
    refreshPreview();
  }
  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const [x, y] = pointerPixel(e);
    putPixel(x, y);
    refreshPreview();
  }
  function onUp() { drawing = false; }

  canvas.addEventListener('mousedown', onDown);
  addEventListener('mousemove', onMove);
  addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  addEventListener('touchend', onUp);

  // guías superpuestas
  const guideCanvas = document.createElement('canvas');
  guideCanvas.width = SKIN_W; guideCanvas.height = SKIN_H;
  guideCanvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; image-rendering:pixelated;';
  el.querySelector('.canvas-holder').appendChild(guideCanvas);
  function drawGuides() {
    const g = guideCanvas.getContext('2d');
    g.clearRect(0, 0, SKIN_W, SKIN_H);
    if (!showGuides) return;
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 0.5;
    for (const [, x0, y0, x1, y1] of GUIDES) g.strokeRect(x0 + 0.25, y0 + 0.25, x1 - x0 - 0.5, y1 - y0 - 0.5);
  }

  // presets
  const presetsEl = el.querySelector('[data-presets]');
  for (const [id, label] of PRESET_BOTONES) {
    const b = document.createElement('button');
    b.className = 'btn small secondary'; b.textContent = label;
    b.addEventListener('click', () => loadPreset(id));
    presetsEl.appendChild(b);
  }
  const bv = document.createElement('button');
  bv.className = 'btn small secondary'; bv.textContent = '⬜ Vacío';
  bv.addEventListener('click', () => loadPreset('vacio'));
  presetsEl.appendChild(bv);

  // paleta
  const paletteEl = el.querySelector('[data-palette]');
  function renderPalette() {
    paletteEl.innerHTML = '';
    for (const c of PALETTE) {
      const s = document.createElement('button');
      s.className = 'swatch' + (c === color ? ' active' : '');
      s.style.background = c;
      s.addEventListener('click', () => { color = c; renderPalette(); });
      paletteEl.appendChild(s);
    }
  }

  // herramientas
  el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
    tool = b.dataset.tool;
    el.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('active', x === b));
  }));
  el.querySelectorAll('[data-brush]').forEach((b) => b.addEventListener('click', () => {
    brush = +b.dataset.brush;
    el.querySelectorAll('[data-brush]').forEach((x) => x.classList.toggle('active', x === b));
  }));
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'deshacer') return undo();
    if (a === 'guias') { showGuides = !showGuides; drawGuides(); b.classList.toggle('active', showGuides); }
    if (a === 'espejo') { espejo = !espejo; b.classList.toggle('active', espejo); toast(espejo ? 'Cara simétrica: ON' : 'Cara simétrica: OFF'); }
  }));

  // vista previa 3D
  const previewCanvas = el.querySelector('#skin-preview');
  let renderer, scene, cam, avatar, previewTex, raf, rot = 0.012;

  function startPreview() {
    renderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    sizePreview();
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    cam.position.set(0, 1, 3.4);
    cam.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(2, 4, 3); scene.add(dl);
    previewTex = new THREE.CanvasTexture(canvas);
    previewTex.magFilter = THREE.NearestFilter;
    previewTex.minFilter = THREE.NearestFilter;
    previewTex.colorSpace = THREE.SRGBColorSpace;
    avatar = makeAvatar(previewTex);
    scene.add(avatar);
    animate();
  }
  function sizePreview() {
    const r = previewCanvas.getBoundingClientRect();
    if (r.width) renderer.setSize(r.width, r.height, false);
    if (cam && r.width) { cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
  }
  function animate() {
    raf = requestAnimationFrame(animate);
    if (avatar) avatar.rotation.y += rot;
    renderer.render(scene, cam);
  }
  function refreshPreview() { if (previewTex) previewTex.needsUpdate = true; drawGuides(); }
  function stopPreview() { cancelAnimationFrame(raf); if (renderer) renderer.dispose(); renderer = scene = cam = avatar = previewTex = null; }
  addEventListener('resize', () => renderer && sizePreview());
  el.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => {
    rot = +b.dataset.rot * 0.03;
  }));

  // guardar / skins
  const strip = el.querySelector('[data-strip]');
  function renderStrip() {
    strip.innerHTML = '';
    if (!state.skins.length) { strip.innerHTML = '<span class="hint">Aún no guardas ninguna.</span>'; return; }
    for (const s of state.skins) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px';
      const img = document.createElement('img');
      img.className = 'skin-thumb' + (s.id === state.skinActiva ? ' active' : '');
      img.src = s.png; img.title = s.nombre;
      img.addEventListener('click', () => { state.skinActiva = s.id; save(); renderStrip(); toast(`Skin activa: ${s.nombre}`); });
      const del = document.createElement('button');
      del.className = 'btn ghost'; del.textContent = 'borrar'; del.style.fontSize = '11px';
      del.addEventListener('click', () => {
        state.skins = state.skins.filter((x) => x.id !== s.id);
        if (state.skinActiva === s.id) state.skinActiva = state.skins[0]?.id || null;
        save(); renderStrip();
      });
      wrap.append(img, del);
      strip.appendChild(wrap);
    }
  }

  el.querySelector('[data-guardar]').addEventListener('click', () => {
    const nombre = prompt('Nombre del personaje:', `Personaje ${state.skins.length + 1}`);
    if (nombre === null) return;
    const id = 's' + Date.now().toString(36);
    state.skins.push({ id, nombre: nombre || `Personaje ${state.skins.length + 1}`, png: canvas.toDataURL('image/png') });
    state.skinActiva = id;
    save(); renderStrip();
    toast('💾 Guardado y activado');
  });

  el.querySelector('[data-exportar]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png'); a.download = 'skin.png'; a.click();
  });
  const fileInput = el.querySelector('[data-file]');
  el.querySelector('[data-importar]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { pushHistory(); loadIntoCanvas(reader.result); toast('PNG importado'); };
    reader.readAsDataURL(f);
    fileInput.value = '';
  });

  el.refresh = () => {
    renderPalette();
    drawGuides();
    const active = state.skins.find((s) => s.id === state.skinActiva);
    loadIntoCanvas(active?.png || null);
    renderStrip();
    if (!renderer) startPreview();
    setTimeout(sizePreview, 60);
  };

  return el;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
