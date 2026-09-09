import { state, save } from '../game/state.js';
import { formaEnTablero, costoForma, cosaNombre, cosaEmoji, ARMADURA } from '../game/recetas.js';
import { TOOLS } from '../game/tools.js';
import { BLOCKS } from '../engine/blocks.js';
import { audio } from '../game/audio.js';
import { toast } from './toast.js';

// Tablero de armado 3×3: hay que COLOCAR los materiales en la forma correcta
// (como en Minecraft). Entrena paciencia y "ver" la figura de cada herramienta.
export function mountTablero({ onVolver, onLista, onCambio }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <button class="btn small secondary" data-lista>📋 Lista de recetas</button>
      <div class="spacer"></div>
    </div>
    <h2>🔧 Tablero de armado</h2>
    <p class="sub">Elige un material y tócalo en las casillas para formar la figura.
      Toca una casilla llena para quitar. Cuando la forma esté bien, aparece "Fabricar".</p>

    <div class="tablero-wrap">
      <div class="tablero-grid" data-grid></div>
      <div class="tablero-res" data-res></div>
    </div>
    <div class="row" style="gap:6px;justify-content:center">
      <button class="btn small secondary" data-limpiar>🧹 Limpiar</button>
    </div>

    <p class="hint">Toca para elegir material:</p>
    <div class="tab-pal" data-pal></div>
    <p class="hint" data-guia></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);
  el.querySelector('[data-lista]').addEventListener('click', onLista);

  const gridEl = el.querySelector('[data-grid]');
  const resEl = el.querySelector('[data-res]');
  const palEl = el.querySelector('[data-pal]');
  const guiaEl = el.querySelector('[data-guia]');

  let board = [[null, null, null], [null, null, null], [null, null, null]];
  let sel = null;

  // la grilla se construye UNA vez; solo se actualiza el contenido
  const celdas = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const cell = document.createElement('button');
    cell.className = 'tab-cell';
    cell.addEventListener('click', () => {
      if (board[r][c]) { board[r][c] = null; }
      else if (sel) {
        if (enBoard(sel) >= inv(sel)) { toast(`No te alcanza el material: ${cosaNombre(sel)}`, 1100); return; }
        board[r][c] = sel;
      }
      pintar();
    });
    gridEl.appendChild(cell);
    celdas.push(cell);
  }

  function enBoard(id) {
    let n = 0;
    for (const row of board) for (const c of row) if (c === id) n++;
    return n;
  }
  function inv(id) { return state.inventario[id] || 0; }

  function limpiar() { board = [[null, null, null], [null, null, null], [null, null, null]]; pintar(); }
  el.querySelector('[data-limpiar]').addEventListener('click', () => { limpiar(); audio.sfx('menu'); });

  function pintar() {
    // grilla (actualizar contenido, sin reconstruir)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const cell = celdas[r * 3 + c];
      cell.className = 'tab-cell' + (board[r][c] ? ' full' : '');
      cell.textContent = board[r][c] ? cosaEmoji(board[r][c]) : '';
    }

    // resultado
    const f = formaEnTablero(board);
    resEl.innerHTML = '';
    if (f) {
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
      resEl.innerHTML = '<div class="tab-hint-res">Coloca los materiales en su forma…</div>';
    }

    // paleta: materiales que tiene el jugador
    palEl.innerHTML = '';
    const cosas = Object.entries(state.inventario)
      .filter(([, n]) => n > 0)
      .filter(([k]) => !/^\d+$/.test(k) || BLOCKS[+k]);   // bloques válidos o materiales
    if (!cosas.length) palEl.innerHTML = '<span class="hint">No tienes materiales. Rompe bloques y caza animales.</span>';
    for (const [k, n] of cosas) {
      const chip = document.createElement('button');
      chip.className = 'tab-chip' + (sel === k ? ' sel' : '');
      chip.innerHTML = `${cosaEmoji(k)} <span>${cosaNombre(k)}</span> <b>×${n}</b>`;
      chip.addEventListener('click', () => { sel = (sel === k ? null : k); pintar(); });
      palEl.appendChild(chip);
    }

    guiaEl.innerHTML = 'Ejemplos: <b>Pico</b> = 3 arriba + palo, palo · <b>Espada</b> = 2 en fila + palo · <b>Antorcha</b> = carbón sobre palo.';
  }

  function fabricar(f) {
    const cost = costoForma(f);
    for (const [k, v] of Object.entries(cost)) {
      if ((state.inventario[k] || 0) < v) return;
    }
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

  el.refresh = pintar;
  pintar();
  return el;
}
