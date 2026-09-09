import { state, nivelTema } from '../game/state.js';
import { TOPICS } from '../game/topics.js';
import { POWERS, cumpleRequisito } from '../game/powers/registry.js';

export function mountMenu({ onJugar, onAprender, onPersonajes, onPoderes, onMundos, onAjustes, onCrafteo, onGemas }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <h1>⛏️ El Mundo de Cristóbal ✨</h1>
    <p class="sub">Construye tu mundo. Desbloquea superpoderes respondiendo preguntas.</p>
    <div class="menu-buttons">
      <button class="btn" data-a="jugar">▶️ Jugar</button>
      <button class="btn secondary" data-a="aprender">📚 Aprender y desbloquear</button>
      <button class="btn secondary" data-a="poderes">✨ Mis poderes</button>
      <button class="btn secondary" data-a="crafteo">🔨 Crafteo</button>
      <button class="btn secondary" data-a="gemas">🔮 Búsqueda de Gemas</button>
      <button class="btn secondary" data-a="personajes">🎨 Personajes</button>
      <button class="btn secondary" data-a="mundos">🌍 Mundos</button>
      <button class="btn secondary" data-a="ajustes">⚙️ Ajustes</button>
    </div>
    <p class="hint" data-role="resumen"></p>
  `;
  el.querySelector('[data-a=jugar]').addEventListener('click', onJugar);
  el.querySelector('[data-a=aprender]').addEventListener('click', onAprender);
  el.querySelector('[data-a=poderes]').addEventListener('click', onPoderes);
  el.querySelector('[data-a=crafteo]').addEventListener('click', onCrafteo);
  el.querySelector('[data-a=gemas]').addEventListener('click', onGemas);
  el.querySelector('[data-a=personajes]').addEventListener('click', onPersonajes);
  el.querySelector('[data-a=mundos]').addEventListener('click', onMundos);
  el.querySelector('[data-a=ajustes]').addEventListener('click', onAjustes);

  el.refresh = () => {
    const temas = TOPICS.filter((t) => nivelTema(t.id) !== 'none').length;
    const pod = POWERS.filter((p) => cumpleRequisito(p, state.medallas)).length;
    const m = state.mundo || {};
    el.querySelector('[data-role=resumen]').textContent =
      `Mundo: ${m.tipo || 'llanuras'}${m.creador ? ' (creador)' : ''} · Temas: ${temas}/${TOPICS.length} · Poderes: ${pod}/${POWERS.length}`;
  };
  el.refresh();
  return el;
}
