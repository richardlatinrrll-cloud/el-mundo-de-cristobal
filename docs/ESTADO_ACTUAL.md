# Estado actual — El Mundo de Cristóbal

_Actualizado: 2026-09-09 (Parte 8)_

## Parte 8 — Más difícil, curación con trivia, fluidos

- **Enemigos MUCHO más duros** (`mobs.js`, `bosses.js`, `gemas.js`): HP ×2-4
  (Sombra 7, Bruto 24, Gigante 60, Larguirucho 26; jefes 240-520; guardianes
  70-430), más daño, más rápidos, atacan más seguido, más cantidad
  (`cantidadEnemigos` 6→28), el Elfo invoca de a 2.
- **Curación con trivia en pelea de jefe**: si estás bajo el 70% de vida durante
  una pelea de jefe/guardián, aparece el botón **❤️ Curarme (5 preguntas)**
  (`src/ui/curar-trivia.js`). Responde 5 preguntas de cualquier tema; con 4
  aciertos recuperas **toda la vida**. Enfriamiento de 30 s. No afecta el
  progreso de los temas.
- **Agua y lava CORREN** (`src/engine/fluidos.js`, tick cada 0,35 s cerca del
  jugador): caen si hay aire debajo; el fluido "alimentado" desde arriba (una
  caída o poza) se extiende al lado y se derrama por los bordes; agua + lava =
  roca oscura. Acotado (presupuesto por tick, radio 18, los lagos quietos no se
  expanden ni se vacían).

**Publicado en GitHub Pages** (repo público, sitio `noindex` + pantalla de clave
para "solo para Cristóbal"). El deploy es automático: `git push` a `main` →
GitHub Actions (`.github/workflows/deploy.yml`) construye y publica.
- URL: la que da GitHub Pages para el repo.
- **La clave se pide CADA VEZ** que se abre el juego (`src/ui/clave.js`).
  - Clave normal `Cristobal2013` (hash `89195a`): juego con avance guardado.
  - **Clave maestra** (RUT de Richard sin DV, hash `5jqypa`): modo de prueba con
    TODOS los poderes, gemas, herramientas y armadura; **no guarda el avance**
    (`state.maestro` → `save()` no hace nada). No es invencible: se puede probar
    el combate y morir.
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
- **Búsqueda de Gemas (Parte 3)** (`src/game/gemas.js`, `src/ui/gemas.js`,
  pantalla 🔮 / botón 🔮 en el HUD / tecla `G`): 6 Gemas de Poder originales
  (Ígnea, del Brinco, Veloz, Vital, Centella, Prisma). Aparecen **de a una, en
  orden**, en sitios repartidos del mapa; cada una la cuida un **guardián cada
  vez más difícil** (HP 24 → 150). Al derrotarlo consigues la gema y su "don"
  pasivo (más daño, salto, velocidad, menos empujón…). La pantalla del mapa
  muestra dónde está cada gema, cuál es tu objetivo y cuáles faltan.
- **Objetos legendarios (Parte 3)**:
  - **Martillo del Trueno** ⚡ — se **forja al juntar 3 gemas**. Rompe 3×3 y
    pega durísimo. Con la **Gema Centella**, el botón de poder ✨ lanza un
    **rayo** donde apuntas (daño en área, enfriamiento 4 s).
  - **Guante de Gemas** ✊ — con **las 6 gemas**, el botón de poder ✨ hace la
    **Onda Prisma**: limpia un área enorme alrededor tuyo y barre a los
    enemigos (enfriamiento 12 s).

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
  la invisibilidad), **El Larguirucho** y **El Gigante** (Parte 4). Aparecen
  **más y más difíciles según el nivel** (total de medallas): de 4 hasta 20, con
  tipos nuevos que se suman al subir. Invisible o volando casi nadie te ve;
  súper velocidad te salva. Se les pega con ⛏️/clic apuntándoles o con el grito
  sónico en área. HUD: cuántos te persiguen.
  - **El Larguirucho** (acechador de pasillos, nivel 9+): altísimo y flaco, ojos
    que brillan. **Se congela mientras lo miras** y avanza rapidísimo cuando le
    quitas la vista de encima. Siempre sabe dónde estás.
  - **El Gigante** (nivel 14+): enorme, mucha vida, muy lento pero te manda a
    volar de un golpe. Corre lejos: no te alcanza si sigues moviéndote.
- **Texturas y luz más realistas (Parte 4)**: texturas procedurales con más
  detalle (piedra con grietas, ladrillo con juntas, tablas con vetas, pasto con
  matices, arena, ladrillo…), **oclusión ambiental** por vértice (los rincones
  y la base de árboles/muros se oscurecen → se ve profundidad) y sombreado por
  cara (arriba más claro, abajo más oscuro). Luz ambiente un poco más cálida y
  fuerte para que la sombra no ensucie.

