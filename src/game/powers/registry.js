// Catálogo de poderes. Requisitos en medallas acumuladas (bronce/plata/oro).
// 'aplica' modifica al jugador; 'accion' se llama al pulsar el botón de poder.

export const POWERS = [
  {
    id: 'fuerza', nombre: 'Súper fuerza', emoji: '💪',
    desc: 'Rompes cualquier bloque de un golpe. Botón ✨: golpe de fuerza que empuja a los enemigos.',
    req: { bronce: 1 },
    aplica(p) { p.instaBreak = true; },
  },
  {
    id: 'velocidad', nombre: 'Súper velocidad', emoji: '⚡',
    desc: 'Corres mucho más rápido. Botón ✨: ráfaga hacia adelante.',
    req: { bronce: 2 },
    aplica(p) { p.sprintMul = 2.2; },
  },
  {
    id: 'salto', nombre: 'Súper salto', emoji: '🦿',
    desc: 'Saltas altísimo. Botón ✨: salto colosal.',
    req: { bronce: 3 },
    aplica(p) { p.jumpV = 14; },
  },
  {
    id: 'laser', nombre: 'Visión láser', emoji: '🔴',
    desc: 'Botón ✨: lanza un rayo que rompe el bloque y golpea a los enemigos en línea.',
    req: { plata: 1 },
    accion: 'laser',
  },
  {
    id: 'invisible', nombre: 'Invisibilidad', emoji: '👻',
    desc: 'Casi invisible: las Sombras no te detectan. Botón ✨: manto de sombra (6 s).',
    req: { plata: 2 },
    aplica(p) { p.invisible = true; },
  },
  {
    id: 'vnocturna', nombre: 'Visión Nocturna', emoji: '🌗',
    desc: 'De noche ves casi como de día, sin necesidad de antorcha (y sin que la luz te delate).',
    req: { plata: 1 },
    aplica(p) { p.visionNocturna = true; },
  },
  {
    id: 'sonico', nombre: 'Grito sónico', emoji: '💥',
    desc: 'Onda hacia adelante que despeja el terreno y golpea. (Botón ✨)',
    req: { oro: 1 },
    accion: 'sonico',
  },
  {
    id: 'volar', nombre: 'Volar', emoji: '🕊️',
    desc: 'Vuelo libre. Salta para subir, agáchate para bajar. Botón ✨: impulso hacia arriba.',
    req: { oro: 2 },
    aplica(p) { p.flying = true; },
  },
  {
    // id interno 'furia' por compatibilidad con partidas guardadas
    id: 'furia', nombre: 'Modo Súper Saya', emoji: '⚡',
    desc: 'Botón ✨: te transformas gritando, con el pelo dorado y un aura amarilla ' +
      '(~15 s). Más fuerza, velocidad y salto, y casi no te empujan.',
    req: { plata: 3 },
    accion: 'furia',
  },
  // --- poderes de las gemas: se activan con el botón ✨ ---
  {
    id: 'rayo_martillo', nombre: 'Rayo del Martillo', emoji: '⚡',
    desc: 'Cae un rayo donde apuntas y golpea alrededor. (Botón ✨)',
    req: {}, gema: 'centella',
    accion: 'rayo',
  },
  {
    id: 'onda_prisma', nombre: 'Onda Prisma', emoji: '✊',
    desc: 'Explosión en 360° que barre a los enemigos. (Botón ✨)',
    req: {}, gema: 'TODAS',
    accion: 'prisma',
  },
];

export function powerById(id) { return POWERS.find((x) => x.id === id) || null; }

export function cumpleRequisito(power, medallas) {
  return Object.entries(power.req).every(([k, v]) => (medallas[k] || 0) >= v);
}

// ¿está desbloqueado este poder? (medallas o gemas). `state` = objeto de estado.
export function poderDesbloqueado(power, state) {
  if (state.maestro) return true;
  if (power.gema === 'TODAS') return (state.gemas || []).length >= 6;
  if (power.gema) return (state.gemas || []).includes(power.gema);
  return cumpleRequisito(power, state.medallas || {});
}

export function reqTexto(power) {
  if (power.gema === 'TODAS') return 'las 6 Gemas de Poder';
  if (power.gema) return 'la Gema ' + power.gema.charAt(0).toUpperCase() + power.gema.slice(1);
  return Object.entries(power.req)
    .map(([k, v]) => `${v} medalla${v > 1 ? 's' : ''} ${k}`)
    .join(' + ');
}
