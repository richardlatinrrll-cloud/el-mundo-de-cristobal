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

| Poder | Efecto | Requisito por defecto |
|---|---|---|
| Súper fuerza | rompe cualquier bloque de un golpe | 1 medalla bronce |
| Súper velocidad | corre mucho más rápido (dejas atrás a las Sombras) | 2 medallas bronce |
| Súper salto | salta altísimo | 3 medallas bronce |
| Visión láser | rompe bloques a distancia | 1 medalla plata |
| Invisibilidad | las Sombras no te detectan | 2 medallas plata |
| Grito sónico | onda que despeja el terreno (botón ✨ / tecla F) | 1 medalla oro |
| Volar | vuelo libre (saltar sube, agacharse baja) | 2 medallas oro |

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

Hay 5 tipos en el objeto `TYPES`, cada uno con `hp`, `speed`, `view`
(distancia a la que te ve), `knock` (empujón), `minNivel` (medallas totales para
que empiece a aparecer) y `peso` (probabilidad relativa).

- **Sombra**: básico, lento. Desde el inicio.
- **Espectro**: rápido; conviene tener súper velocidad. Desde 3 medallas.
- **Brincón**: salta obstáculos. Desde 6.
- **Bruto**: mucha vida y empujón fuerte, lento. Desde 10.
- **Acechador**: ve muy lejos y detecta a medias la invisibilidad. Desde 15.

La cantidad total de enemigos sube con tu nivel: `4 + nivel × 0,8`, hasta 20.

## Jefes (`src/game/bosses.js`)

4 jefes en el arreglo `BOSSES`. Cada uno tiene `power` (el poder que hace 3×
daño y que, al desbloquearlo, hace aparecer su torre-baliza), `hp`, `speed`,
`size` y `at: [x, z]` (dónde está su zona en el mapa).

- **Gólem de Piedra** — súper fuerza — esquina [14, 14]
- **Rayo** — súper velocidad — esquina opuesta arriba
- **Ojo Ardiente** — visión láser — flota — esquina abajo izquierda
- **El Coloso** — volar — esquina opuesta, invoca ayudantes

Para cambiar dificultad: sube/baja `hp` o `speed`. Para agregar un jefe: otro
objeto en `BOSSES` con un `power` existente y unas coordenadas libres.
