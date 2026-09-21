# Estado actual — El Mundo de Cristóbal

_Actualizado: 2026-09-16 (tarde)_

Contexto y mapa del código: `docs/CLAUDE.md`. Este archivo describe **qué hay
hecho hoy** (todo verificado en el navegador) y, al final, el **registro de
cambios** por tandas.

Publicado en **GitHub Pages** (deploy automático al hacer `git push`) y en el
**servidor casero ARGOS** por Tailscale (`http://100.111.194.61:8082`).
Caché del service worker: `mundo-cristobal-v32`.

---

## Mundo y construcción

- **7 tipos de mundo + modo creador** (`world.js`, pantalla "🌍 Mundos"):
  Llanuras, Bosque, Montañas, Desierto, Islas, Islas flotantes, Plano.
  Tamaños Pequeño 192³ · Mediano 384² · Grande 576×112×576 · Gigante 768×120×768.
  Semilla reproducible. **Modo creador**: vuelas, rompes al toque, sin enemigos,
  hotbar infinita.
- **Naturaleza**: ríos, lagos, mar, cascadas y **volcanes**. El interior del
  volcán está **relleno de lava** (chimenea desde muy hondo hasta el cráter).
- **Fluidos con niveles** (`fluidos.js`, sim estilo Minecraft, solo cerca del
  jugador): FUENTE (llena) vs CORRIENTE (se debilita 1 por casilla, agua hasta 6,
  lava hasta 5). El agua **rellena huecos** (si cavas bajo un lago se llena
  solo; 2+ fuentes juntas hacen fuente nueva). La corriente que nadie alimenta
  **se seca**. La **lava corre** al abrir el volcán y **se enfría** con agua
  (→ roca) o sola con el tiempo (deja un río de roca). Acotado y barato
  (~0,5 ms/tick cada 0,25 s); no inunda el mapa (verificado: 1 fuente → poza
  13×13 y para).
- **Malla por chunks** (`mesher.js`): editar un bloque solo re-genera su chunk.
  **Streaming**: solo se mallan los chunks cercanos (radio 7 móvil / 10 PC),
  mundos enormes jugables. Oclusión ambiental + sombreado por cara → profundidad.
- **Minado por tiempo** (`tools.js`): el tiempo depende de la dureza del bloque
  y del poder de la herramienta (mano → pico madera/piedra/hierro/cristal (3×3)
  → Martillo del Trueno (3×3)). Grieta que crece.
- **Inventario con tope** (`CARGA_MAX = 250`): al romper un bloque lo recoges,
  pero la mochila **no es infinita** — cuando se llena hay que guardar cosas en
  un **📦 Cofre**. HUD: 🎒 X/250 (rojo si lleno). Mundo nuevo → **kit inicial**
  con bloques + materiales para fabricar + **antorcha de mano**.
- **📦 Cofre** (`ui/cofre.js`, receta en Construir = 8 tablas): se coloca y se
  **abre tocándolo con 🧱**. Guarda **todo lo que quieras** (sin tope). Pantalla
  con lo que hay dentro + tu mochila; tocas un montón para moverlo; botones
  "Guardar todo" / "Sacar todo". El contenido se guarda por posición
  (`state.cofres`, por mundo). No se puede romper un cofre con cosas dentro.
- Lo que construyes se guarda (`state.mundoEdits`, localStorage) y vuelve al
  recargar el mismo mundo. **Un mundo a la vez.**
- **Depósitos de materiales** (`world.suministros()`): en TODOS los tipos de
  mundo hay ~16–70 (según el tamaño) **montones de material en la superficie**
  (carbón, hierro, cristal, tablas, madera, piedra, arena) con una **antorcha
  encima que brilla** para verlos de lejos. Así siempre hay con qué fabricar,
  incluso en Plano.
- **Ciclo día/noche** por la hora real del dispositivo (`daynight.js`).
  **De noche** (20:00–06:00) los monstruos **se triplican** (hasta 48) y el
  mundo se oscurece — conviene llevar antorcha.
- Caminar por terreno irregular (auto-step de 1 bloque) — **también lo tienen
  los enemigos y animales**, así ya no se quedan pegados en escalones. Los
  muros de 2+ bloques sí los frenan (sirven de defensa). Zona de aparición
  fundida con el terreno. Respawn si te caes del mapa.

## Crafteo

- **Libro de recetas** (`crafteo.js`, botón 🔨 / tecla Q): 25 recetas como
  **formas**. Cada una tiene botón **🔧 Armar** que abre el Tablero.
