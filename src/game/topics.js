// Temas de estudio. Los .json viven en src/quiz/banks/ y se cargan con import dinámico.
export const TOPICS = [
  { id: 'finanzas',    nombre: 'Finanzas personales',   emoji: '💰', completo: true },
  { id: 'energias',    nombre: 'Energías renovables',    emoji: '🔋', completo: true },
  { id: 'reciclaje',   nombre: 'Reciclaje y ambiente',   emoji: '♻️', completo: true },
  { id: 'matematica',  nombre: 'Matemática',             emoji: '➗', completo: true },
  { id: 'tecnologia',  nombre: 'Tecnología e innovación',emoji: '🤖', completo: true },
  { id: 'sociales',    nombre: 'Habilidades sociales',   emoji: '🤝', completo: true },
  { id: 'pensamiento', nombre: 'Pensamiento audaz',      emoji: '🧠', completo: true },
  { id: 'lenguaje',    nombre: 'Lenguaje',               emoji: '📖', completo: true },
  { id: 'ciencias',    nombre: 'Ciencias Naturales',     emoji: '🔬', completo: true },
  { id: 'historia',    nombre: 'Historia y Geografía',   emoji: '🌎', completo: true },
  { id: 'ingles',      nombre: 'Inglés',                 emoji: '🇬🇧', completo: true },
];

export function topicById(id) { return TOPICS.find((t) => t.id === id) || null; }

const banks = import.meta.glob('../quiz/banks/*.json');

export async function loadBank(topicId) {
  const path = `../quiz/banks/${topicId}.json`;
  const loader = banks[path];
  if (!loader) return null;
  const mod = await loader();
  return mod.default || mod;
}
