# Estado actual — El Mundo de Cristóbal

_Actualizado: 2026-09-09_

**Publicado en GitHub Pages** (repo público, sitio `noindex` + pantalla de clave
para "solo para Cristóbal"). El deploy es automático: `git push` a `main` →
GitHub Actions (`.github/workflows/deploy.yml`) construye y publica.
- URL: la que da GitHub Pages para el repo.
- Clave del juego: `src/ui/clave.js` (`HASH_OBJETIVO`). Para cambiarla, calcular
  el hash con la función `hash()` de ese archivo y reemplazar.
- El despliegue anterior en el servidor casero ARGOS (Docker, puerto 8082) sigue
  disponible dentro de la red / por Tailscale; ver `docs/DESPLIEGUE_SERVIDOR.md`
  (fuera de git).

## Hecho (funcional, verificado en navegador)

- **Naturaleza (Parte 1)** (`src/engine/world.js`): ríos, lagos y mar, cascadas
  y **volcanes** con lava (bloque que brilla y te empuja si lo tocas). Los tipos
  de mundo Llanuras/Bosque/Montañas/Desierto generan agua y relieve; Montañas
  trae 1–2 volcanes; Desierto trae oasis. Mundo **×20 más grande** que antes.
- **Animales (Parte 1)** (`src/game/animals.js`): 9 especies (conejo, ciervo,
  zorro, oveja, vaca, jabalí, oso, tortuga, pájaro) que aparecen según el bioma
  (agua/arena/bosque/pasto), pastan, caminan, y **huyen o embisten** según la
  especie. Aparecen cerca del jugador y se van si te alejas.
- **Crafteo (Parte 2)** (`src/game/recetas.js`, `src/ui/crafteo.js`, pantalla
  🔨 Crafteo / botón 🔨 en el HUD / tecla `Q`): juntas materiales del mundo y
  **fabricas cosas**. 4 categorías:
  - **Básico**: tablas, palos, vidrio, ladrillo, antorcha (da luz).
  - **Construir**: puerta (se abre/cierra al tocarla, ocupa 2 de alto y se
    coloca sola), ventana, valla, escalera (se trepa).
  - **Herramientas**: pico de piedra/hierro/cristal (el de cristal rompe 3×3),
    hacha (corta madera rápido), pala (cava tierra/arena rápido).
  - **Armas**: espada de piedra/hierro/cristal (más daño), arco + flechas
    (dispara a distancia con el botón de poner).
  Las tarjetas en **verde** son las que ya puedes fabricar; abajo ves lo que
  tienes y una guía de "dónde conseguir lo que te falta". Al fabricar una
  herramienta/arma se agrega a tus herramientas y queda activa.
- **Minerales en el mundo** (`vetas()` en `world.js`): vetas de carbón, hierro,
  oro y cristal en la piedra (más raras y hondas mientras mejor el material).
  Al minarlas sueltan el material para craftear.

- **Mundo jugable**: voxels con **malla por chunks** (`src/engine/mesher.js`) —
  editar un bloque solo re-genera su chunk, así construir no da tirones ni en
  mundos grandes. Plataforma de aparición despejada en el centro.
- **7 tipos de mundo + creador** (`src/engine/world.js`, pantalla "🌍 Mundos"):
  Llanuras, Bosque, Montañas, Desierto, Islas, Islas flotantes, Plano.
  Tamaños: Pequeño 192³ · Mediano 384² · Grande 576×112×576 · Gigante
  768×120×768 (aviso: mucha memoria, ~1,7 s). **Streaming de chunks**
  (`streamChunks` en main.js): solo se mallan los chunks dentro del radio de
  render (7 en móvil, 10 en PC) y se descargan los lejanos → mundos enormes
  jugables. `crearMundo` malla un tope de 170 al arrancar; el resto entra al
  moverse. Semilla reproducible. **Modo creador**: vuelas, rompes al toque,
  sin enemigos.
- **Ciclo día/noche** (`src/game/daynight.js`) según la **hora real del
  dispositivo**: color de cielo, sol (posición e intensidad), luz ambiente y
  estrellas de noche. Keyframes por hora (medianoche → amanecer → mediodía →
  atardecer → noche).
- **Selector de poderes** desplegable en el HUD (toca el chip arriba a la
  derecha) para cambiar de poder al vuelo, sin ir al menú.
