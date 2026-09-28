// Pantalla "📖 Mis lecturas": lista de libros con su avance y el botón para
// jugar la siguiente ronda. Con la clave maestra aparecen los controles del
// papá (hacer obligatoria / liberar / reiniciar).
import { state } from '../game/state.js';
import {
  LIBROS, resumen, armarRonda, lecturaObligatoriaPendiente,
  asignarObligatoria, liberarObligatoria, reiniciarLibro,
} from './progreso.js';

export function mountLecturas({ onVolver, onJugarLibro }) {
  const el = document.createElement('div');
  el.className = 'screen lecturas';
  el.innerHTML = `
    <div class="topbar"><button class="btn small secondary" data-volver>← Volver</button><h2>📖 Mis lecturas</h2><div class="spacer"></div></div>
    <div class="lect-aviso" data-aviso hidden></div>
    <div class="lect-lista" data-lista></div>
    <p class="hint lect-como">Cada nivel es un camino con puertas: cada puerta tiene una pregunta del libro y no se abre hasta que la respondas bien.
      Las que aciertas <b>al primer intento</b> ya no vuelven; las que fallas se repiten en las rondas siguientes.
      Al final de cada nivel te espera un <b>jefe</b> que te lanza preguntas: si aciertas, esquivas y contraatacas; si fallas, te da.
      El libro queda <b>dominado</b> cuando respondes bien todas. Si sales a mitad de un nivel, lo empiezas de nuevo.</p>`;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  el.refresh = () => {
    const oblig = lecturaObligatoriaPendiente();
    const aviso = el.querySelector('[data-aviso]');
    aviso.hidden = !oblig;
    if (oblig) aviso.innerHTML = `🔒 <b>Lectura obligatoria:</b> ${oblig.emoji || '📖'} ${esc(oblig.titulo)}. El mundo se desbloquea cuando la domines${state.maestro ? ' (tú puedes liberarla abajo)' : ' o cuando papá la libere'}.`;

    const lista = el.querySelector('[data-lista]');
    lista.innerHTML = '';
    if (!LIBROS.length) { lista.innerHTML = '<p class="hint">Todavía no hay libros cargados.</p>'; return; }
    for (const libro of LIBROS) {
      const r = resumen(libro);
      const esOblig = state.lecturas.obligatoria === libro.id;
      const ronda = armarRonda(libro).length;
      // con un libro obligatorio pendiente no se puede jugar otro (salvo el papá)
      const cerrado = oblig && oblig.id !== libro.id && !state.maestro;
      const card = document.createElement('div');
      card.className = 'lect-card' + (r.completado ? ' hecho' : '');
      card.innerHTML = `
        <div class="lect-emoji">${r.completado ? '🏆' : (libro.emoji || '📖')}</div>
        <div class="lect-body">
          <div class="lect-tit">${esc(libro.titulo)} ${esOblig ? '<span class="lect-chip">OBLIGATORIA</span>' : ''}</div>
          <div class="lect-autor">${esc(libro.autor || '')}</div>
          <div class="lj-prog"><i style="width:${(r.dominadas / r.total) * 100}%"></i></div>
          <div class="lect-num">✅ ${r.dominadas}/${r.total} dominadas · 🔁 ${r.pendientes} por repasar · 🆕 ${r.nuevas} nuevas${r.rondas ? ` · ${r.rondas} nivel${r.rondas > 1 ? 'es' : ''} jugado${r.rondas > 1 ? 's' : ''}` : ''}</div>
          <div class="row lect-acc">
            ${r.completado
              ? '<span class="lect-ok">¡Libro dominado!</span>'
              : cerrado
                ? `<button class="btn small" disabled>🔒 Primero termina «${esc(oblig.titulo)}»</button>`
                : `<button class="btn small" data-jugar>▶️ Jugar nivel (${ronda} puertas + jefe)</button>`}
          </div>
          ${state.maestro ? `
          <div class="row lect-papa">
            <span>👨 Papá:</span>
            ${esOblig
              ? '<button class="btn small secondary" data-liberar>Quitar obligatoria</button>'
              : '<button class="btn small secondary" data-asignar>Hacer obligatoria</button>'}
            <button class="btn small secondary" data-reiniciar>Reiniciar avance</button>
            ${r.completado ? '<button class="btn small secondary" data-repasar>Repasar igual</button>' : ''}
          </div>` : ''}
        </div>`;
      card.querySelector('[data-jugar]')?.addEventListener('click', () => onJugarLibro(libro.id));
      card.querySelector('[data-repasar]')?.addEventListener('click', () => onJugarLibro(libro.id, { repaso: true }));
      card.querySelector('[data-asignar]')?.addEventListener('click', () => { asignarObligatoria(libro.id); el.refresh(); });
      card.querySelector('[data-liberar]')?.addEventListener('click', () => { liberarObligatoria(); el.refresh(); });
      card.querySelector('[data-reiniciar]')?.addEventListener('click', () => {
        if (confirm(`¿Borrar todo el avance de «${libro.titulo}»?`)) { reiniciarLibro(libro.id); el.refresh(); }
      });
      lista.appendChild(card);
    }
  };
  el.refresh();
  return el;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
