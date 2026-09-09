import { state, save } from '../game/state.js';
import { formaEnTablero, costoForma, centrarPatron, cosaNombre, cosaEmoji, dondeConseguir, ARMADURA } from '../game/recetas.js';
import { TOOLS } from '../game/tools.js';
import { BLOCKS } from '../engine/blocks.js';
import { audio } from '../game/audio.js';
import { toast } from './toast.js';

// Tablero de armado 3×3: hay que COLOCAR los materiales en la forma correcta.
// Si viene una `guia` (receta elegida en el libro), se muestran cubos
// transparentes con el material que va en cada casilla.
export function mountTablero({ onVolver, onLista, onCambio }) {
  const el = document.createElement('div');
  el.className = 'screen tablero-screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <button class="btn small secondary" data-lista>📖 Recetas</button>
      <div class="spacer"></div>
    </div>
    <h2>🔧 Tablero de armado</h2>
    <div class="tab-obj" data-obj></div>

    <div class="tablero-wrap">
      <div class="tablero-grid" data-grid></div>
      <div class="tablero-res" data-res></div>
    </div>
    <div class="row" style="gap:6px;justify-content:center">
      <button class="btn small secondary" data-limpiar>🧹 Limpiar</button>
    </div>

    <p class="hint">Toca un material y luego la casilla:</p>
    <div class="tab-pal" data-pal></div>
    <p class="hint" data-leyenda></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);
  el.querySelector('[data-lista]').addEventListener('click', onLista);

  const gridEl = el.querySelector('[data-grid]');
  const resEl = el.querySelector('[data-res]');
  const palEl = el.querySelector('[data-pal]');
  const objEl = el.querySelector('[data-obj]');
  const leyEl = el.querySelector('[data-leyenda]');

  let board = [[null, null, null], [null, null, null], [null, null, null]];
  let sel = null;
  let guia = null;            // receta objetivo (o null = libre)
  let ghost = null;           // patrón centrado de la guía

  const celdas = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const cell = document.createElement('button');
    cell.className = 'tab-cell';
    cell.addEventListener('click', () => {
      if (board[r][c]) { board[r][c] = null; }
      else {
        // si hay guía y la casilla tiene fantasma, coloca ESE material
        const quiere = ghost ? ghost[r][c] : null;
        const poner = quiere || sel;
        if (!poner) return;
        if (enBoard(poner) >= inv(poner)) { toast(`No te alcanza: ${cosaNombre(poner)}`, 1100); return; }
        board[r][c] = poner;
      }
      pintar();
    });
    gridEl.appendChild(cell);
    celdas.push(cell);
  }

  function enBoard(id) { let n = 0; for (const row of board) for (const c of row) if (c === id) n++; return n; }
  function inv(id) { return state.inventario[id] || 0; }
  function limpiar() { board = [[null, null, null], [null, null, null], [null, null, null]]; pintar(); }
  el.querySelector('[data-limpiar]').addEventListener('click', () => { limpiar(); audio.sfx('menu'); });

  function pintar() {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const cell = celdas[r * 3 + c];
      const val = board[r][c];
      const fant = ghost ? ghost[r][c] : null;
      cell.className = 'tab-cell' + (val ? ' full' : (fant ? ' ghost' : ''));
      if (val) cell.textContent = cosaEmoji(val);
      else if (fant) cell.textContent = cosaEmoji(fant);
      else cell.textContent = '';
    }

    // objetivo
    if (guia) {
      objEl.innerHTML = `Arma: <b>${guia.emoji} ${guia.nombre}</b>${guia.pista ? ` — <span class="hint">${guia.pista}</span>` : ''}`;
      objEl.hidden = false;
    } else objEl.hidden = true;

    // resultado
    const f = formaEnTablero(board);
    resEl.innerHTML = '';
    if (f && (!guia || f.id === guia.id)) {
      const cost = costoForma(f);
      const alcanza = Object.entries(cost).every(([k, v]) => inv(k) >= v);
      resEl.innerHTML = `
        <div class="tab-flecha">➜</div>
        <div class="tab-out">
          <div class="tab-out-emoji">${f.emoji}</div>
          <b>${f.nombre}</b>
          <button class="btn small ${alcanza ? '' : 'secondary'}" data-fab ${alcanza ? '' : 'disabled'}>Fabricar</button>
        </div>`;
      resEl.querySelector('[data-fab]')?.addEventListener('click', () => fabricar(f));
    } else {
      resEl.innerHTML = `<div class="tab-hint-res">${guia ? 'Rellena los cubos marcados…' : 'Coloca los materiales en su forma…'}</div>`;
    }

    // paleta
    palEl.innerHTML = '';
    const cosas = Object.entries(state.inventario).filter(([, n]) => n > 0)
      .filter(([k]) => !/^\d+$/.test(k) || BLOCKS[+k]);
    if (!cosas.length) palEl.innerHTML = '<span class="hint">No tienes materiales. Rompe bloques y caza animales.</span>';
    for (const [k, n] of cosas) {
      const chip = document.createElement('button');
      chip.className = 'tab-chip' + (sel === k ? ' sel' : '');
      chip.innerHTML = `${cosaEmoji(k)} <span>${cosaNombre(k)}</span> <b>×${n}</b>`;
      chip.addEventListener('click', () => { sel = (sel === k ? null : k); pintar(); });
      palEl.appendChild(chip);
    }

    // leyenda + de dónde sacar lo que te falta
    if (guia) {
      const cost = costoForma(guia);
      leyEl.innerHTML = 'Necesitas: ' + Object.entries(cost)
        .map(([k, v]) => `${cosaEmoji(k)} <b>${cosaNombre(k)}</b> ×${v}`).join(' · ');
      const faltan = Object.entries(cost).filter(([k, v]) => inv(k) < v);
      if (faltan.length) {
        leyEl.innerHTML += '<br><span class="hint">Te falta: ' + faltan
          .map(([k]) => `<b>${cosaNombre(k)}</b> — ${dondeConseguir(k)}`).join(' · ') + '</span>';
      }
    } else {
      leyEl.innerHTML = 'Ejemplos: <b>Pico</b> = 3 arriba + 2 palos abajo · <b>Espada</b> = 2 en columna + palo.';
    }
  }

  function fabricar(f) {
    const cost = costoForma(f);
    for (const [k, v] of Object.entries(cost)) if ((state.inventario[k] || 0) < v) return;
    for (const [k, v] of Object.entries(cost)) {
      state.inventario[k] -= v;
      if (state.inventario[k] <= 0) delete state.inventario[k];
    }
    for (const [c, v] of Object.entries(f.da)) {
      if (TOOLS[c]) { if (!state.herramientas.includes(c)) { state.herramientas.push(c); state.herramienta = c; } }
      else if (ARMADURA.includes(c)) { state.armadura = state.armadura || []; if (!state.armadura.includes(c)) state.armadura.push(c); }
      else state.inventario[c] = (state.inventario[c] || 0) + v;
    }
    save();
    audio.sfx('medalla');
    toast(`✅ ${f.nombre}`);
    limpiar();
    onCambio?.();
  }

  el.setGuia = (f) => { guia = f || null; ghost = f ? centrarPatron(f) : null; sel = null; limpiar(); };
  el.refresh = pintar;
  pintar();
  return el;
}