- **Tablero de armado 3×3** (`tablero.js`): hay que **colocar los materiales en
  su forma**. Viniendo de una receta muestra **cubos fantasma** con el material
  que va en cada casilla + leyenda de lo que necesitas; si te falta algo, dice
  **dónde conseguirlo**. También hay modo libre.
- Categorías: Básico (tablas, palos, vidrio, ladrillo, antorcha de pared),
  Construir
  (puerta de 2 de alto que se abre/cierra entera, ventana, valla, escalera),
  Herramientas (picos, hacha, pala, **Antorcha de mano**), Armas (espadas,
  arco + flechas), Comida y ropa (carne cocida, flechas con pluma, armadura
  de cuero).
- **Antorcha de mano** (`tools.js`, herramienta): se lleva en la mano y
  **ilumina alrededor** (luz de verdad que sigue al jugador). Sirve para
  moverse de noche… pero **mientras la llevas encendida de noche, TODOS los
  monstruos te ven de lejísimos y van por ti**. Elección: ver el camino o
  pasar desapercibido.
- **Minerales**: vetas de carbón/hierro/oro/cristal en la piedra (más hondas y
  raras cuanto mejor el material).

## Estudio y poderes

- **11 temas**: finanzas, energías renovables, reciclaje, matemática,
  tecnología, sociales, pensamiento, lenguaje, ciencias, historia, inglés.
- **677 preguntas** (~20 por nivel por tema), calibradas a 7º–8º básico.
  Editar/ampliar sin programar: `docs/COMO_EDITAR_PREGUNTAS.md`.
- Intento = 5 preguntas del nivel actual, 4 aciertos para subir de medalla
  (Bronce → Plata → Oro). Ciclo completo verificado.
- **11 poderes** (`powers/registry.js`), se equipan en "Mis poderes" y se
  cambian al vuelo con el chip del HUD:

  | poder | requisito | efecto |
  |---|---|---|
  | Súper fuerza | 1 bronce | rompe cualquier bloque al toque; ✨ golpe que empuja |
  | Súper velocidad | 2 bronce | corres mucho más; ✨ ráfaga adelante |
  | Súper salto | 3 bronce | saltas altísimo; ✨ salto colosal |
  | Visión láser | 1 plata | ✨ rayo que rompe el bloque y golpea en línea |
  | Invisibilidad | 2 plata | las Sombras no te ven; ✨ manto 6 s |
  | Visión Nocturna | 1 plata | de noche ves casi como de día, sin antorcha (y sin que te delate) |
  | Modo Súper Saya | 3 plata | ✨ transformación ~15 s (ver abajo) |
  | Grito sónico | 1 oro | ✨ onda hacia adelante que despeja y golpea |
  | Volar | 2 oro | vuelo libre; ✨ impulso arriba |
  | Rayo del Martillo | Gema Centella | ✨ cae un rayo donde apuntas |
  | Onda Prisma | las 6 gemas | ✨ explosión 360° que barre enemigos |
  | Ovnitrix | 3 oro | ✨ tomas la forma y tamaño de un alien (3 base + 7 que hay que derrotar primero), 60 s |

- **Botón ✨**: aparece con cualquier poder equipado y activa ese poder. **No**
  mueve la herramienta (eso es solo el botón ⛏️). El láser solo dispara con ✨.
- **Modo Súper Saya**: la cámara pasa a 3ª persona ~1,7 s, el monigote **grita
  mirando al cielo con los brazos a los lados**, se le pone el **pelo dorado en
  púas**, columna de energía + onda, y queda con **aura amarilla** ~15 s
  (+velocidad, +salto, daño ×2,2, casi no te empujan). El gesto de grito es
  **solo al activar**; después se mueve normal conservando pelo y aura.

## Combate, vida y enemigos

- **Vida** (`state.salud`, 10 corazones): los enemigos hacen daño real; la vida
  se regenera sola al no recibir golpes. A 0 → "Te desmayaste", revives en el
  inicio **con tus cosas**. HUD: corazones + botón **🍖 Comer** (tecla F).
- **Armadura**: 4 piezas de cuero (~13% menos daño c/u) + 1 pieza por cada jefe
  derrotado (~17% c/u).
- **Curación con trivia**: en pelea de jefe/guardián, bajo el 70% de vida
  aparece **❤️ Curarme**: 5 preguntas, 4 aciertos → vida full (enfriamiento 30 s).
- **Los poderes no matan al instante**: cada golpe hace daño + **aleja** al
  enemigo. Súper fuerza ×2,4 daño, láser ×1,6.
