// Sala de pruebas (solo con la clave maestra): invoca cada enemigo, jefe o
// animal al lado del jugador para revisar cómo se ven y cómo se mueven.

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

export function mountPruebas({ onVolver, onEnemigo, onJefe, onAnimal, onLimpiar }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🧪 Sala de pruebas</h2>
    <p class="sub">Modo maestro. Toca un enemigo, jefe o animal: apareces en una
      arena plana con él enfrente para verlo, mirar sus movimientos y pelear.</p>

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
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);
  el.querySelector('[data-limpiar]').addEventListener('click', () => onLimpiar?.());

  const fill = (sel, lista, cb, clase) => {
    const cont = el.querySelector(sel);
    for (const [id, nombre] of lista) {
      const b = document.createElement('button');
      b.className = 'btn small ' + clase;
      b.textContent = nombre;
      b.addEventListener('click', () => cb?.(id));
      cont.appendChild(b);
    }
  };
  fill('[data-enem]', ENEMIGOS, onEnemigo, 'secondary');
  fill('[data-jefes]', JEFES, onJefe, '');
  fill('[data-dinos]', DINOS, onAnimal, 'secondary');
  fill('[data-animales]', ANIMALES, onAnimal, 'secondary');

  return el;
}
