import * as THREE from 'three';

// Sala de pruebas (solo con la clave maestra): invoca cada enemigo, jefe o
// animal al lado del jugador para revisar cómo se ven y cómo se mueven.
// Antes de invocarlo en la arena, se muestra una vista previa 3D girando
// (mismo diseño con el que aparece en el juego) con un botón para saltar a
// la lucha desde ahí.

const ENEMIGOS = [
  ['sombra', 'Sombra'], ['veloz', 'Espectro'], ['saltarin', 'Brincón'],
  ['bruto', 'Bruto'], ['acechador', 'Acechador'],
  ['larguirucho', 'El Larguirucho'], ['gigante', 'El Gigante'],
  ['automata', 'El Autómata'],
];
const JEFES = [
  ['golem', 'Trol de las Rocas'], ['rayo', 'Dragón Tormenta'],
  ['ojo', 'Titán Ardiente'], ['coloso', 'Elfo Oscuro'],
];
const DINOS = [
  ['trex', '🦖 T-Rex'], ['braquiosaurio', '🦕 Braquiosaurio'],
  ['triceratops', '🦏 Triceratops'], ['raptor', '🦎 Raptor'],
];
const ANIMALES = [
  ['conejo', 'Conejo'], ['ciervo', 'Ciervo'], ['zorro', 'Zorro'],
  ['oveja', 'Oveja'], ['vaca', 'Vaca'], ['jabali', 'Jabalí'],
  ['oso', 'Oso'], ['tortuga', 'Tortuga'], ['pajaro', 'Pájaro'],
];

function disposeModelo(obj) {
  obj.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
  });
}

export function mountPruebas({ onVolver, onEnemigo, onJefe, onAnimal, onLimpiar, meshEnemigo, meshJefe, meshAnimal }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🧪 Sala de pruebas</h2>
    <p class="sub">Modo maestro. Toca un enemigo, jefe o animal para verlo girar en
      3D primero, y desde ahí saltas a la arena a pelear (o pruebas otro).</p>

    <h3 class="pr-h">Enemigos</h3>
    <div class="pr-grid" data-enem></div>

    <h3 class="pr-h">Jefes</h3>
    <div class="pr-grid" data-jefes></div>

    <h3 class="pr-h">Dinosaurios</h3>
    <div class="pr-grid" data-dinos></div>

    <h3 class="pr-h">Animales</h3>
    <div class="pr-grid" data-animales></div>

    <div class="row" style="margin-top:14px;justify-content:center">
      <button class="btn secondary" data-limpiar>🧹 Limpiar arena</button>
    </div>

    <div class="pr-preview-wrap" data-preview hidden>
      <div class="pr-preview">
        <h3 data-preview-nombre></h3>
        <canvas data-preview-canvas></canvas>
        <div class="row" style="gap:8px">
          <button class="btn small secondary" data-cerrar>← Elegir otro</button>
          <button class="btn small" data-luchar>⚔️ Saltar a la lucha</button>
        </div>
      </div>
    </div>
  `;
  el.querySelector('[data-volver]').addEventListener('click', () => { pararPreview(); onVolver(); });
  el.querySelector('[data-limpiar]').addEventListener('click', () => onLimpiar?.());

  // --- vista previa 3D (gira sola, misma malla con la que aparece en el juego) ---
  const previewWrap = el.querySelector('[data-preview]');
  const previewCanvas = el.querySelector('[data-preview-canvas]');
  const previewNombre = el.querySelector('[data-preview-nombre]');
  let renderer, scene, cam, modelo, raf, luchaCb = null;

  function iniciarRenderer() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 0.85); dl.position.set(3, 5, 4); scene.add(dl);
  }
  function sizePreview() {
    if (!renderer) return;
    const r = previewCanvas.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  }
  function animate() {
    raf = requestAnimationFrame(animate);
    if (modelo) modelo.rotation.y += 0.014;
    renderer.render(scene, cam);
  }
  function pararAnim() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function mostrarPreview(nombre, mesh, onLuchar) {
    iniciarRenderer();
    if (modelo) { scene.remove(modelo); disposeModelo(modelo); }
    modelo = mesh;
    scene.add(modelo);
    // encuadra la cámara según el tamaño real del modelo (van de 0.4 a algunos
    // MUY largos de hocico a cola, tipo 25+ de punta a punta, ej. Braquiosaurio).
    // El muñeco gira sobre el eje Y, así que la distancia se calcula con el
    // "cilindro" que lo envuelve alrededor de ese eje (radio = diagonal en el
    // plano X-Z) para que quepa entero en CUALQUIER ángulo de giro, no solo
    // de frente (de frente solo se ve ancho×alto, y sobraba mucho espacio).
    const box = new THREE.Box3().setFromObject(modelo);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const radioH = Math.hypot(size.x / 2, size.z / 2) || 0.3;
    const halfFov = (cam.fov * Math.PI / 180) / 2;
    const distV = (size.y / 2 || 0.3) / Math.tan(halfFov);
    const distH = radioH / Math.tan(halfFov);
    const dist = Math.max(distV, distH) * 1.2;
    cam.near = Math.max(0.05, dist / 200); cam.far = dist * 6; cam.updateProjectionMatrix();
    cam.position.set(center.x, center.y + size.y * 0.08, center.z + dist);
    cam.lookAt(center.x, center.y, center.z);
    previewNombre.textContent = nombre;
    previewWrap.hidden = false;
    luchaCb = onLuchar;
    if (!raf) animate();
    setTimeout(sizePreview, 30);
  }
  function pararPreview() {
    previewWrap.hidden = true;
    pararAnim();
    if (modelo) { scene.remove(modelo); disposeModelo(modelo); modelo = null; }
  }
  el.querySelector('[data-cerrar]').addEventListener('click', pararPreview);
  el.querySelector('[data-luchar]').addEventListener('click', () => {
    const cb = luchaCb;
    pararPreview();
    cb?.();
  });
  addEventListener('resize', () => renderer && sizePreview());

  const fill = (sel, lista, cb, clase, meshFn) => {
    const cont = el.querySelector(sel);
    for (const [id, nombre] of lista) {
      const b = document.createElement('button');
      b.className = 'btn small ' + clase;
      b.textContent = nombre;
      b.addEventListener('click', () => {
        if (!meshFn) { cb?.(id); return; }
        const mesh = meshFn(id);
        if (!mesh) { cb?.(id); return; }
        mostrarPreview(nombre, mesh, () => cb?.(id));
      });
      cont.appendChild(b);
    }
  };
  fill('[data-enem]', ENEMIGOS, onEnemigo, 'secondary', meshEnemigo);
  fill('[data-jefes]', JEFES, onJefe, '', meshJefe);
  fill('[data-dinos]', DINOS, onAnimal, 'secondary', meshAnimal);
  fill('[data-animales]', ANIMALES, onAnimal, 'secondary', meshAnimal);

  return el;
}