- **8 enemigos** (`mobs.js`), aparecen más y más difíciles según tu total de
  medallas: Sombra, Espectro (rápido), Brincón (salta), Bruto (tanque),
  Acechador (ve lejos, detecta parte de la invisibilidad), **El Larguirucho**
  (se frena mientras lo miras, corre cuando no), **El Gigante** (lento, te manda
  a volar, pisotón telegrafiado), **El Autómata GIGANTE** (robot enorme —más
  alto que El Gigante— con 4 brazos-cuchilla, brazos larguísimos, mucha vida,
  ve la invisibilidad).
- **Un muro (2+ bloques) te protege de verdad**: los enemigos no pueden pegarte
  si hay un bloque sólido en medio, aunque el brazo sea largo (`_muroEntre`).
  Así un refugio con paredes y techo funciona.
- **OLEADAS** (`main.js`, `mobs.oleada()`): cada cierto tiempo (la 1ª a los ~8
  min, después cada 15) llega una **oleada de ~60 monstruos** de todos los
  tipos (incluidos gigantes) que aparecen alrededor tuyo y te persiguen todos
  a la vez — casi inunda el mapa. Aviso 1 minuto antes; banner con cuenta atrás
  (dura 3 min); toast al terminar. **Hay que refugiarse.** Rendimiento: solo se
  dibujan los ~26 más cercanos (los demás igual atacan).
- **4 jefes** (`bosses.js`) en torres-baliza que aparecen al desbloquear su
  poder: **Trol de las Rocas** (fuerza), **Dragón Tormenta** (velocidad),
  **Titán Ardiente** (láser), **Elfo Oscuro** (volar). Mucha vida, ataques
  propios (proyectiles, embestida, onda sísmica, invocar, parpadeo, rayo). El
  poder correcto hace **3× daño**. Barra de vida en el HUD.
- **Búsqueda de Gemas** (`gemas.js`, botón 🔮 / tecla G): 6 Gemas de Poder
  originales, aparecen de a una en orden, cada una con un **guardián** cada vez
  más difícil. Dan un "don" pasivo (más daño, salto, velocidad, menos empujón).
  Mini-mapa transparente en el HUD. 3 gemas → se forja el **Martillo del Trueno**.

## Animales y dinosaurios

- **9 animales** (`animals.js`): conejo, ciervo, zorro, oveja, vaca, jabalí,
  oso, tortuga, pájaro. Aparecen según el bioma, pastan, huyen o embisten.
- **4 dinosaurios** (raros de ver, spawn ponderado): **T-Rex** (depredador,
  caza de lejos), **Braquiosaurio** (enorme, cuello largo), **Triceratops**
  (gola + cuernos, embiste), **Raptor** (chico, rapidísimo).
- Modelos de 11–18 piezas (cabeza, hocico, patas, cola, cuernos, ojos…).
  Depredadores (T-Rex, Raptor, Oso, Jabalí) persiguen y empujan al embestir.
- **Caza**: los animales tienen vida; al cazarlos sueltan carne/cuero/pluma/lana
  para las recetas de comida y ropa.

## Personajes (skins)

- **Editor pixel-art 64×64** (`skin-editor.js`): lápiz, borrador, balde,
  cuentagotas, deshacer, 24 colores, cara simétrica, 3 tamaños de pincel,
  guías de partes del cuerpo, vista previa 3D en vivo. 4 presets. Importar/
  exportar PNG. Varias skins guardadas.
- **3ª persona** (tecla V / botón 👁️ / ajuste): el monigote se ve de espaldas;
  la cámara se acerca si hay un bloque detrás.