- **Minado por tiempo + herramientas** (`src/game/tools.js`): mantener pulsado
  rompe el bloque; el tiempo depende de la dureza del bloque y del poder de la
  herramienta (mano 1 → pico de madera 2,2 → piedra 3,6 → hierro 6 → cristal 10
  (3×3) → martillo del trueno 22 (3×3)). Grieta que crece sobre el bloque.
  `state.herramientas` / `state.herramienta`, chip para cambiar (tecla T). El
  kit inicial trae pico de madera. Los picos de metal/cristal/legendarios se
  fabricarán (crafteo, fase siguiente).
- **Caminar por terreno irregular**: el jugador sube escalones de 1 bloque solo
  (auto-step) y la zona de aparición se funde con el terreno vecino en vez de
  dejar un muro. Antes se quedaba trabado.
- **Lo que construyes se guarda**: cada bloque puesto/roto va a
  `state.mundoEdits` (localStorage, tope 6000) y se re-aplica al volver al mismo
  tipo+tamaño+semilla. Verificado: construir → recargar → sigue ahí.
- **Controles**: PC (WASD + ratón + pointer lock) y móvil (joystick + botones
  táctiles). Verificado que ambos mueven al jugador.
- **Romper / poner bloques** con raycast (DDA). **Inventario**: al romper un
  bloque lo recoges (`state.inventario`, el pasto suelta tierra); solo puedes
  poner bloques que tienes y la cantidad baja al colocar. La hotbar muestra los
  tipos que tienes con su número. Mundo nuevo normal → kit inicial
  (`KIT_INICIAL` en `main.js`: tierra 20, piedra 20, madera 12, tablas 12,
  vidrio 8). En **modo creador** la hotbar tiene todos los bloques e infinitos.
  El grito sónico también recoge lo que rompe.
- **Física**: gravedad, salto, colisiones AABB contra el mundo.
- **Menús**: Jugar / Aprender / Mis poderes / Personajes / Mundos / Ajustes.
  `showMenu()` cierra la pantalla secundaria abierta antes de mostrar el menú
  (antes quedaba encima y parecía que "no volvía").
- **Quiz + progresión**: 11 temas, niveles Bronce/Plata/Oro. Intento = 5
  preguntas, 4 aciertos para subir. Verificado el ciclo completo
  responder → subir medalla → desbloquear poder.
- **677 preguntas en total** (~20 por nivel en cada tema). Los 11 temas están
  completos. Calibradas a 7º–8º básico. Editar/ampliar: `COMO_EDITAR_PREGUNTAS.md`.
- **Poderes**: súper fuerza, velocidad, salto, láser, invisibilidad, grito
  sónico, volar. Se equipan en "Mis poderes" y se aplican al entrar a Jugar.
- **Enemigos por tipo** (`src/game/mobs.js`): Sombra, Espectro (rápido),
  Brincón (salta), Bruto (tanque), Acechador (ve lejos y detecta parcialmente
  la invisibilidad). Aparecen **más y más difíciles según el nivel** (total de
  medallas): de 4 hasta 20, con tipos nuevos que se suman al subir. Invisible o
  volando casi nadie te ve; súper velocidad te salva. Se les pega con ⛏️/clic
  apuntándoles o con el grito sónico en área. HUD: cuántos te persiguen.
  Verificado: escalado por nivel, tipos, invisibilidad, combate, muerte.
- **Jefes y zonas** (`src/game/bosses.js`): 4 torres-baliza de colores aparecen
  en el mapa al desbloquear el poder de cada jefe.
  - Gólem de Piedra (poder: súper fuerza) — HP 42
  - Rayo (súper velocidad) — HP 30, muy rápido
  - Ojo Ardiente (visión láser) — HP 46, flota
  - El Coloso (volar) — HP 84, invoca ayudantes
  Modelo de daño "mezcla": el poder correcto equipado hace **3× de daño**.
  Barra de vida del jefe en el HUD. Al derrotarlo: se guarda en
  `state.jefesDerrotados` y desaparece la baliza. Si te alejas mucho, el jefe
  se calma y puedes reintentar. Verificado: aparición, inicio, combate,
  bonus por poder correcto, derrota, huida.
- **Editor de skins**: canvas 64×64, lápiz/borrador/balde/cuentagotas/deshacer,
  paleta de 24 colores, guías de partes del cuerpo, vista previa 3D en vivo,
  guardar varias skins, importar/exportar PNG.
- **Tercera persona**: tecla `V` / botón 👁️ / ajuste "vista por defecto". El
  monigote mira hacia donde camina (`avatar.rotation.y = yaw + Math.PI`, su cara
  está en la cara +z del modelo), así se ve **de espaldas**. La cámara se acerca
  si hay un bloque detrás para no atravesar el terreno.
