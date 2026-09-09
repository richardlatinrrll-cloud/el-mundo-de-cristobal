import { prepararIntento, evaluar, ACIERTOS_PARA_PASAR } from './quiz-engine.js';
import { state, save, subirNivel } from '../game/state.js';
import { audio } from '../game/audio.js';

const MEDALLA_EMOJI = { bronce: '🥉', plata: '🥈', oro: '🥇' };

// Devuelve una promesa que resuelve al cerrar el quiz:
// { aciertos, total, subioNivel, nivel, tema } | { cancelado: true }
export function openQuiz(topicId) {
  return new Promise(async (resolve) => {
    const intento = await prepararIntento(topicId);
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    document.getElementById('app').appendChild(wrap);

    if (!intento) {
      wrap.innerHTML = `<div class="modal">
        <div class="q-text">Este tema todavía no tiene preguntas cargadas.</div>
        <p class="hint">Se pueden agregar en <code>src/quiz/banks/${topicId}.json</code> (ver la guía para el padre).</p>
        <div class="row" style="margin-top:16px"><button class="btn" data-x>Volver</button></div>
      </div>`;
      wrap.querySelector('[data-x]').addEventListener('click', () => { wrap.remove(); resolve({ cancelado: true }); });
      return;
    }

    let i = 0, aciertos = 0;
    render();

    function render() {
      const q = intento.preguntas[i];
      wrap.innerHTML = `
        <div class="modal">
          <div class="q-head">
            <span>${intento.tema} · nivel ${MEDALLA_EMOJI[intento.nivel]} ${intento.nivel}${intento.yaEnTope ? ' (repaso)' : ''}</span>
            <span>${i + 1} / ${intento.preguntas.length}</span>
          </div>
          <div class="q-progress"><i style="width:${(i / intento.preguntas.length) * 100}%"></i></div>
          <div class="q-text">${escapeHtml(q.p)}</div>
          <div class="body"></div>
          <div class="feedback"></div>
          <div class="row" style="margin-top:14px; justify-content:flex-end">
            <button class="btn ghost" data-abort>Salir</button>
          </div>
        </div>`;
      wrap.querySelector('[data-abort]').addEventListener('click', () => {
        wrap.remove(); resolve({ cancelado: true });
      });

      const body = wrap.querySelector('.body');
      const fb = wrap.querySelector('.feedback');

      if (q.tipo === 'opcion') {
        const box = document.createElement('div');
        box.className = 'options';
        q.opciones.forEach((op, idx) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.textContent = op;
          b.addEventListener('click', () => answer(idx, box, fb));
          box.appendChild(b);
        });
        body.appendChild(box);
      } else {
        const row = document.createElement('div');
        row.className = 'write-row';
        row.innerHTML = `<input type="text" autocomplete="off" placeholder="Escribe tu respuesta" />
                         <button class="btn small" data-ok>OK</button>`;
        const input = row.querySelector('input');
        const send = () => answerWrite(input.value, row, fb);
        row.querySelector('[data-ok]').addEventListener('click', send);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        body.appendChild(row);
        setTimeout(() => input.focus(), 30);
      }
    }

    function answer(idx, box, fb) {
      const q = intento.preguntas[i];
      const correcto = evaluar(q, idx);
      [...box.children].forEach((b, k) => {
        b.disabled = true;
        if (k === q.correcta) b.classList.add('correct');
        else if (k === idx) b.classList.add('wrong');
      });
      finishQuestion(correcto, fb, q.tipo === 'opcion' ? null : null);
    }

    function answerWrite(val, row, fb) {
      const q = intento.preguntas[i];
      const correcto = evaluar(q, val);
      row.querySelector('input').disabled = true;
      row.querySelector('[data-ok]').disabled = true;
      finishQuestion(correcto, fb, q.respuesta);
    }

    function finishQuestion(correcto, fb, respCorrecta) {
      state.stats.preguntasTotal++;
      if (correcto) { aciertos++; state.stats.preguntasOk++; fb.textContent = '✅ ¡Correcto!'; fb.className = 'feedback ok'; audio.sfx('acierto'); }
      else { fb.textContent = respCorrecta != null ? `❌ Era: ${respCorrecta}` : '❌ Casi. Sigue.'; fb.className = 'feedback bad'; audio.sfx('fallo'); }
      save();
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.style.marginTop = '12px';
      btn.textContent = i + 1 < intento.preguntas.length ? 'Siguiente →' : 'Ver resultado';
      btn.addEventListener('click', () => { i++; (i < intento.preguntas.length) ? render() : showResult(); });
      fb.after(btn);
      setTimeout(() => btn.focus(), 30);
    }

    function showResult() {
      state.stats.intentos++;
      const paso = aciertos >= ACIERTOS_PARA_PASAR;
      let subio = false, nivelNuevo = intento.nivel;
      if (paso && !intento.yaEnTope) {
        const n = subirNivel(topicId);
        if (n) { subio = true; nivelNuevo = n; }
      }
      save();
      audio.sfx(subio ? 'medalla' : paso ? 'nivel' : 'fallo');

      wrap.innerHTML = `
        <div class="modal">
          <div class="medal">${paso ? '🏅' : '💪'}</div>
          <div class="result-big">${aciertos} / ${intento.preguntas.length} correctas</div>
          <p class="hint" style="text-align:center">
            ${subio ? `¡Subiste a nivel <b>${nivelNuevo.toUpperCase()}</b> en ${intento.tema}!`
              : paso ? `¡Muy bien! Ya tenías el nivel máximo en este tema.`
              : `Necesitas ${ACIERTOS_PARA_PASAR} para subir de nivel. ¡Puedes reintentar!`}
          </p>
          <div class="row" style="margin-top:16px">
            <button class="btn" data-close>Continuar</button>
          </div>
        </div>`;
      wrap.querySelector('[data-close]').addEventListener('click', () => {
        wrap.remove();
        resolve({ aciertos, total: intento.preguntas.length, subioNivel: subio, nivel: nivelNuevo, tema: intento.tema });
      });
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
