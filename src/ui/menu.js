import { state, nivelTema } from '../game/state.js';
import { TOPICS } from '../game/topics.js';
import { POWERS, poderDesbloqueado } from '../game/powers/registry.js';
import { lecturaObligatoriaPendiente, resumen } from '../lecturas/progreso.js';
import { toast } from './toast.js';

const LIBRES = new Set(['lecturas', 'ajustes', 'pruebas']);

export function mountMenu({ onJugar, onAprender, onLecturas, onPersonajes, onPoderes, onMundos, onAjustes, onCrafteo, onGemas, onPruebas }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <h1>⛏️ El Mundo de Cristóbal ✨</h1>
    <p class="sub">Construye tu mundo. Desbloquea superpoderes respondiendo preguntas.</p>
    <div class="menu-buttons">
      <button class="btn" data-a="jugar">▶️ Jugar</button>
      <button class="btn secondary" data-a="lecturas">📖 Mis lecturas</button>
      <p class="menu-lectura" data-role="lectura" hidden></p>
      <button class="btn secondary" data-a="aprender">📚 Aprender y desbloquear</button>
      <button class="btn secondary" data-a="poderes">✨ Mis poderes</button>
      <button class="btn secondary" data-a="crafteo">📖 Recetas y armado</button>
      <button class="btn secondary" data-a="gemas">🔮 Búsqueda de Gemas</button>
      <button class="btn secondary" data-a="personajes">🎨 Personajes</button>
      <button class="btn secondary" data-a="mundos">🌍 Mundos</button>
      <button class="btn secondary" data-a="ajustes">⚙️ Ajustes</button>
      <button class="btn secondary" data-a="pruebas" hidden>🧪 Sala de pruebas</button>
    </div>
    <p class="hint" data-role="resumen"></p>
  `;
  // lectura obligatoria pendiente: todo queda con candado salvo lecturas y ajustes
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.btn[data-a]');
    if (!b || !el._bloqueado || LIBRES.has(b.dataset.a)) return;
    e.stopImmediatePropagation();
    const oblig = lecturaObligatoriaPendiente();
    toast(`🔒 Primero domina «${oblig?.titulo || 'tu lectura'}»`, 2200);
    onLecturas();
  }, true);
  el.querySelector('[data-a=jugar]').addEventListener('click', onJugar);
  el.querySelector('[data-a=aprender]').addEventListener('click', onAprender);
  el.querySelector('[data-a=lecturas]').addEventListener('click', onLecturas);
  el.querySelector('[data-a=poderes]').addEventListener('click', onPoderes);
  el.querySelector('[data-a=crafteo]').addEventListener('click', onCrafteo);
  el.querySelector('[data-a=gemas]').addEventListener('click', onGemas);
  el.querySelector('[data-a=personajes]').addEventListener('click', onPersonajes);
  el.querySelector('[data-a=mundos]').addEventListener('click', onMundos);
  el.querySelector('[data-a=ajustes]').addEventListener('click', onAjustes);
  el.querySelector('[data-a=pruebas]').addEventListener('click', onPruebas);

  el.refresh = () => {
    el.querySelector('[data-a=pruebas]').hidden = !state.maestro;
    // lectura obligatoria pendiente: "Jugar" queda con candado (salvo clave maestra)
    const oblig = lecturaObligatoriaPendiente();
    const bloqueado = oblig && !state.maestro;
    el._bloqueado = bloqueado;
    for (const b of el.querySelectorAll('.menu-buttons .btn[data-a]')) {
      if (LIBRES.has(b.dataset.a)) continue;
      b.dataset.txt ||= b.textContent;
      b.classList.toggle('bloqueado', !!bloqueado);
      b.textContent = bloqueado ? `🔒 ${b.dataset.txt.replace(/^\S+\s/, '')}` : b.dataset.txt;
    }
    const aviso = el.querySelector('[data-role=lectura]');
    aviso.hidden = !oblig;
    if (oblig) {
      const r = resumen(oblig);
      aviso.textContent = `${oblig.emoji || '📖'} Primero termina tu lectura: ${oblig.titulo} (${r.dominadas}/${r.total} dominadas)`;
    }
    const temas = TOPICS.filter((t) => nivelTema(t.id) !== 'none').length;
    const pod = POWERS.filter((p) => poderDesbloqueado(p, state)).length;
    const m = state.mundo || {};
    el.querySelector('[data-role=resumen]').textContent =
      `Mundo: ${m.tipo || 'llanuras'}${m.creador ? ' (creador)' : ''} · Temas: ${temas}/${TOPICS.length} · Poderes: ${pod}/${POWERS.length}`;
  };
  el.refresh();
  return el;
}
