import { BLOCKS } from '../engine/blocks.js';

// Herramientas y armas. `poder` = velocidad al minar; `dano` = golpe a enemigos.
// `bueno` = tipos de bloque en los que la herramienta rinde extra.

export const TOOLS = {
  mano:            { nombre: 'Mano',              emoji: '✋', poder: 1,  dano: 2 },
  pico_madera:     { nombre: 'Pico de madera',    emoji: '🪵', poder: 2.2, dano: 2.5, bueno: 'piedra' },
  pico_piedra:     { nombre: 'Pico de piedra',    emoji: '⛏️', poder: 3.6, dano: 3,   bueno: 'piedra' },
  pico_hierro:     { nombre: 'Pico de hierro',    emoji: '🔨', poder: 6,   dano: 4,   bueno: 'piedra' },
  pico_cristal:    { nombre: 'Pico de cristal',   emoji: '💎', poder: 10,  dano: 5,   bueno: 'piedra', area: 1 },
  martillo_trueno: { nombre: 'Martillo del Trueno', emoji: '⚡', poder: 22, dano: 12,  area: 1 },
  hacha_hierro:    { nombre: 'Hacha de hierro',   emoji: '🪓', poder: 3,   dano: 4,   bueno: 'madera' },
  pala_hierro:     { nombre: 'Pala de hierro',    emoji: '🧹', poder: 3,   dano: 2,   bueno: 'blando' },
  espada_piedra:   { nombre: 'Espada de piedra',  emoji: '🗡️', poder: 1.2, dano: 5 },
  espada_hierro:   { nombre: 'Espada de hierro',  emoji: '⚔️', poder: 1.2, dano: 8 },
  espada_cristal:  { nombre: 'Espada de cristal', emoji: '🔱', poder: 1.2, dano: 14 },
  arco:            { nombre: 'Arco',              emoji: '🏹', poder: 1,   dano: 2, arco: true },
  antorcha:        { nombre: 'Antorcha',          emoji: '🔥', poder: 1,   dano: 2, luz: true },
};

export function tool(id) { return TOOLS[id] || TOOLS.mano; }

// familia del bloque para el bonus de la herramienta
function familia(blockId) {
  const n = BLOCKS[blockId]?.name || '';
  if (blockId === 3 || blockId === 8 || blockId === 13 || blockId === 15 ||
      (blockId >= 16 && blockId <= 19)) return 'piedra';
  if (blockId === 4 || blockId === 7 || blockId === 5 || blockId === 24 || blockId === 25 || blockId === 20 || blockId === 21) return 'madera';
  if (blockId === 1 || blockId === 2 || blockId === 6 || blockId === 11) return 'blando';
  return 'otro';
}

// segundos para romper un bloque `blockId` con la herramienta `id`
export function tiempoRomper(blockId, id) {
  const t = tool(id);
  const hard = BLOCKS[blockId]?.hard ?? 1;
  const fam = familia(blockId);
  const bonus = (t.bueno === fam) ? 2.4 : 1;
  return Math.max(0.06, (hard * 0.55) / (t.poder * bonus));
}

export function danoGolpe(id) { return tool(id).dano || 2; }