- **Ajustes** (`src/ui/ajustes.js`, pantalla ⚙️): invertir joystick X/Y,
  invertir cámara vertical, sensibilidad de cámara, joystick izquierda/derecha
  (zurdos), vista 1ª/3ª por defecto, pantalla completa al jugar. Todo en
  `state.ajustes`, se aplica en caliente.
- **Móvil**: joystick **dinámico** (aparece donde tocas, en su mitad de
  pantalla), botones táctiles más grandes, `requestFullscreen()` al pulsar
  Jugar (oculta la barra del navegador), aviso "gira el teléfono" en vertical,
  menús con scroll en horizontal, `safe-area-inset` para el notch.
- **Skins más detalladas**: `paintSkin()` con sombreado (caras laterales más
  oscuras, luz arriba, rasgos de cara, pelo con volumen, ropa con costuras,
  zapatos). 4 presets (Clásico, Aventurera, Héroe, Invierno) para empezar.
- **Editor de skins mejorado**: presets de inicio, 3 tamaños de pincel,
  "cara simétrica", paleta ordenada (tonos de piel juntos), botones de rotar
  la vista previa, lienzo más grande.
- **Sonido y música** (`src/game/audio.js`, todo generado con Web Audio, sin
  archivos ni copyright): efectos para romper/poner, pisadas, salto, golpes,
  daño, grito sónico, jefe, acierto/fallo/medalla del quiz, clic de menú.
  **Música**: loop estilo phonk (kick, hi-hats, 808, cencerro melódico) con
  filtro lo-fi. En **⚙️ Ajustes**: Música (Del juego / Spotify / Ninguna),
  volumen música y volumen efectos. El audio arranca con el primer toque
  (regla de los navegadores). Con "Spotify" la música del juego se apaga y
  aparece un botón que abre una lista de phonk en Spotify (búsqueda) — el
  usuario la deja sonando aparte y el juego pone solo los efectos.
  **En el teléfono funcionan la música phonk y los efectos**; el control de
  reproducción de Spotify DENTRO del juego no es posible en móvil (limitación
  del SDK de Spotify), por eso es "aparte".
- **PWA**: manifest + service worker (cache-first). `npm run build` OK
  (bundle ~515 KB / 135 KB gzip; bancos de preguntas en chunks aparte).

## Limitaciones conocidas / pendiente

- El progreso es **por dispositivo** (localStorage). No se sincroniza entre el
  teléfono y el PC. (Futura fase: API mínima en el servidor ARGOS.)
- El mundo tiene bordes (no es infinito), pero ahora es ×20 más grande y con
  streaming de chunks. Tamaños en `TAMANOS` (`world.js`).
- Solo se guarda **un** mundo a la vez: crear otro con distinto tipo/tamaño/
  semilla borra las construcciones del anterior (aviso en pantalla).
- Los jefes son visualmente simples (cubos grandes con ojos). Funcionan, pero
  se pueden hacer más vistosos (formas, partículas, ataques propios).
- No hay barra de vida del jugador: los golpes de enemigos solo te empujan.
- Pantalla completa / bloqueo horizontal: dependen del navegador. En iOS Safari
  `requestFullscreen` sobre la página no siempre funciona; instalar como app
  (Agregar a pantalla de inicio) lo resuelve (`display: fullscreen` en el
  manifest). El aviso "gira el teléfono" cubre el caso vertical.
- Iconos PWA: solo SVG. Para icono perfecto en iOS, agregar PNG 192/512 en
  `public/icons/` y listarlos en el manifest.

## Roadmap pedido por Richard (partes)

- **Parte 1 — Naturaleza y animales**: ✅ hecho.
- **Parte 2 — Crafteo**: ✅ hecho.
- **Parte 3 — Objetos legendarios + búsqueda de gemas**: pendiente. Ítems
  originales (martillo del trueno, guante de gemas de poder — nombres y arte
  propios, sin copiar a Marvel/otros) y una misión de gemas con mapa y
  guardianes cada vez más difíciles.
- **Parte 4 — Más enemigos originales + texturas/luz más realistas**: pendiente.
  Acechadores de pasillo, gigantes, y mejor iluminación/materiales.

## Ideas para siguientes iteraciones

- Barra de vida del jugador + pociones/recuperación.
- Jefes con ataques especiales propios y mejor arte.
- Guardar varios mundos con nombre (hoy solo uno a la vez).
- Recompensas visibles por derrotar jefes (skins, trofeos en un menú).
- Sincronización de progreso entre dispositivos vía servidor casero.
