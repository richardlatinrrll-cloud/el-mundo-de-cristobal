import { TOPICS } from '../game/topics.js';
import { state, nivelTema } from '../game/state.js';

const CHIP = { none: 'none', bronce: 'bronce', plata: 'plata', oro: 'oro' };
const LABEL = { none: 'Sin empezar', bronce: 'Bronce 🥉', plata: 'Plata 🥈', oro: 'Oro 🥇' };

export function mountAprender({ onVolver, onJugarTema }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>📚 Aprender y desbloquear</h2>
    <p class="sub">Elige un tema y responde 5 preguntas. Con 4 aciertos subes de medalla y consigues poderes nuevos.</p>
    <div class="grid-cards" data-grid></div>
    <p class="hint" data-resumen></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  el.refresh = () => {
    const grid = el.querySelector('[data-grid]');
    grid.innerHTML = '';
    for (const t of TOPICS) {
      const nivel = nivelTema(t.id);
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML = `
        <div class="emoji">${t.emoji}</div>
        <div class="name">${t.nombre}</div>
        <div class="medal-row">
          <span class="chip ${CHIP[nivel]}">${LABEL[nivel]}</span>
        </div>
        ${t.completo ? '' : '<div class="locked">set inicial de preguntas</div>'}
      `;
      card.addEventListener('click', () => onJugarTema(t.id));
      grid.appendChild(card);
    }
    const m = state.medallas;
    el.querySelector('[data-resumen]').textContent =
      `Medallas: 🥉 ${m.bronce}  ·  🥈 ${m.plata}  ·  🥇 ${m.oro}`;
  };
  el.refresh();
  return el;
}