## Parte 5 — Vida, caza y jefes de verdad

- **Sistema de vida** (`state.salud` 0..100 = 10 corazones): los enemigos te
  hacen daño de verdad (cada tipo/jefe tiene su `dano`). La vida **se regenera
  sola** de a poco al no recibir golpes. Al llegar a 0 → pantalla "Te
  desmayaste", revives en el punto de inicio **con tus cosas**. HUD: fila de
  corazones + botón **🍖 Comer** (tecla F) que usa la mejor comida que tengas
  (carne cocida cura más que la cruda).
- **Armadura de cuero**: 4 piezas fabricables (casco/peto/pantalón/botas);
  cada una reduce el daño ~13% (hasta ~55% con las 4). HUD: 🛡️ con el número.
- **Caza de animales**: los animales tienen vida; al cazarlos (⛏️ o arco)
  sueltan **carne, cuero, pluma o lana** según la especie. Con eso hay recetas
  nuevas (categoría **Comida y ropa**): carne cocida, flechas con pluma, y las
  4 piezas de armadura de cuero.
- **Tablero de armado** (`src/ui/tablero.js`, botón en la pantalla de Crafteo):
  grilla 3×3 donde hay que **colocar los materiales en su forma** (pico = 3
  arriba + 2 palos en columna, espada = 2 en fila + palo, etc.). Cuando la
  figura está bien aparece "Fabricar". Entrena paciencia y "ver" cada
  herramienta. La lista de recetas normal sigue disponible.
- **Mini-mapa** (`src/ui/gemas.js` → `dibujarMiniMapa`): el botón 🔮 del HUD
  (tecla G) abre un **mini-mapa chico y transparente justo debajo de la línea
  de vida** (arriba a la izquierda), que no pausa el juego, con los sitios de
  las gemas y tu posición. La pantalla completa de Búsqueda de Gemas sigue en
  el menú.
- **Jefes rediseñados** (`src/game/bosses.js`): ahora son **Trol de las Rocas**,
  **Dragón Tormenta**, **Titán Ardiente** y **Elfo Oscuro** (formas propias con
  cuernos, alas, capa, puños ardientes…). **~3× más vida** (95–210) y **ataques
  de verdad**: proyectiles (roca / aliento de dragón / bola de sombra),
  embestida, onda sísmica que te empuja, invocar sombras, parpadeo (el elfo se
  teletransporta). El poder correcto sigue haciendo 3×. Los guardianes de gemas
  también tienen más vida y te hacen daño.
- **Selector de poderes**: etiqueta "PODER" sobre el chip; en el teléfono la
  lista se abre **centrada** con botones grandes (antes se pegaba al borde y
  costaba tocar).
- **Joystick táctil**: la esfera interior ahora **se centra en el anillo** al
  soltar (antes quedaba pegada arriba por un desajuste de `transform`). El
  origen es el centro real del anillo (joystick fijo) y todo se atenúa cuando
  no se usa.

## Parte 7 — Combate con emoción, arma a la vista, jefes con más detalle

- **Los poderes ya no matan al instante**: `danoCombate()` en main.js — súper
  fuerza = ×2,4 daño + empujón; visión láser = ×1,6. Cada golpe **aleja** al
  enemigo (los básicos aguantan más: Sombra/Espectro 3, Brincón 4, Bruto 8,
  Gigante 26…). `instaBreak` solo sirve para picar bloques, no para el combate.
- **Se ve el arma/herramienta en primera persona** (`src/game/viewmodel.js`):
  una mano sostiene el pico / hacha / espada / arco / martillo y **se balancea
  al atacar**. Con súper fuerza el puño brilla. Se oculta en tercera persona.
- **Grito sónico = hacia adelante** (túnel + cono), con **efecto visual**: 3
  anillos cian que viajan al frente. **Onda Prisma = 360°** (cráter esférico),
  con **efecto visual**: domo que crece + 3 anillos de colores en el suelo.
  `addFx` ahora acepta `delay` para escalonar los anillos.
- **Botón ✨ = activa el poder SELECCIONADO** (cualquiera). Aparece si tienes
  un poder equipado y **no mueve la herramienta** (eso es solo el botón ⛏️).
  Cada poder tiene su acción con ✨:
  - Súper fuerza → golpe de fuerza (cono, empuja) · Súper velocidad → ráfaga
    hacia adelante · Súper salto → salto colosal · Visión láser → **rayo** que
    rompe el bloque + golpea en línea (la herramienta se oculta un instante) ·
    Invisibilidad → manto de sombra 6 s · Volar → impulso arriba · Grito sónico
    → onda hacia adelante · Rayo del Martillo · Onda Prisma (360°).
  - La **Visión láser ya no rompe bloques pasivamente** ni dispara al minar —
    solo con ✨ (`_laserT` en main.js). Rayo del Martillo y Onda Prisma son
    poderes de la lista (`powers/registry.js` campo `gema`: centella / TODAS).
  - `poderDesbloqueado(power, state)` unifica el chequeo (medallas o gemas).
