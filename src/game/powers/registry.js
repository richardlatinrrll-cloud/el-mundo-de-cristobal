// Catálogo de poderes. Requisitos en medallas acumuladas (bronce/plata/oro).
// 'aplica' modifica al jugador; 'accion' se llama al pulsar el botón de poder.

export const POWERS = [
  {
    id: 'fuerza', nombre: 'Súper fuerza', emoji: '💪',
    desc: 'Rompes cualquier bloque de un golpe.',
    req: { bronce: 1 },
    aplica(p) { p.instaBreak = true; },
  },
  {
    id: 'velocidad', nombre: 'Súper velocidad', emoji: '⚡',
    desc: 'Corres mucho más rápido: deja atrás a las Sombras.',
    req: { bronce: 2 },
    aplica(p) { p.sprintMul = 2.2; },
  },
  {
    id: 'salto', nombre: 'Súper salto', emoji: '🦿',
    desc: 'Saltas altísimo.',
    req: { bronce: 3 },
    aplica(p) { p.jumpV = 14; },
  },
  {
    id: 'laser', nombre: 'Visión láser', emoji: '🔴',
    desc: 'Rompes bloques a distancia con la mirada.',
    req: { plata: 1 },
    aplica(p) { p.reach = 14; p.instaBreak = true; },
  },
  {
    id: 'invisible', nombre: 'Invisibilidad', emoji: '👻',
    desc: 'Te vuelves casi invisible: las Sombras no te detectan.',
    req: { plata: 2 },
    aplica(p) { p.invisible = true; },
  },
  {
    id: 'sonico', nombre: 'Grito sónico', emoji: '💥',
    desc: 'Una onda que despeja el terreno frente a ti.',
    req: { oro: 1 },
    accion: 'sonico',
  },
  {
    id: 'volar', nombre: 'Volar', emoji: '🕊️',
    desc: 'Vuelo libre. Salta para subir, agáchate para bajar.',
    req: { oro: 2 },
    aplica(p) { p.flying = true; },
  },
];

export function powerById(id) { return POWERS.find((x) => x.id === id) || null; }

export function cumpleRequisito(power, medallas) {
  return Object.entries(power.req).every(([k, v]) => (medallas[k] || 0) >= v);
}

export function reqTexto(power) {
  return Object.entries(power.req)
    .map(([k, v]) => `${v} medalla${v > 1 ? 's' : ''} ${k}`)
    .join(' + ');
}
