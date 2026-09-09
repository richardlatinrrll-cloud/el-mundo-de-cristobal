import { state, save } from '../game/state.js';
import { TIPOS, TAMANOS } from '../engine/world.js';

// Pantalla "Mundos": elegir tipo, tamaño, semilla y modo creador.
export function mountMundos({ onVolver, onCrear }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🌍 Mundos</h2>
    <p class="sub">Elige cómo quieres que sea tu mundo. Lo que construyas se guarda.</p>

    <div style="width:min(760px,100%)">
      <p class="hint" style="margin:4px 0">Tipo de mundo</p>
      <div class="grid-cards" data-tipos style="max-height:34vh"></div>

      <div class="row" style="margin-top:12px; align-items:center">
        <span class="hint">Tamaño:</span>
        <div class="row" data-tamanos></div>
      </div>

      <div class="row" style="margin-top:10px; align-items:center">
        <span class="hint">Semilla:</span>
        <input type="number" data-semilla class="semilla-input" />
        <button class="btn small secondary" data-semilla-rnd>🎲 Aleatoria</button>
      </div>

      <label class="row" style="margin-top:12px; align-items:center; cursor:pointer; justify-content:flex-start">
        <input type="checkbox" data-creador style="width:20px;height:20px" />
        <span><b>Modo creador</b> — vuelas, rompes al toque, sin enemigos. Para construir tranquilo.</span>
      </label>

      <p class="hint" data-aviso style="margin-top:8px"></p>

      <div class="row" style="margin-top:14px">
        <button class="btn" data-crear>✨ Crear este mundo</button>
      </div>
      <p class="hint" style="margin-top:6px">Ojo: al crear un mundo nuevo empiezas de cero. Lo que construiste en el mundo anterior queda guardado solo si vuelves al mismo tipo, tamaño y semilla.</p>
    </div>
  `;

  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  let sel = { ...state.mundo };

  const tiposEl = el.querySelector('[data-tipos]');
  const tamanosEl = el.querySelector('[data-tamanos]');
  const semillaEl = el.querySelector('[data-semilla]');
  const creadorEl = el.querySelector('[data-creador]');
  const avisoEl = el.querySelector('[data-aviso]');

  function pintar() {
    tiposEl.innerHTML = '';
    for (const [id, t] of Object.entries(TIPOS)) {
      const c = document.createElement('button');
      c.className = 'card';
      c.style.outline = sel.tipo === id ? '2px solid var(--accent)' : 'none';
      c.innerHTML = `<div class="emoji">${t.emoji}</div><div class="name">${t.label}</div>`;
      c.addEventListener('click', () => { sel.tipo = id; pintar(); });
      tiposEl.appendChild(c);
    }
    tamanosEl.innerHTML = '';
    for (const [id, t] of Object.entries(TAMANOS)) {
      const b = document.createElement('button');
      b.className = 'btn small ' + (sel.tamano === id ? '' : 'secondary');
      b.textContent = t.label;
      b.addEventListener('click', () => { sel.tamano = id; pintar(); });
      tamanosEl.appendChild(b);
    }
    semillaEl.value = sel.semilla;
    creadorEl.checked = !!sel.creador;
    avisoEl.textContent = sel.tamano === 'gigante'
      ? '“Gigante” solo en teléfonos/PC potentes: usa mucha memoria y tarda ~2 s en crearse.'
      : sel.tamano === 'grande'
      ? '“Grande” puede ir algo lento en teléfonos antiguos.'
      : '';
  }

  el.querySelector('[data-semilla-rnd]').addEventListener('click', () => {
    sel.semilla = (Math.random() * 1e9) | 0; pintar();
  });
  semillaEl.addEventListener('change', () => { sel.semilla = (parseInt(semillaEl.value) || 1) | 0; });
  creadorEl.addEventListener('change', () => { sel.creador = creadorEl.checked; });

  el.querySelector('[data-crear]').addEventListener('click', () => {
    const cambioBase =
      sel.tipo !== state.mundo.tipo ||
      sel.tamano !== state.mundo.tamano ||
      (sel.semilla | 0) !== (state.mundo.semilla | 0);
    state.mundo = { tipo: sel.tipo, tamano: sel.tamano, semilla: sel.semilla | 0, creador: !!sel.creador };
    if (cambioBase) { state.mundoEdits = {}; state.inventario = {}; }  // mundo nuevo => desde cero
    save();
    onCrear();
  });

  el.refresh = () => { sel = { ...state.mundo }; pintar(); };
  pintar();
  return el;
}