- **Bug corregido**: los enemigos ya **no te "aplastan" si pasas por encima**
  (plataforma) — el golpe cuerpo a cuerpo ahora comprueba que estés a su altura.
- **El Gigante** tiene brazos y **pisotea**: onda telegrafiada que te golpea y
  empuja aunque no te toque (anima los brazos al golpear).
- **El Larguirucho** ya no queda "congelado": se acerca lento mientras lo miras
  y rapidísimo cuando le quitas la vista.
- **Rayos láser**: sólidos (no transparentes), salen de los ojos, **también se
  ven en tercera persona**, y solo mientras mantienes pulsado el ataque.
- **Armaduras de jefe**: al derrotar a cada jefe ganas una pieza
  (`ARMADURA_JEFE` en recetas.js): Coraza del Trol, Escamas del Dragón, Placa
  del Titán, Manto del Elfo Oscuro (−17% daño cada una).
- **Jefes con más detalle** (`makeBossMesh` reescrito): más piezas, colores
  sombreados, púas/cuernos/escamas/crin, piernas y brazos definidos.
- **Tablero de armado**: si te falta un material, la guía te dice **dónde
  conseguirlo** (ej. "Cristal — Mina cristal, en lo más profundo").
- **Crafteo en el teléfono**: encabezado mucho más chico (media query) para dar
  más espacio a ver la figura que armas.

## Parte 6 — Armado guiado, sala de pruebas y láser

- **Libro de recetas** (`src/ui/crafteo.js`): rediseñado, más aireado. Ya **no
  fabrica automáticamente**; cada receta tiene un botón **🔧 Armar** que abre el
  Tablero con la guía. "Lo que tienes" pasó a ser un desplegable que no tapa
  nada. Las 25 recetas ahora son FORMAS (una sola lista en `recetas.js`).
- **Tablero con guía fantasma** (`src/ui/tablero.js`): al venir de una receta,
  el tablero muestra **cubos transparentes** en las casillas que hay que
  rellenar, con el emoji del material que va en cada una, más una leyenda
  ("Necesitas: 🪨 Piedra ×3 · 🥢 Palo ×2"). Tocar un cubo fantasma coloca ese
  material solo. Sigue funcionando el modo libre.
- **🧪 Sala de pruebas** (`src/ui/pruebas.js`, solo con la clave maestra, en el
  menú): tocar un enemigo/jefe te mete a una **arena plana en modo juego**
  (`entrarArenaPrueba()`) con esa criatura enfrente. Sí te puedes mover y pelear
  (antes no cambiaba a modo `jugar` y quedabas trabado). Los enemigos de la
  arena no se reponen solos (`mobs.arenaMode`). Botón "Limpiar arena".
- **Volver al inicio al salirse del mapa**: si te caes al vacío o pasas los
  bordes del mundo, reapareces en el punto de inicio (`player.js`).
- **Rayos de la Visión láser**: al tener el poder equipado salen **dos haces
  rojos desde los ojos** hacia donde apuntas (más brillantes al minar), con un
  puntito de impacto. El **Titán Ardiente** también dispara un rayo rojo de sus
  ojos como ataque (`bosses.js` `lanzarRayo`).
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
- **PWA**: manifest + service worker **network-first** (`public/sw.js`, caché
  `mundo-cristobal-v13`). `npm run build` OK (bundle ~630 KB / 172 KB gzip;
  bancos de preguntas en chunks aparte).

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
- **Parte 3 — Objetos legendarios + búsqueda de gemas**: ✅ hecho.
- **Parte 4 — Más enemigos originales + texturas/luz más realistas**: ✅ hecho.
- **Parte 5 — Vida, caza, armadura, tablero de armado, mini-mapa, jefes con
  ataques + clave maestra**: ✅ hecho.
- **Parte 6 — Armado guiado (guía fantasma), sala de pruebas, respawn al salir
  del mapa, rayos láser**: ✅ hecho.

## Ideas para siguientes iteraciones

- Barra de vida del jugador + pociones/recuperación.
- Jefes con ataques especiales propios y mejor arte.
- Guardar varios mundos con nombre (hoy solo uno a la vez).
- Recompensas visibles por derrotar jefes (skins, trofeos en un menú).
- Sincronización de progreso entre dispositivos vía servidor casero.
