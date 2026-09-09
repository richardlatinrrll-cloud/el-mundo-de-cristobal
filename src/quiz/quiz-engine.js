import { loadBank } from '../game/topics.js';
import { nivelTema, siguienteNivel } from '../game/state.js';

export const PREGUNTAS_POR_INTENTO = 5;
export const ACIERTOS_PARA_PASAR = 4;

// El nivel que se juega es el "siguiente" al actual (o se repasa 'oro' si ya está al tope).
export function nivelObjetivo(topicId) {
  return siguienteNivel(topicId) || 'oro';
}

export async function prepararIntento(topicId) {
  const bank = await loadBank(topicId);
  if (!bank) return null;
  const nivel = nivelObjetivo(topicId);
  const pool = (bank.niveles && bank.niveles[nivel]) || [];
  if (pool.length === 0) return null;

  const barajado = shuffle(pool.slice());
  const preguntas = barajado.slice(0, Math.min(PREGUNTAS_POR_INTENTO, barajado.length)).map(normalizar);

  return {
    tema: bank.tema || topicId,
    nivel,
    yaEnTope: !siguienteNivel(topicId),
    preguntas,
  };
}

function normalizar(q) {
  if (q.tipo === 'escribir') {
    return { tipo: 'escribir', p: q.p, respuesta: String(q.respuesta).trim().toLowerCase() };
  }
  // opción múltiple: barajamos opciones y reajustamos el índice correcto
  const opts = q.opciones.map((texto, i) => ({ texto, ok: i === q.correcta }));
  const mezcladas = shuffle(opts);
  return {
    tipo: 'opcion',
    p: q.p,
    opciones: mezcladas.map((o) => o.texto),
    correcta: mezcladas.findIndex((o) => o.ok),
  };
}

export function evaluar(pregunta, respuesta) {
  if (pregunta.tipo === 'escribir') {
    const r = String(respuesta).trim().toLowerCase().replace(/\s+/g, ' ');
    // tolera "$3.000", "3000", "3 000"
    const limpio = (s) => s.replace(/[$.\s]/g, '');
    return r === pregunta.respuesta || limpio(r) === limpio(pregunta.respuesta);
  }
  return respuesta === pregunta.correcta;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
