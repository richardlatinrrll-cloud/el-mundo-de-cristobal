// Herramientas para minar. Más poder = rompe más rápido; las mejores rompen
// varios bloques a la vez. Las de metal/cristal/legendarias se fabrican (crafteo).

export const TOOLS = {
  mano:            { nombre: 'Mano',              emoji: '✋', poder: 1 },
  pico_madera:     { nombre: 'Pico de madera',    emoji: '🪵', poder: 2.2 },
  pico_piedra:     { nombre: 'Pico de piedra',    emoji: '⛏️', poder: 3.6 },
  pico_hierro:     { nombre: 'Pico de hierro',    emoji: '🔨', poder: 6 },
  pico_cristal:    { nombre: 'Pico de cristal',   emoji: '💎', poder: 10, area: 1 },   // 3×3
  martillo_trueno: { nombre: 'Martillo del Trueno', emoji: '⚡', poder: 22, area: 1 },  // 3×3, rapidísimo
};

export function tool(id) { return TOOLS[id] || TOOLS.mano; }

// segundos que tarda en romper un bloque de dureza `hard` con la herramienta `id`
export function tiempoRomper(hard, id) {
  return Math.max(0.06, (hard * 0.55) / tool(id).poder);
}
