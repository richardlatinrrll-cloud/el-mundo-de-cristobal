import { state, save } from '../game/state.js';
import { RECETAS, CATEGORIAS, puedeCraftear, craftear, tengo, cosaNombre, cosaEmoji, dondeConseguir, MATERIALES } from '../game/recetas.js';
import { TOOLS } from '../game/tools.js';
import { audio } from '../game/audio.js';
import { toast } from './toast.js';

export function mountCrafteo({ onVolver, onCambio }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🔨 Crafteo</h2>
    <p class="sub">Junta materiales del mundo y fabrica cosas. En verde: ya lo puedes hacer.</p>

    <div class="row" data-tabs style="margin-bottom:4px"></div>
    <div class="craft-list" data-lista></div>

    <p class="hint" style="margin-top:10px">Lo que tienes:</p>
    <div class="craft-inv" data-inv></div>
    <p class="hint" data-guia></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  let cat = CATEGORIAS[0];
  const tabsEl = el.querySelector('[data-tabs]');
  const listaEl = el.querySelector('[data-lista]');
  const invEl = el.querySelector('[data-inv]');
  const guiaEl = el.querySelector('[data-guia]');

  function pintar() {
    // pestañas
    tabsEl.innerHTML = '';
    for (const c of CATEGORIAS) {
      const b = document.createElement('button');
      b.className = 'btn small ' + (c === cat ? '' : 'secondary');
      b.textContent = c;
      b.addEventListener('click', () => { cat = c; pintar(); });
      tabsEl.appendChild(b);
    }
    // recetas de la categoría
    listaEl.innerHTML = '';
    for (const r of RECETAS.filter((x) => x.cat === cat)) {
      const ok = puedeCraftear(r, state.inventario);
      const card = document.createElement('div');
      card.className = 'craft-card' + (ok ? ' ok' : '');
      const ingr = Object.entries(r.necesita).map(([c, n]) => {
        const tiene = tengo(state.inventario, c);
        return `<span class="ing ${tiene >= n ? 'si' : 'no'}">${cosaEmoji(c)} ${cosaNombre(c)} ${tiene}/${n}</span>`;
      }).join('');
      card.innerHTML = `
        <div class="cc-head"><span class="cc-emoji">${r.emoji}</span><b>${r.nombre}</b></div>
        <div class="cc-ing">${ingr}</div>
        ${r.pista ? `<div class="cc-pista">${r.pista}</div>` : ''}
        <button class="btn small ${ok ? '' : 'secondary'}" data-hacer ${ok ? '' : 'disabled'}>Fabricar</button>
      `;
      card.querySelector('[data-hacer]').addEventListener('click', () => {
        if (craftear(r, state.inventario)) {
          // si fabricó una herramienta/arma, agrégala a la lista de herramientas
          for (const c of Object.keys(r.da)) {
            if (TOOLS[c] && !state.herramientas.includes(c)) { state.herramientas.push(c); state.herramienta = c; }
          }
          save();
          audio.sfx('medalla');
          toast(`✅ ${r.nombre}`);
          onCambio?.();
          pintar();
        }
      });
      listaEl.appendChild(card);
    }
    // inventario
    invEl.innerHTML = '';
    const entradas = Object.entries(state.inventario).filter(([, n]) => n > 0);
    if (!entradas.length) invEl.innerHTML = '<span class="hint">Nada todavía. Rompe bloques y minerales.</span>';
    for (const [c, n] of entradas) {
      const chip = document.createElement('span');
      chip.className = 'inv-chip';
      chip.textContent = `${cosaEmoji(c)} ${cosaNombre(c)} ×${n}`;
      invEl.appendChild(chip);
    }
    // guía de materiales que faltan para la categoría
    const faltan = new Set();
    for (const r of RECETAS.filter((x) => x.cat === cat))
      for (const [c, need] of Object.entries(r.necesita))
        if (tengo(state.inventario, c) < need) faltan.add(c);
    guiaEl.innerHTML = faltan.size
      ? 'Te faltan: ' + [...faltan].map((c) => `<b>${cosaNombre(c)}</b> — ${dondeConseguir(c)}`).join(' · ')
      : '¡Tienes de todo para esta categoría!';
  }

  el.refresh = pintar;
  pintar();
  return el;
}
