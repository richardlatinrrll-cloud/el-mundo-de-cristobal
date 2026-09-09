// Estado global del juego + persistencia en localStorage (por dispositivo).

const KEY = 'juego-estudio:v1';

const DEFAULT = {
  // progreso por tema: 'none' | 'bronce' | 'plata' | 'oro'
  progreso: {},
  // medallas ganadas en total (para requisitos de poderes)
  medallas: { bronce: 0, plata: 0, oro: 0 },
  // poderes desbloqueados (ids)
  poderes: [],
  // poder equipado (id o null)
  poderEquipado: null,
  // skins creadas: [{id, nombre, png(dataURL)}]
  skins: [],
  skinActiva: null,
  // jefes derrotados (ids)
  jefesDerrotados: [],
  // gemas de poder conseguidas (ids) — búsqueda de gemas / Guante
  gemas: [],
  // mundo actual: { tipo, tamano, semilla, creador }
  mundo: { tipo: 'llanuras', tamano: 'pequeno', semilla: 12345, creador: false },
  // lo que el jugador construyó/rompió en este mundo: { "x,y,z": idBloque }
  mundoEdits: {},
  // bloques que el jugador tiene recogidos para construir: { "idBloque": cantidad }
  inventario: {},
  // herramientas que tiene y cuál usa
  herramientas: ['mano'],
  herramienta: 'mano',
  // ajustes de control / pantalla
  ajustes: {
    invJoyX: false,        // invertir joystick izquierda/derecha
    invJoyY: false,        // invertir joystick adelante/atrás
    invCamY: false,        // invertir mirar arriba/abajo
    sensCam: 1,            // sensibilidad de cámara (0.4 – 2)
    vista: 'primera',      // 'primera' | 'tercera'
    pantallaCompleta: true, // pedir pantalla completa al jugar
    stickIzquierda: true,  // joystick a la izquierda (false = derecha, para zurdos)
    musica: 'juego',       // 'juego' (phonk generado) | 'spotify' | 'ninguna'
    volMusica: 0.5,
    volEfectos: 0.7,
  },
  // estadísticas
  stats: { preguntasOk: 0, preguntasTotal: 0, intentos: 0, derrotados: 0, jefes: 0 },
};

export const LIMITE_EDITS = 6000; // tope para no llenar el almacenamiento

export const state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...parsed,
      medallas: { ...DEFAULT.medallas, ...(parsed.medallas || {}) },
      mundo: { ...DEFAULT.mundo, ...(parsed.mundo || {}) },
      mundoEdits: parsed.mundoEdits || {},
      inventario: parsed.inventario || {},
      herramientas: parsed.herramientas || ['mano'],
      herramienta: parsed.herramienta || 'mano',
      gemas: parsed.gemas || [],
      jefesDerrotados: parsed.jefesDerrotados || [],
      ajustes: { ...DEFAULT.ajustes, ...(parsed.ajustes || {}) },
      stats: { ...DEFAULT.stats, ...(parsed.stats || {}) } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function resetAll() {
  Object.assign(state, structuredClone(DEFAULT));
  save();
}

// --- helpers de progreso ---
const ORDER = ['none', 'bronce', 'plata', 'oro'];

export function nivelTema(temaId) {
  return state.progreso[temaId] || 'none';
}
export function siguienteNivel(temaId) {
  const cur = nivelTema(temaId);
  const i = ORDER.indexOf(cur);
  return i < 3 ? ORDER[i + 1] : null; // null = ya está en oro
}
export function subirNivel(temaId) {
  const next = siguienteNivel(temaId);
  if (!next) return null;
  state.progreso[temaId] = next;
  recomputarMedallas();
  save();
  return next;
}
export function recomputarMedallas() {
  const m = { bronce: 0, plata: 0, oro: 0 };
  for (const nivel of Object.values(state.progreso)) {
    if (nivel === 'bronce') m.bronce++;
    else if (nivel === 'plata') { m.bronce++; m.plata++; }
    else if (nivel === 'oro') { m.bronce++; m.plata++; m.oro++; }
  }
  state.medallas = m;
}
