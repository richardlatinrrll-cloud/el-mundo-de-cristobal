import { prepararIntento, evaluar } from '../quiz/quiz-engine.js';
import { TOPICS } from '../game/topics.js';
import { state, save } from '../game/state.js';
import { audio } from '../game/audio.js';

const ACIERTOS_PARA_CURAR = 4;   // de 5

// Mini-trivia de emergencia durante una pelea de jefe: 5 preguntas, 4 aciertos
// para recuperar toda la vida. No afecta el progreso de los temas.
// Devuelve Promise<{ curado: boolean }>.
export function curarConTrivia() {
  return new Promise(async (resolve) => {
    // elegir un tema al azar que tenga preguntas
    const temas = [...TOPICS].sort(() => Math.random() - 0.5);
    let intento = null;
    for (const t of temas) {
      intento = await prepararIntento(t.id);
      if (intento && intento.preguntas.length >= 3) break;
      intento = null;
    }

    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    document.getElementById('app').appendChild(wrap);

    if (!intento) {
      wrap.innerHTML = `<div class="modal"><div class="q-text">No hay preguntas disponibles.</div>
        <div class="row" style="margin-top:16px"><button class="btn" data-x>Volver</button></div></div>`;
      wrap.querySelector('[data-x]').addEventListener('click', () => { wrap.remove(); resolve({ curado: false }); });
      return;
    }

    let i = 0, aciertos = 0;
    render();

    function render() {
      const q = intento.preguntas[i];
      const total = intento.preguntas.length;
      wrap.innerHTML = `
        <div class="modal">
          <div class="q-head">
            <span>❤️ Curación · ${intento.tema}</span>
            <span>${i + 1} / ${total} · ✅ ${aciertos}</span>
          </div>
          <div class="q-progress"><i style="width:${(i / total) * 100}%"></i></div>
          <div class="q-text">${esc(q.p)}</div>
          <div class="body"></div>
          <div class="feedback"></div>
          <div class="row" style="margin-top:14px; justify-content:flex-end">
            <button class="btn ghost" data-abort>Salir</button>
          </div>
        </div>`;
      wrap.querySelector('[data-abort]').addEventListener('click', () => { wrap.remove(); resolve({ curado: false }); });

      const body = wrap.querySelector('.body');
      const fb = wrap.querySelector('.feedback');

      if (q.tipo === 'opcion') {
        const box = document.createElement('div');
        box.className = 'options';
        q.opciones.forEach((op, idx) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.textContent = op;
          b.addEventListener('click', () => resolver(evaluar(q, idx), box, fb, idx, q.correcta));
          box.appendChild(b);
        });
        body.appendChild(box);
      } else {
        const row = document.createElement('div');
        row.className = 'write-row';
        row.innerHTML = `<input type="text" autocomplete="off" placeholder="Escribe tu respuesta" />
                         <button class="btn small" data-ok>OK</button>`;
        const input = row.querySelector('input');
        const send = () => {
          input.disabled = true; row.querySelector('[data-ok]').disabled = true;
          resolver(evaluar(q, input.value), null, fb, null, null, q.respuesta);
        };
        row.querySelector('[data-ok]').addEventListener('click', send);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        body.appendChild(row);
        setTimeout(() => input.focus(), 30);
      }
    }

    function resolver(correcto, box, fb, idx, correctaIdx, resp) {
      if (box) [...box.children].forEach((b, k) => {
        b.disabled = true;
        if (k === correctaIdx) b.classList.add('correct');
        else if (k === idx) b.classList.add('wrong');
      });
      state.stats.preguntasTotal++;
      if (correcto) { aciertos++; state.stats.preguntasOk++; fb.textContent = '✅ ¡Correcto!'; fb.className = 'feedback ok'; audio.sfx('acierto'); }
      else { fb.textContent = resp != null ? `❌ Era: ${resp}` : '❌ Casi.'; fb.className = 'feedback bad'; audio.sfx('fallo'); }
      save();
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.style.marginTop = '12px';
      btn.textContent = i + 1 < intento.preguntas.length ? 'Siguiente →' : 'Ver resultado';
      btn.addEventListener('click', () => { i++; (i < intento.preguntas.length) ? render() : fin(); });
      fb.after(btn);
      setTimeout(() => btn.focus(), 30);
    }

    function fin() {
      const meta = Math.min(ACIERTOS_PARA_CURAR, intento.preguntas.length - 1);
      const curado = aciertos >= meta;
      audio.sfx(curado ? 'medalla' : 'fallo');
      wrap.innerHTML = `
        <div class="modal">
          <div class="medal">${curado ? '❤️' : '💔'}</div>
          <div class="result-big">${aciertos} / ${intento.preguntas.length} correctas</div>
          <p class="hint" style="text-align:center">
            ${curado ? '¡Recuperaste toda la vida!' : `Necesitabas ${meta}. Sigue peleando y vuelve a intentar.`}
          </p>
          <div class="row" style="margin-top:16px"><button class="btn" data-close>Continuar</button></div>
        </div>`;
      wrap.querySelector('[data-close]').addEventListener('click', () => { wrap.remove(); resolve({ curado }); });
    }
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
