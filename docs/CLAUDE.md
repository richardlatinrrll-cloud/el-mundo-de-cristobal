# El Mundo de Cristóbal — contexto del proyecto

## Qué es
Juego web tipo Minecraft (sandbox de voxels original) para teléfono y computador.
El niño (12–13 años, 7º–8º básico) desbloquea **superpoderes** respondiendo
preguntas de distintos temas. Progresión por medallas **Bronce → Plata → Oro**
por tema. Incluye un **editor de skins** para que cree sus propios personajes.

Objetivo del padre: motivar a estudiar. Los poderes solo se consiguen estudiando.

## Stack
- Vite + Three.js (sin framework). `npm run dev`, `npm run build`.
- Todo el progreso en `localStorage` (por dispositivo). No hay backend.
- PWA: se instala y funciona sin conexión (`public/manifest.webmanifest`, `public/sw.js`).

## Mapa del código (`src/`)
- `main.js` — arranque, bucle de juego, navegación de pantallas, romper/poner bloques.
- `engine/` — motor de voxels: `world.js` (mundo + generación), `mesher.js` (mallas),
  `player.js` (física/colisiones/raycast), `controls.js` (teclado+ratón y táctil), `blocks.js` (bloques y atlas).
- `game/` — `state.js` (estado + guardado), `topics.js` (lista de temas),
  `powers/registry.js` (poderes y requisitos), `power-hud.js` (pantalla "Mis poderes"),
  `mobs.js` (enemigos por tipo, escalan con tu nivel de medallas),
  `bosses.js` (4 jefes en zonas con baliza; el poder correcto hace 3× daño).
- `quiz/` — `quiz-engine.js` (lógica), `quiz-ui.js` (modal de preguntas),
  `progress-ui.js` (pantalla "Aprender"), `banks/*.json` (**677 preguntas**,
  un archivo por tema, ~20 por nivel).
- `skin/` — `skin-editor.js` (editor pixel-art), `skin-model.js` (avatar 3D, layout de skin 64×64).
- `ui/` — `menu.js`, `toast.js`.

## Reglas del juego (ajustables)
- `quiz/quiz-engine.js`: `PREGUNTAS_POR_INTENTO = 5`, `ACIERTOS_PARA_PASAR = 4`.
- `game/powers/registry.js`: requisitos de cada poder en medallas acumuladas.

## Editar contenido sin tocar código
- Preguntas → `docs/COMO_EDITAR_PREGUNTAS.md`
- Personajes / skins → `docs/COMO_EDITAR_PERSONAJES.md`
- Publicar en el servidor casero → `docs/DESPLIEGUE_SERVIDOR.md`

## Ganchos de depuración (solo en el navegador, consola)
- `window.__game` — `{ state, world, player, POWERS, jugar, actions }`
- `window.__step(n)` — avanza n pasos de simulación (para pruebas)

Estado vivo del desarrollo: `docs/ESTADO_ACTUAL.md`.
