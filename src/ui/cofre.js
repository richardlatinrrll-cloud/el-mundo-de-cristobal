import { state, save } from '../game/state.js';
import { cosaNombre, cosaEmoji } from '../game/recetas.js';
import { audio } from '../game/audio.js';

// Pantalla del Cofre: a la izquierda lo que hay en el cofre, a la derecha tu
// mochila. Tocas un montón para moverlo. El cofre no tiene tope; la mochila sí.

export function mountCofre({ onVolver, cargaMax = 200 }) {
  const el = document.createElement('div');
  el.className = 'screen cofre-screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Cerrar</button>
      <div class="spacer"></div>
    </div>
    <h2>📦 Cofre</h2>
    <p class="sub">Toca un montón para moverlo. El cofre guarda todo lo que
      quieras; la mochila tiene tope (${cargaMax}).</p>
    <div class="cofre-cols">
      <div class="cofre-col">
        <h3 class="pr-h">📦 En el cofre</h3>
        <div class="cofre-grid" data-cofre></div>
        <button class="btn small" data-sacar>Sacar todo →</button>
      </div>
      <div class="cofre-col">
        <h3 class="pr-h">🎒 Mochila <span class="cofre-carga" data-carga></span></h3>
        <div class="cofre-grid" data-bolsa></div>
        <button class="btn small" data-guardar>← Guardar todo</button>
      </div>
    </div>
  `;

  let key = null;   // "x,y,z" del cofre abierto

  const cont = state.cofres;
  const libre = () => cargaMax - Object.values(state.inventario).reduce((s, n) => s + n, 0);

  function mover(desde, hacia, id, cant) {
    if (desde[id] == null) return;
    cant = Math.min(cant, desde[id]);
    if (hacia === state.inventario) cant = Math.min(cant, libre());   // tope de la mochila
    if (cant <= 0) { audio.sfx('fallo'); return; }
    desde[id] -= cant;
    if (desde[id] <= 0) delete desde[id];
    hacia[id] = (hacia[id] || 0) + cant;
    audio.sfx('poner');
    save();
    pintar();
    el.dispatchEvent(new CustomEvent('cambio'));
  }

  function grid(host, obj, alOtro) {
    host.innerHTML = '';
    const items = Object.entries(obj).filter(([, n]) => n > 0);
    if (!items.length) { host.innerHTML = '<div class="cofre-vacio">— vacío —</div>'; return; }
    for (const [id, n] of items.sort((a, b) => a[0].localeCompare(b[0]))) {
      const b = document.createElement('button');
      b.className = 'cofre-item';
      b.innerHTML = `<span class="ci-emoji">${cosaEmoji(id)}</span><span class="ci-n">${n}</span><span class="ci-name">${cosaNombre(id)}</span>`;
      b.title = cosaNombre(id);
      b.addEventListener('click', () => alOtro(id, n));
      host.appendChild(b);
    }
  }

  function pintar() {
    const cof = key ? (cont[key] = cont[key] || {}) : {};
    grid(el.querySelector('[data-cofre]'), cof, (id) => mover(cof, state.inventario, id, cof[id]));
    grid(el.querySelector('[data-bolsa]'), state.inventario, (id) => mover(state.inventario, cof, id, state.inventario[id]));
    el.querySelector('[data-carga]').textContent = `${cargaMax - libre()}/${cargaMax}`;
  }

  el.querySelector('[data-volver]').addEventListener('click', onVolver);
  el.querySelector('[data-guardar]').addEventListener('click', () => {
    if (!key) return;
    const cof = cont[key] = cont[key] || {};
    for (const [id, n] of Object.entries({ ...state.inventario })) mover(state.inventario, cof, id, n);
  });
  el.querySelector('[data-sacar]').addEventListener('click', () => {
    if (!key) return;
    const cof = cont[key] || {};
    for (const [id, n] of Object.entries({ ...cof })) mover(cof, state.inventario, id, n);
  });

  el.abrir = (k) => { key = k; pintar(); };
  return el;
}
