# Personajes, skins y poderes

## Idea

- **Los poderes se ganan estudiando.** Se desbloquean en "Aprender" al subir
  medallas y se equipan en "Mis poderes".
- **El aspecto del personaje lo crea el niño** en la pantalla **Personajes**,
  con el editor de skins. Ahí puede dibujar a quien quiera (sus héroes favoritos,
  personajes propios, etc.). Es para uso personal de la familia.

## Editor de skins (en el juego)

- Lienzo de 64×64 píxeles con **guías** que marcan cada parte del cuerpo
  (cabeza, cuerpo, brazos, piernas). Botón `▦` para mostrar/ocultar las guías.
- Herramientas: lápiz ✏️, borrador 🧽, rellenar 🪣, cuentagotas 💧, deshacer ↩️.
- Paleta de 24 colores.
- **Vista previa 3D** que gira y muestra el resultado en vivo.
- **Guardar como skin**: queda en la lista de abajo; la activa se usa en el juego.
- **Importar PNG / Exportar PNG**: se puede traer un dibujo hecho en otro
  programa (debe ser 64×64, formato de skin de Minecraft clásico) o llevarse el
  propio para editarlo fuera.

## Poderes disponibles (`src/game/powers/registry.js`)

Se equipan en "Mis poderes" y se activan con el botón **✨** del HUD.

| Poder | Efecto | Requisito |
|---|---|---|
| Súper fuerza | rompe cualquier bloque al toque; ✨ golpe que empuja | 1 medalla bronce |
| Súper velocidad | corre mucho más; ✨ ráfaga adelante | 2 medallas bronce |
| Súper salto | salta altísimo; ✨ salto colosal | 3 medallas bronce |
| Visión láser | ✨ rayo que rompe el bloque y golpea en línea | 1 medalla plata |
| Invisibilidad | las Sombras no te ven; ✨ manto 6 s | 2 medallas plata |
| Modo Súper Saya | ✨ transformación ~15 s (pelo dorado, aura, +fuerza/velocidad/salto) | 3 medallas plata |
| Grito sónico | ✨ onda hacia adelante que despeja y golpea | 1 medalla oro |
| Volar | vuelo libre; ✨ impulso arriba | 2 medallas oro |
| Rayo del Martillo | ✨ cae un rayo donde apuntas | Gema Centella |
| Onda Prisma | ✨ explosión 360° | las 6 gemas |

Las medallas son **acumuladas**: subir un tema a Plata cuenta también como
bronce; subirlo a Oro cuenta como bronce + plata + oro.

### Cambiar requisitos o efectos

Edita `src/game/powers/registry.js`. Cada poder tiene:
```js
{
  id: 'velocidad', nombre: 'Súper velocidad', emoji: '⚡',
  desc: 'Corres mucho más rápido.',
  req: { bronce: 2 },              // ← requisito
  aplica(p) { p.sprintMul = 2.2; } // ← efecto sobre el jugador
}
```
Parámetros del jugador que se pueden tocar: `speed`, `sprintMul`, `jumpV`,
`flying`, `instaBreak`, `reach`, `invisible`.

### Agregar un poder nuevo

Añade un objeto más al arreglo `POWERS`. Si el poder es una acción puntual
(como el grito sónico) usa `accion: 'nombre'` y programa el efecto en
`src/main.js` (función `activarPoderAccion`).

## Enemigos (`src/game/mobs.js`)

8 tipos en el objeto `TYPES`, cada uno con `hp`, `dano`, `speed`, `view`
(distancia a la que te ve), `knock` (empujón), `minNivel` (medallas totales para
que empiece a aparecer) y `peso` (probabilidad relativa).

- **Sombra**: básico, lento. Desde el inicio.
- **Espectro**: rápido; conviene tener súper velocidad.
- **Brincón**: salta obstáculos.
- **Bruto**: mucha vida y empujón fuerte, lento.
- **Acechador**: ve muy lejos y detecta a medias la invisibilidad.
- **El Larguirucho**: se frena mientras lo miras, corre cuando le quitas la
  vista. Nivel 9+.
- **El Gigante**: enorme, lento, te manda a volar, pisotón. Nivel 14+.
- **El Autómata**: robot con 4 brazos-cuchilla, ve la invisibilidad. Nivel 12+.

La cantidad total de enemigos sube con tu nivel (`cantidadEnemigos()`), hasta 28.
Para hacer el juego más fácil/difícil: baja/sube `hp` y `dano`, o `minNivel`.

## Jefes (`src/game/bosses.js`)

4 jefes en el arreglo `BOSSES`. Cada uno tiene `power` (el poder que hace 3×
daño y que, al desbloquearlo, hace aparecer su torre-baliza), `hp`, `dano`,
`speed`, `size` y `at: [x, z]` (dónde está su zona en el mapa). Tienen ataques
propios (proyectiles, embestida, onda sísmica, invocar, teletransporte, rayo).

- **Trol de las Rocas** — súper fuerza
- **Dragón Tormenta** — súper velocidad — flota
- **Titán Ardiente** — visión láser — dispara rayo de los ojos
- **Elfo Oscuro** — volar — invoca ayudantes y se teletransporta

Al derrotar cada jefe ganas una pieza de armadura (~17% menos daño). Para
cambiar dificultad: sube/baja `hp` o `dano`. Para agregar un jefe: otro objeto
en `BOSSES` con un `power` existente y coordenadas libres.

## Sala de pruebas (solo con la clave maestra)

En el menú, opción **🧪 Sala de pruebas**: toca cualquier enemigo, jefe,
dinosaurio o animal y apareces en una arena plana con él enfrente para verlo y
pelear. Sirve para revisar cambios sin tener que buscarlos en el mundo.
