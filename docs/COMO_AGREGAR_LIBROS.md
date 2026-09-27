# Cómo agregar un libro a "Mis lecturas"

"📖 Mis lecturas" es el minijuego de plataformas 2D para preparar las pruebas
de lectura. Cada libro es **un archivo `.json`** en `src/lecturas/libros/`.
Basta con agregar el archivo: aparece solo en la pantalla (no hay que tocar
código).

La forma más fácil: pasarle el PDF del libro a Claude y pedirle "agrega este
libro a Mis lecturas". Claude lo lee y escribe las preguntas.

## Formato

```json
{
  "id": "el-jardin-secreto",
  "titulo": "El jardín secreto",
  "autor": "Frances Hodgson Burnett",
  "emoji": "🌹",
  "preguntas": [
    { "cap": "I", "p": "¿En qué país vivía Mary?",
      "opciones": ["En la India", "En Egipto", "En Australia", "En Irlanda"], "correcta": 0 }
  ]
}
```

- `id`: sin espacios ni tildes; es la clave con la que se guarda el avance.
- `cap`: capítulo donde está la respuesta. Se muestra como **pista** cuando se
  equivoca.
- `correcta`: la posición de la respuesta buena (0 = la primera). El juego
  **baraja** las opciones cada vez, así que puede ir siempre en la posición 0.
- Siempre 4 opciones. Mientras más preguntas, mejor: idealmente 80–130 que
  recorran el libro entero, en el orden de la historia.
- **No cambies el texto (`p`) de una pregunta** después de que Cristóbal ya
  jugó: el avance se guarda por ese texto, y esa pregunta volvería a contar
  como nueva.

## Cómo funciona (modo dominio)

- Cada **nivel** tiene hasta 20 puertas (`PREGUNTAS_POR_RONDA` en
  `src/lecturas/progreso.js`). Cada puerta es una pregunta y no se abre hasta
  que la responda bien. Si se equivoca, ve la pista del capítulo y espera 3 s,
  y la misma pregunta vuelve con las opciones barajadas.
- **Acertar al primer intento** hace que la pregunta quede dominada y no
  vuelva. **Fallar** hace que se repita en las rondas siguientes (entran
  primero las falladas y el resto se completa con preguntas nuevas, siempre en
  el orden del libro).
- Si **sale a mitad de un nivel**, pierde esa ronda y la vuelve a empezar
  (solo se guarda al llegar a la meta).
- El libro queda **dominado** 🏆 cuando todas sus preguntas están dominadas.

## Lectura obligatoria (control del papá)

- Mientras haya un libro **obligatorio** sin dominar, "Jugar" (el mundo 3D)
  tiene candado y lleva a "Mis lecturas".
- Con la **clave maestra**, en "Mis lecturas" aparece la fila "👨 Papá" con:
  *Hacer obligatoria*, *Quitar obligatoria*, *Reiniciar avance* y
  *Repasar igual* (si ya está dominado). Estos cambios **sí se guardan**
  aunque sea modo maestro (`saveLecturas()` en `state.js`); lo que se juega en
  modo maestro no cuenta como avance.
- La primera vez que se abre el juego con esta versión, «El jardín secreto»
  queda asignado como obligatorio (`LIBRO_INICIAL` en `progreso.js`).
