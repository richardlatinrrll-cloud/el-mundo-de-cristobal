# El Mundo de Cristóbal — contexto del proyecto

> **Al retomar:** lee este archivo y luego `docs/ESTADO_ACTUAL.md` (estado vivo,
> con el registro de cambios). Con eso alcanza para saber de qué se trata.

## Qué es y para quién

Juego web tipo Minecraft (sandbox de voxels **original**, sin recursos de
Minecraft) para teléfono y computador. Lo hace Richard para su hijo **Cristóbal**
(12–13 años, 7º–8º básico chileno).

**La idea:** motivar a estudiar. Se construye libremente, pero los
**superpoderes** solo se desbloquean respondiendo preguntas de distintos temas,
con progresión por medallas **Bronce → Plata → Oro**. También hay un **editor de
skins** para que cree sus personajes.

## Regla de copyright (importante)

**Nada con derechos de autor.** Personajes, enemigos, armas y poderes son
**versiones propias inspiradas**, con nombre nuevo. Ejemplos de la decisión
tomada con Richard:

- "omnidróide" → **El Autómata**
- transformación tipo anime → **Modo Súper Saya** (nombre alterado a propósito;
  los gestos son tropos genéricos)
- jefes propios: Trol de las Rocas, Dragón Tormenta, Titán Ardiente, Elfo Oscuro
- No se descargan mapas de Minecraft ni assets; la variedad viene de los
  generadores propios.

## Stack y ejecución

- **Vite + Three.js**, sin framework, sin backend.
- Todo el progreso en `localStorage` (por dispositivo, no se sincroniza).
- PWA: se instala y funciona sin conexión (`public/manifest.webmanifest`,
  `public/sw.js`, network-first con caché versionada `mundo-cristobal-vN`).

```bash
npm install          # primera vez
npm run dev           # desarrollo → http://localhost:5273
npm run build         # genera dist/ (estático)
```

## Publicación

Dos destinos, los dos activos:

1. **GitHub Pages** (principal). Repo público `richardlatinrrll-cloud/el-mundo-de-cristobal`.
   Deploy **automático**: `git push` a `main` → GitHub Actions
   (`.github/workflows/deploy.yml`) compila y publica.
   Sitio `noindex` + `robots.txt` + pantalla de clave ("solo para Cristóbal").
2. **Servidor casero ARGOS** (Tailscale). Ver `docs/DESPLIEGUE_SERVIDOR.md`.

**Al hacer cambios que Cristóbal deba recibir:** subir el número de caché en
`public/sw.js` (`mundo-cristobal-vN` → `vN+1`) para que el navegador recargue
limpio.

## Claves (`src/ui/clave.js`)

La clave se pide **cada vez** que se abre el juego. Solo se guardan los hashes.

- **Normal** `Cristobal2013` (hash `89195a`): juego con avance guardado.
- **Maestra** = RUT de Richard sin dígito verificador (hash `5jqypa`): modo de
  prueba con **todo desbloqueado** (poderes, gemas, herramientas, armadura).
  `state.maestro = true` → `save()` no hace nada (protege el avance real). No da
  invencibilidad: se puede probar el combate y morir.

## Mapa del código (`src/`)

### `engine/` — motor de voxels
| archivo | qué hace |
|---|---|
| `world.js` | mundo `Uint8Array`, 7 generadores (Llanuras/Bosque/Montañas/Desierto/Islas/Islas flotantes/Plano) + `creador`, ríos/lagos/volcanes, vetas de mineral, `TAMANOS` |
| `mesher.js` | malla por chunks (columnas de 16), AO por vértice + sombreado por cara; buckets opaco/trans/glow |
| `player.js` | física AABB, salto, auto-step, raycast DDA, respawn si te sales del mapa |
| `controls.js` | teclado+ratón (pointer lock) y táctil (joystick dinámico + botones) |
| `blocks.js` | catálogo de bloques + atlas de texturas procedurales |
| `fluidos.js` | agua y lava que **corren** (caen, se extienden, agua+lava=roca); tick acotado cerca del jugador |

