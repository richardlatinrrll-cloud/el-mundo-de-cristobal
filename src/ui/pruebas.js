// Sala de pruebas (solo con la clave maestra): invoca cada enemigo y cada jefe
// al lado del jugador para revisar cómo se ven y cómo se mueven, sin buscarlos.

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

export function mountPruebas({ onVolver, onEnemigo, onJefe, onLimpiar }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🧪 Sala de pruebas</h2>
    <p class="sub">Modo maestro. Toca un enemigo o jefe: apareces en una arena
      plana con él enfrente para verlo, mirar sus movimientos y pelear.</p>

    <h3 class="pr-h">Enemigos</h3>
    <div class="pr-grid" data-enem></div>

    <h3 class="pr-h">Jefes</h3>
    <div class="pr-grid" data-jefes></div>

    <div class="row" style="margin-top:14px;justify-content:center">
      <button class="btn secondary" data-limpiar>🧹 Limpiar arena</button>
    </div>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);
  el.querySelector('[data-limpiar]').addEventListener('click', () => onLimpiar?.());

  const enemEl = el.querySelector('[data-enem]');
  for (const [id, nombre] of ENEMIGOS) {
    const b = document.createElement('button');
    b.className = 'btn small secondary';
    b.textContent = nombre;
    b.addEventListener('click', () => onEnemigo?.(id));
    enemEl.appendChild(b);
  }
  const jefesEl = el.querySelector('[data-jefes]');
  for (const [id, nombre] of JEFES) {
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = nombre;
    b.addEventListener('click', () => onJefe?.(id));
    jefesEl.appendChild(b);
  }

  return el;
}
