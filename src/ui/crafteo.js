import { state } from '../game/state.js';
import { FORMAS, CATEGORIAS, costoForma, puedeArmar, tengo, cosaNombre, cosaEmoji, dondeConseguir } from '../game/recetas.js';

// Libro de recetas: solo muestra QUÉ se puede armar y con qué. Para fabricar hay
// que ir al Tablero de armado (botón "Armar" → abre el tablero con la guía).
export function mountCrafteo({ onVolver, onArmar }) {
  const el = document.createElement('div');
  el.className = 'screen crafteo-screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>📖 Recetas</h2>
    <p class="sub compact">Toca <b>Armar</b> y colócalo en el tablero con su forma.</p>

    <div class="row cats" data-tabs></div>
    <div class="craft-list" data-recetas></div>

    <details class="inv-fold">
      <summary>🎒 Lo que tienes</summary>
      <div class="craft-inv" data-inv></div>
    </details>
    <p class="hint" data-guia></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  let cat = CATEGORIAS[0];
  const tabsEl = el.querySelector('[data-tabs]');
  const listaEl = el.querySelector('[data-recetas]');
  const invEl = el.querySelector('[data-inv]');
  const guiaEl = el.querySelector('[data-guia]');

  function pintar() {
    tabsEl.innerHTML = '';
    for (const c of CATEGORIAS) {
      const b = document.createElement('button');
      b.className = 'btn small ' + (c === cat ? '' : 'secondary');
      b.textContent = c;
      b.addEventListener('click', () => { cat = c; pintar(); });
      tabsEl.appendChild(b);
    }

    listaEl.innerHTML = '';
    for (const f of FORMAS.filter((x) => x.cat === cat)) {
      const cost = costoForma(f);
      const ok = puedeArmar(f, state.inventario);
      const card = document.createElement('div');
      card.className = 'craft-card' + (ok ? ' ok' : '');
      const ingr = Object.entries(cost).map(([c, n]) => {
        const t = tengo(state.inventario, c);
        return `<span class="ing ${t >= n ? 'si' : 'no'}">${cosaEmoji(c)} ${cosaNombre(c)} ${t}/${n}</span>`;
      }).join('');
      card.innerHTML = `
        <div class="cc-head"><span class="cc-emoji">${f.emoji}</span><b>${f.nombre}</b></div>
        <div class="cc-ing">${ingr}</div>
        ${f.pista ? `<div class="cc-pista">${f.pista}</div>` : ''}
        <button class="btn small" data-armar>🔧 Armar</button>
      `;
      card.querySelector('[data-armar]').addEventListener('click', () => onArmar?.(f));
      listaEl.appendChild(card);
    }

    invEl.innerHTML = '';
    const entradas = Object.entries(state.inventario).filter(([, n]) => n > 0);
    if (!entradas.length) invEl.innerHTML = '<span class="hint">Nada todavía. Rompe bloques, mina y caza.</span>';
    for (const [c, n] of entradas) {
      const chip = document.createElement('span');
      chip.className = 'inv-chip';
      chip.textContent = `${cosaEmoji(c)} ${cosaNombre(c)} ×${n}`;
      invEl.appendChild(chip);
    }

    const faltan = new Set();
    for (const f of FORMAS.filter((x) => x.cat === cat))
      for (const [c, need] of Object.entries(costoForma(f)))
        if (tengo(state.inventario, c) < need) faltan.add(c);
    guiaEl.innerHTML = faltan.size
      ? 'Te faltan: ' + [...faltan].map((c) => `<b>${cosaNombre(c)}</b> — ${dondeConseguir(c)}`).join(' · ')
      : '¡Tienes de todo para esta categoría!';
  }

  el.refresh = pintar;
  pintar();
  return el;
}