### `game/` — lógica del juego
| archivo | qué hace |
|---|---|
| `state.js` | estado global + guardado en localStorage (`save()` es no-op si `maestro`) |
| `topics.js` | los 11 temas de estudio |
| `powers/registry.js` | los 10 poderes y sus requisitos (`req` en medallas, o `gema`) |
| `power-hud.js` | pantalla "Mis poderes" |
| `mobs.js` | 8 enemigos por tipo, escalan con tu nivel de medallas (`MobField`) |
| `bosses.js` | 4 jefes en zonas con baliza; el poder correcto hace 3× daño; ataques propios (`BossArena`) |
| `gemas.js` | Búsqueda de las 6 Gemas de Poder, guardián por gema (`GemQuest`) |
| `animals.js` | 9 animales + 4 dinosaurios (`AnimalField`); caza → carne/cuero/pluma/lana |
| `recetas.js` | recetas como FORMAS 3×3, armadura, comida, armadura de jefe |
| `tools.js` | minado por tiempo según dureza + poder de la herramienta |
| `viewmodel.js` | la mano con la herramienta/arma en 1ª persona |
| `daynight.js` | ciclo día/noche por la **hora real** del dispositivo |
| `audio.js` | efectos y música phonk 100% Web Audio (sin archivos) |

### `quiz/` — estudio y progresión
`quiz-engine.js` (lógica: 5 preguntas por intento, 4 aciertos para subir),
`quiz-ui.js` (modal), `progress-ui.js` (pantalla "Aprender"),
`banks/*.json` (**677 preguntas**, un archivo por tema, ~20 por nivel, 7º–8º básico).

### `skin/` — personajes
`skin-editor.js` (editor pixel-art 64×64), `skin-model.js` (avatar 3D + pelo
dorado del Súper Saya).

### `ui/` — pantallas
`menu.js`, `toast.js`, `crafteo.js` (libro de recetas), `tablero.js` (armado 3×3
con guía fantasma), `gemas.js` (mapa + mini-mapa), `mundos.js`, `ajustes.js`,
`clave.js`, `curar-trivia.js` (curarse en pelea de jefe), `pruebas.js` (Sala de
pruebas, solo con clave maestra).

### `main.js`
Arranque, bucle de juego (`frame`), navegación de pantallas, romper/poner
bloques, combate, acciones de cada poder, HUD, Sala de pruebas.

## Reglas ajustables

- `quiz/quiz-engine.js`: `PREGUNTAS_POR_INTENTO = 5`, `ACIERTOS_PARA_PASAR = 4`.
- `game/powers/registry.js`: `req` de cada poder (medallas acumuladas) o `gema`.
- `game/mobs.js`: `cantidadEnemigos()`, HP/daño por tipo, `minNivel`.

## Editar contenido sin programar

- Preguntas → `docs/COMO_EDITAR_PREGUNTAS.md`
- Personajes / skins → `docs/COMO_EDITAR_PERSONAJES.md`
- Publicar → `docs/DESPLIEGUE_SERVIDOR.md`

## Depuración (consola del navegador)

- `window.__game` → `{ state, POWERS, jugar, crearMundo, dayNight, controls,
  world, player, mobs, bosses, animals, gemas, actions }`
- `window.__game.actions` → `{ romper, poner, poder, comer, dañar }`
- `window.__step(n)` → avanza n pasos de simulación

## Notas para trabajar aquí

- En `dev` la consola muestra a veces errores viejos de HMR (módulos con
  `?t=...` de exports que ya no existen, p. ej. `craftear`). Son **fantasmas**:
  el `npm run build` compila limpio. Verificar recargando o compilando.
- Al terminar una tanda de cambios: `npm run build`, subir `sw.js` a la versión
  siguiente, `git push` (deploy automático), y actualizar `docs/ESTADO_ACTUAL.md`.