- **Cuerpo con extremidades redondeadas** (`skin-model.js`, pedido de Richard
  para que el jugador se vea "más realista"): cabeza y torso siguen siendo
  cajas con la textura pixel-art de la skin tal cual (cara y diseño de la
  ropa intactos, todas las skins ya creadas se siguen viendo igual ahí), pero
  brazos y piernas ahora son **cápsulas** (`THREE.CapsuleGeometry`) con un
  color sólido promediado a partir de la zona de manga/pantalón de esa misma
  skin (`colorPromedio()`), en vez de la caja rectangular de Minecraft.
  Material `MeshStandardMaterial` (mejor respuesta a la luz que antes). Es el
  primer paso de un pedido más grande ("que los personajes y enemigos se vean
  más reales"); confirmado que funcionó, se extendió a **todos** los
  enemigos, jefes y animales (`engine/creature-parts.js` `capsula()`,
  reutilizada en `mobs.js`/`bosses.js`/`animals.js`): brazos y piernas
  redondeados, torso/cabeza/cuernos/alas/adornos siguen siendo cajas.
- **🎒 Ropa y accesorios que se desbloquean estudiando** (`skin/cosmeticos.js`,
  pedido de Richard mostrando una imagen de referencia con un personaje de
  cabeza voxel + cuerpo con ropa bien definida): **15 prendas** en 4 lugares
  — 🧢 cabeza (gorro de lana, gorra, sombrero explorador, casco de acero,
  corona), 👕 cuerpo (polera, polerón, armadura de cuero, armadura de acero),
  👖 piernas (pantalón cargo, pantalón camuflado, grebas) y 👓 cara (anteojos,
  antifaz, goggles). Se desbloquean solas al subir el **total de medallas**
  (bronce+plata+oro de todos los temas, el mismo número que ya usan los
  poderes) — sin tocar cada una a mano: `cosmeticoDesbloqueado()` compara ese
  total contra el umbral de cada prenda. Toast de "nueva ropa desbloqueada"
  al terminar un intento de quiz que suba de medalla y cruce un umbral
  (`startQuiz()` en `main.js`). Se equipan (un máximo por lugar, tocar de
  nuevo para sacárselo) desde la pantalla **Personajes** → sección "Ropa y
  accesorios" (mismo estilo visual que "Mis poderes": bloqueado/equipado). Las
  prendas son mallas propias (`makeCosmeticoMesh()`) que se agregan como
  **hijas** de `head`/`body`/`legR`/`legL` del avatar — así siguen gratis la
  animación de caminar/girar que ya tenía cada parte, sin código nuevo de
  animación. `state.cosmeticos.equipados` se guarda; lo desbloqueado NO se
  guarda (se recalcula siempre desde `medallas`, no puede desincronizarse).
- **Se puede tocar directo el muñeco 3D** para cambiarle la ropa (Richard: el
  editor pixel-art "no se entiende", quería editar directo en 3D). La vista
  previa de "Personajes" ahora es de cuerpo entero (antes estaba encuadrada
  solo cabeza+torso) y tocarla cicla la prenda de esa franja: arriba de todo
  = cabeza, luego cara, cuerpo, piernas (`FRANJAS` en `skin-editor.js`, son
  franjas verticales simples por posición del toque en el canvas — se probó
  primero con raycasting 3D real contra la malla, pero con el muñeco
  girando solo y piernas/cara siendo blancos chicos resultaba muy impreciso
  para tocar; las franjas son mucho más tolerantes, mejor para un chico
  tocando una pantalla). La lista de abajo sigue estando, por si prefieren
  tocar ahí. El **editor de colores (pixel a pixel)** sigue siendo la pantalla
  de dibujo 2D — pasarlo a pintar directo sobre el 3D es un cambio de
  arquitectura bastante más grande (raycasting a coordenadas de textura) que
  no se abordó esta vez.

## Controles y ajustes

- **PC**: WASD moverse · ratón mirar · clic izq. picar / pegar · clic der. poner
  · Shift correr · Espacio saltar · ✨ o tecla de poder · V vista · T herramienta
  · Q crafteo · G mini-mapa.
- **Móvil**: joystick dinámico (aparece donde tocas) · arrastrar (mitad derecha)
  mirar · botones ⛏️ / 🧱 / ✨ / ⤒ / 👁️. Fullscreen al jugar, aviso "gira el
  teléfono" en vertical, safe-area para el notch.
- **⚙️ Ajustes** (`ajustes.js`): invertir joystick X/Y, invertir/sensibilidad de
  cámara, joystick izquierda/derecha (zurdos), vista 1ª/3ª por defecto, pantalla
  completa, música (juego / Spotify / ninguna) y volúmenes.

## Sonido

Todo generado con Web Audio, sin archivos ni copyright (`audio.js`): efectos
(romper, poner, pasos, golpes, daño, grito, jefe, quiz…) y música loop estilo
phonk. Con "Spotify" la música del juego se apaga y aparece un botón que abre
una lista de phonk (se deja sonando aparte).

## Sala de pruebas (solo clave maestra)

`pruebas.js`, en el menú. Toca un enemigo, jefe, dinosaurio o animal y apareces
en una arena plana con él enfrente para verlo y pelear. La arena solo tiene lo
que invocas (no repuebla). En la arena la vida **nunca baja de 1 corazón** (es
para observar, no para morir mirando). Botón "Limpiar arena".

---

## Limitaciones conocidas

- El progreso es **por dispositivo** (localStorage): el teléfono y el PC llevan
  avances separados. (Futuro: API mínima en el servidor ARGOS para sincronizar.)
- **Un solo mundo guardado a la vez**: crear otro con distinto tipo/tamaño/
  semilla borra las construcciones del anterior (avisa en pantalla).
- El mundo tiene bordes (no es infinito).
- Iconos PWA: solo SVG. Para icono perfecto en iOS conviene agregar PNG 192/512
  en `public/icons/` y listarlos en el manifest.
- Pantalla completa / bloqueo horizontal dependen del navegador; en iOS Safari
  se resuelve instalando la app ("Agregar a pantalla de inicio").

## Ideas para más adelante

- Sincronizar el progreso entre teléfono y PC.
- Guardar varios mundos con nombre.
- Recompensas visibles por derrotar jefes (trofeos, skins) en un menú.
- Más arte y partículas en jefes y efectos.
- **Pregunta abierta (2026-09-15): ¿modelos 3D reales?** Se hicieron tres
  pasadas de "más realista" con geometría procedural propia (cápsulas,
  colores madurados, proporciones menos "chibi") y a Richard todavía le
  seguían pareciendo infantiles los diseños. El siguiente salto de verdad
  (piel/tela con textura, esculpido, animación con peso) ya no es ajustar
  parámetros: implica modelos 3D hechos por alguien o de un banco de assets
  (CC0/gratis), más un sistema de carga GLTF + animación esquelética que hoy
  no existe (todo es ensamblado de cajas/cápsulas a mano). Cambia la
  identidad "todo generado, sin recursos externos" del proyecto. Sigue
  pendiente decidir con Richard si vale la pena ese camino — el 2026-09-16
  mandó una imagen de referencia (cabeza voxel + cuerpo con proporciones y
  ropa "de verdad") y en vez de eso se priorizó construir el **sistema de
  ropa desbloqueable** (ver sección "Personajes"), que aporta variedad visual
  real sin salir de lo procedural. La pregunta de fondo (¿vale la pena un
  pipeline de assets 3D externos?) sigue abierta.

---

## Ovnitrix

- **10 aliens** (`game/powers/ovnitrix.js`, catálogo `ALIENS`): **3 base**
  (Calorox 🔥, Rafaguero 💨, Diamantoide 💎) disponibles desde que desbloqueas
  el poder, sin hacer nada. **7 de especímenes** (Voltarión, Sombrizo, Congelim,
  Alado, Elastiko, Espinoide, Titanoide): son enemigos nuevos y raros
  (`alienigena: true` en `game/mobs.js`, spawnean mezclados con los demás según
  tu nivel) — al derrotar uno por primera vez queda escaneado para siempre
  (`capturarEspecimen()`, llamado desde `mobs.js _kill`).
- **Transformación real** (`main.js`): cada alien tiene un `visual`
  (tamaño/color/ojos/forma) que se pasa a `makeMesh()` de `game/mobs.js` — el
  MISMO constructor de malla de los enemigos — así el jugador **toma
  literalmente esa forma**, reemplazando su avatar normal mientras dura.
  También cambia el tamaño real de colisión (`player.radius/height/eye`
  escalados por el `size` del alien). Dura 60 s (`player._ovnitrixT`), con una
  aura suave del color del alien encima, y aviso a los 10 s de que se acaba.
  Fuerza la vista en 3ª persona para poder verte transformado (vuelve a la
  vista de antes al terminar).
- **Azar vs. elegir**: con menos de `UMBRAL_CONTROL` (3) especímenes
  escaneados, el botón ✨ transforma en uno al azar (entre los 3 base + lo que
  hayas escaneado); con 3 o más, abre una pantalla (`ui/ovnitrix.js`) para
  **elegir** cuál usar.
- Cada alien da un combo de estadísticas pasivas (velocidad, salto, daño,
  resistencia al empuje, vuelo, invisibilidad o romper bloques al toque)
  mientras dura la forma. **Estas ahora se ASIGNAN, no se suman al máximo**
  (`sprintMul`/`jumpV` reemplazan al valor base en vez de `Math.max` con él) —
  necesario para que un alien pesado pueda ser de verdad **más lento** que tu
  forma normal, no solo "como mínimo igual".
- **Calorox tiene un ataque activo**: con ✨ ya transformado lanza una **bola
  de lava** (`bolaDeLava()` en `main.js`) que sale de su mano (no de la
  cámara), viaja hacia donde miras, golpea a los enemigos y **deja** un
  charco de lava de verdad en el mundo (hasta 3 bloques, solo en aire — nunca
  perfora el bloque sólido que golpeó) que se enfría solo con el tiempo como
  cualquier lava del juego. Cooldown propio de 3 s, **separado** del cooldown
  de transformarse — antes compartían un mismo contador de 20 s y por eso
  parecía que la bola de lava "no funcionaba" recién transformado (en
  realidad el botón seguía bloqueado por el enfriamiento de la
  transformación). Es el único alien con ataque propio por ahora.
- **Minado a su tamaño**: los aliens grandes (tamaño > 1.2, Diamantoide y
  Titanoide) rompen un área de bloques (no solo el apuntado) al picar, para
  poder pasar por el túnel — reutiliza el mismo sistema de "área" que ya
  tienen los picos buenos (`ovnitrixMineBonus()` se suma al `area` de la
  herramienta en `actualizarMinado`).
- **Diamantoide** (antes "Roquetón/roca"): pedido de Richard — pesado,
  resistente y fuerte, pero **no ágil** (a propósito, es coherente con ser de
  piedra preciosa maciza): `sprintMul: 0.75` y `jumpV: 6` — MÁS LENTO y con
  MENOS salto que en tu forma normal — a cambio de `gemDano: 2.2` y
  `empuje: 0.2` (casi no te mueven los golpes). Diseño anguloso/faceteado
  (octaedros + conos brillantes en vez de "rocas apiladas"), color diamante.
- **Diseños propios por alien** (`game/powers/alien-models.js`): cada uno
  tiene una silueta distinta (Calorox con corona de llamas, Rafaguero
  aerodinámico con aletas, Diamantoide anguloso y faceteado, Voltarión con
  núcleo y rayos en zigzag, Sombrizo fantasma sin piernas, Congelim de
  cristales de hielo, Alado con alas grandes, Elastiko con extremidades en
  cadena de segmentos, Espinoide cubierto de púas en todas direcciones).
  Titanoide reutiliza la silueta de "El Gigante" (`forma: 'gigante'`, ya
  tenía buen detalle). Se usan igual para el enemigo salvaje y para la
  transformación del jugador (mismo `makeMesh()` en
  `game/mobs.js`, que delega a `alien-models.js` cuando la `forma` es una de
  estas).
- `especimenesEscaneados()` filtra ids que ya no existan en el catálogo (por
  si cambia en el futuro, para no dejar huérfanos guardados de partidas viejas).

## Cofre — arreglo

- **Bug real encontrado y arreglado**: Grito sónico y Onda Prisma destruían
  bloques en área con `world.set(...)` directo, **sin pasar por la comprobación
  de "cofre con cosas dentro"** que sí tiene el picado normal. Si usabas esos
  poderes cerca de un cofre lleno, el bloque desaparecía y su contenido quedaba
  huérfano en `state.cofres` (inaccesible: parecía que el cofre "perdía todo").
  Arreglado con un helper compartido `esCofreConCosas(x,y,z)` que ambos poderes
  ahora respetan (`main.js`). El guardado normal del cofre (`ui/cofre.js`
  `mover()` llama a `save()` en cada movimiento) ya persistía bien en
  localStorage — verificado con recarga real de página.

## Registro de cambios

- **Base** — Mundo jugable, física, romper/poner, inventario, quiz + progresión,
  poderes básicos, editor de skins, PWA, publicación en GitHub Pages y ARGOS.
- **Parte 1** — Naturaleza (ríos, lagos, volcanes) + 9 animales por bioma;
  mundo ×20. Mundo abierto con streaming de chunks; día/noche por hora real.
- **Parte 2** — Crafteo: recetas, minerales en el mundo, puertas de 2 de alto,
  herramientas y armas.
- **Parte 3** — Objetos legendarios (Martillo del Trueno, Guante de Gemas) +
  Búsqueda de las 6 Gemas de Poder con guardianes escalables.
- **Parte 4** — Enemigos El Larguirucho y El Gigante; texturas procedurales con
  más detalle, oclusión ambiental, sombreado por cara.
- **Parte 5** — Sistema de vida (corazones, comer, revivir con tus cosas),
  armadura de cuero, caza de animales, tablero de armado 3×3, mini-mapa, jefes
  rediseñados (Trol/Dragón/Titán/Elfo) con ataques propios, **clave maestra**.
- **Parte 6** — Libro de recetas sin auto-craft (botón Armar → tablero con guía
  fantasma), Sala de pruebas, respawn al salir del mapa, rayos láser desde los
  ojos.
- **Parte 7** — Combate con emoción (los poderes no matan al instante, empujan),
  arma/herramienta a la vista en 1ª persona, grito sónico hacia adelante y Onda
  Prisma 360° con efecto visual, botón ✨ = activa el poder seleccionado,
  jefes con más detalle + armadura de jefe.
- **Parte 8** — Enemigos mucho más duros (HP ×2-4, más cantidad), curación con
  trivia en pelea de jefe, agua y lava que corren.
- **Parte 9** — 4 dinosaurios + El Autómata + Modo Súper Saya (pelo dorado, pose
  de grito, aura amarilla); modelos de animales de 11–18 piezas; Sala de pruebas
  ampliada con secciones Dinosaurios y Animales.
- **Revisión general** — 3 arreglos: (1) el "agua que corre" de la Parte 8
  inundaba el mapa (un balde llenaba toda la zona) → desactivado, los fluidos
  quedan como los genera el mundo; (2) los 28 modelos de enemigos se dibujaban
  aunque estuvieran lejísimos → se ocultan a >64 bloques; (3) en la Sala de
  pruebas te morías en ~10 s mirando a un jefe → la vida no baja de 1 corazón
  ahí.
- **Noche + antorcha** — Antorcha de mano que ilumina (luz que sigue al
  jugador). De noche (20:00–06:00) los monstruos se triplican (hasta 48, con
  culling de distancia para el teléfono) y, si llevas la antorcha encendida,
  te persiguen desde muy lejos. El mundo de noche se aclaró un poco para poder
  caminar sin antorcha, pero apenas.
- **Auto-step de enemigos/animales** — antes se quedaban pegados en cualquier
  escalón de terreno (solo el jugador subía). Ahora suben 1 bloque igual que el
  jugador (verificado: bajan y suben escaleras enteras persiguiéndote); los
  muros de 2+ siguen frenándolos.
- **Fluidos de verdad (con niveles)** — reemplaza al `fluidos.js` desactivado.
  El agua rellena huecos y pozas, la corriente se debilita con la distancia y
  se seca si nadie la alimenta; NO inunda el mapa. El volcán ahora está lleno
  de lava por dentro y, si lo abres por un costado, **la lava corre y se
  enfría** (con agua → roca al toque; sola → río de roca con el tiempo). El
  mesher baja la superficie del fluido según su nivel (se ve el declive).
- **Antorcha de cortesía + insumos repartidos** — regalo único a las partidas
  ya empezadas: antorcha de mano + un empujón de materiales (`regaloDeCortesia`
  en main.js, flag `state.regaloAntorcha`). El kit inicial de mundos nuevos
  también trae materiales + antorcha. Y `world.suministros()` reparte montones
  de material con antorcha-baliza por la superficie de todos los mapas.
- **Oleadas + Autómata gigante + refugio de verdad** — cada ~15 min (1ª a los
  ~8) llega una oleada de ~60 monstruos de todos los tipos que te persiguen a
  la vez (banner con cuenta atrás, aviso 1 min antes, dura 3 min). El Autómata
  ahora es GIGANTE (más alto que El Gigante, vida 150). Los enemigos ya no
  pegan a través de un muro (`_muroEntre`), así que un cuarto con paredes de 2+
  y techo protege. Render capado a los 26 más cercanos en oleada.
  `window.__game.actions.oleada()` fuerza una para probar.
- **Oleadas ++, Visión Nocturna, mochila con tope, Cofre** — las oleadas ahora
  traen también **4 dinosaurios depredadores** (T-Rex, Raptor, Triceratops) y
  **un jefe al azar** (que se retira al terminar la oleada y no cuenta como
  "derrotado"). Nuevo poder **Visión Nocturna** (1 plata): de noche ves casi
  como de día sin antorcha. La **mochila tiene tope** (250); lo que sobra va a
  un **Cofre** que se fabrica (8 tablas) y guarda todo. El `_muroEntre` también
  protege de dinos y del jefe.
- **Ovnitrix + arreglo del Cofre** — nuevo poder (3 oro): 3 aliens base
  (Calorox, Rafaguero, Roquetón) + 7 que hay que derrotar primero (nuevos
  enemigos raros: Voltarión, Sombrizo, Congelim, Alado, Elastiko, Espinoide,
  Titanoide). Se arregló un bug real: Grito sónico y Onda Prisma podían
  destruir un cofre lleno sin la comprobación de seguridad, dejando su
  contenido huérfano e inaccesible.
- **Ovnitrix: transformación real** — la primera versión solo daba un aura y
  estadísticas; ahora el jugador **toma la forma y el tamaño de verdad** del
  alien (reutiliza el constructor de malla de los enemigos), con hitbox
  escalada. Rediseño del catálogo a 10 aliens curados (3 base + 7 de
  especímenes nuevos) en vez de reusar los 16 enemigos/jefes/dinosaurios
  existentes.
- **Ovnitrix: diseños propios, ataque de Calorox, minado a su tamaño** — cada
  alien tiene ahora una silueta distinta y más elaborada
  (`game/powers/alien-models.js`) en vez del humanoide genérico repetido.
  Calorox puede lanzar una **bola de lava** (✨ ya transformado). Roquetón y
  Titanoide (tamaño > 1.2) rompen un área de bloques al picar, no solo el
  apuntado, para poder pasar por el túnel que cavan.
- **Jugador con extremidades redondeadas** — primer paso de "personajes y
  enemigos más realistas": brazos y piernas del jugador pasan de caja a
  cápsula (`skin-model.js`), color tomado de la propia skin. Cabeza y torso
  siguen igual (misma textura pixel-art, ninguna skin se rompe). Piloto antes
  de decidir si se extiende a los enemigos.
- **Extendido a todos los enemigos, jefes y animales** — nuevo
  `engine/creature-parts.js` con `capsula()`, un reemplazo directo de "caja"
  para brazos/piernas que ya usan `mobs.js`, `bosses.js` y `animals.js`
  (mismo color, mismo lugar, solo redondeado). Cubre los 5 enemigos comunes
  genéricos (cuerpo→cápsula, cabeza→esfera), los brazos/piernas de El
  Larguirucho y El Gigante, los 4 jefes, los 9 animales y los 4 dinosaurios.
  El Autómata se dejó tal cual (robot anguloso a propósito). Torso, cabeza,
  cuernos, alas, colas, capas y demás adornos siguen siendo cajas — solo se
  redondearon las extremidades, que es lo que más se notaba "de bloque".
  Verificado sin errores en los 24 tipos (construcción directa de cada
  malla) y visualmente en el jugador y el Trol de las Rocas.
- **Colores "madurados"** (Richard: los diseños se sienten "demasiado
  infantiles") — `engine/creature-parts.js` `madurar(hex)`: baja saturación y
  brillo conservando el matiz (de "rojo de crayola" a un tono más
  terroso/serio). Se aplica automáticamente al color base de piel/pelaje en
  `mobs.js`, `bosses.js`, `animals.js` y `powers/alien-models.js` (dentro de
  sus helpers `mat()`/`box()`/`capsula()`, sin tocar cada dato de color a
  mano). Los ojos y los brillos (núcleo del Autómata, orbe del Elfo, fuego de
  Calorox) NO se maduran — deben seguir vivos. Excepción añadida: la grieta y
  los puños ardientes del Titán Ardiente (`addV`/`addRV` en `bosses.js`) se
  dejaron sin madurar, si no perdían el efecto de brasa encendida. También se
  afinaron las proporciones del enemigo genérico (cuerpo más esbelto, cabeza
  más chica — menos "chibi").
- **Ropa y accesorios desbloqueables** — 15 prendas (gorros/sombreros,
  poleras/polerones/armaduras, pantalones, anteojos/máscaras) que se
  desbloquean solas al subir el total de medallas y se equipan desde
  "Personajes"; se ven puestas en el jugador (mallas propias colgadas del
  avatar). Empuja el pedido de "más realista" por el lado de la variedad
  visual (ropa de verdad) en vez de seguir esculpiendo el cuerpo base.
- **Editar la ropa tocando el muñeco 3D, Diamantoide y arreglo de la bola de
  lava** — tres pedidos de Richard tras probar la ropa con Cristóbal: (1) la
  vista previa de "Personajes" ahora es de cuerpo entero y tocarla cicla la
  prenda de esa zona (cabeza/cara/cuerpo/piernas), sin tener que usar la
  lista de abajo. (2) Roquetón pasó a ser **Diamantoide**: diseño anguloso y
  faceteado, y ahora de verdad es más lento y salta menos que tu forma normal
  (antes las estadísticas del Ovnitrix solo podían "subir", nunca bajar la
  velocidad/salto base — se cambió a asignar en vez de tomar el máximo). (3)
  la bola de lava de Calorox no se podía lanzar recién transformado: compartía
  el enfriamiento de 20 s de "transformarse" con el de "usar la habilidad".
  Ahora tienen enfriamientos separados, la bola sale de la mano (no de la
  cámara) y además deja un charco de lava real en el mundo (sin perforar el
  suelo) que se enfría solo.
