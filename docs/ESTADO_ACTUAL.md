# Estado actual — El Mundo de Cristóbal

_Actualizado: 2026-09-09_

Contexto y mapa del código: `docs/CLAUDE.md`. Este archivo describe **qué hay
hecho hoy** (todo verificado en el navegador) y, al final, el **registro de
cambios** por tandas.

Publicado en **GitHub Pages** (deploy automático al hacer `git push`) y en el
**servidor casero ARGOS** por Tailscale (`http://100.111.194.61:8082`).
Caché del service worker: `mundo-cristobal-v19`.

---

## Mundo y construcción

- **7 tipos de mundo + modo creador** (`world.js`, pantalla "🌍 Mundos"):
  Llanuras, Bosque, Montañas, Desierto, Islas, Islas flotantes, Plano.
  Tamaños Pequeño 192³ · Mediano 384² · Grande 576×112×576 · Gigante 768×120×768.
  Semilla reproducible. **Modo creador**: vuelas, rompes al toque, sin enemigos,
  hotbar infinita.
- **Naturaleza**: ríos, lagos, mar, cascadas y **volcanes** con lava (brilla y
  empuja al tocarla). Los fluidos quedan **como los genera el mundo** (estáticos);
  el "agua que corre" de la Parte 8 se desactivó porque inundaba el mapa
  (`fluidos.js` quedó sin usar, ver su cabecera).
- **Malla por chunks** (`mesher.js`): editar un bloque solo re-genera su chunk.
  **Streaming**: solo se mallan los chunks cercanos (radio 7 móvil / 10 PC),
  mundos enormes jugables. Oclusión ambiental + sombreado por cara → profundidad.
- **Minado por tiempo** (`tools.js`): el tiempo depende de la dureza del bloque
  y del poder de la herramienta (mano → pico madera/piedra/hierro/cristal (3×3)
  → Martillo del Trueno (3×3)). Grieta que crece.
- **Inventario**: al romper un bloque lo recoges; solo pones lo que tienes.
  Mundo nuevo → kit inicial. Lo que construyes se guarda (`state.mundoEdits`,
  localStorage) y vuelve al recargar el mismo mundo. **Un mundo a la vez.**
- **Ciclo día/noche** por la hora real del dispositivo (`daynight.js`).
  **De noche** (20:00–06:00) los monstruos **se triplican** (hasta 48) y el
  mundo se oscurece — conviene llevar antorcha.
- Caminar por terreno irregular (auto-step de 1 bloque); zona de aparición
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
- **10 poderes** (`powers/registry.js`), se equipan en "Mis poderes" y se
  cambian al vuelo con el chip del HUD:

  | poder | requisito | efecto |
  |---|---|---|
  | Súper fuerza | 1 bronce | rompe cualquier bloque al toque; ✨ golpe que empuja |
  | Súper velocidad | 2 bronce | corres mucho más; ✨ ráfaga adelante |
  | Súper salto | 3 bronce | saltas altísimo; ✨ salto colosal |
  | Visión láser | 1 plata | ✨ rayo que rompe el bloque y golpea en línea |
  | Invisibilidad | 2 plata | las Sombras no te ven; ✨ manto 6 s |
  | Modo Súper Saya | 3 plata | ✨ transformación ~15 s (ver abajo) |
  | Grito sónico | 1 oro | ✨ onda hacia adelante que despeja y golpea |
  | Volar | 2 oro | vuelo libre; ✨ impulso arriba |
  | Rayo del Martillo | Gema Centella | ✨ cae un rayo donde apuntas |
  | Onda Prisma | las 6 gemas | ✨ explosión 360° que barre enemigos |

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
  a volar, pisotón telegrafiado), **El Autómata** (robot con 4 brazos-cuchilla
  giratorios, ve la invisibilidad, nivel 12+).
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

---

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
