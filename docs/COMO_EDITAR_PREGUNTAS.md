# Cómo agregar o editar preguntas

Las preguntas están en `src/quiz/banks/`, **un archivo `.json` por tema**
(677 preguntas en total, ~20 por nivel en cada tema):

`finanzas.json`, `energias.json`, `reciclaje.json`, `matematica.json`,
`tecnologia.json`, `sociales.json`, `pensamiento.json`, `lenguaje.json`,
`ciencias.json`, `historia.json`, `ingles.json`.

Todos están completos. Puedes agregar más preguntas cuando quieras siguiendo
el formato de abajo.

## Formato

```json
{
  "tema": "Nombre que se muestra en el juego",
  "niveles": {
    "bronce": [ ...preguntas fáciles... ],
    "plata":  [ ...preguntas medias... ],
    "oro":    [ ...preguntas difíciles... ]
  }
}
```

### Tipos de pregunta

**Opción múltiple** (`correcta` es la posición, empezando en 0):
```json
{ "p": "¿Cuánto es 7 × 8?", "opciones": ["54", "56", "63", "48"], "correcta": 1 }
```
Aquí la respuesta correcta es `"56"` porque está en la posición 1
(las posiciones son 0, 1, 2, 3). El juego baraja las opciones solo.

**Escribir la respuesta**:
```json
{ "p": "El 10% de 30.000 es:", "tipo": "escribir", "respuesta": "3000" }
```
Para números, escribe la respuesta sin puntos ni símbolos (`3000`, no `$3.000`).
El juego ignora espacios, puntos y el signo `$` al comparar, y no distingue
mayúsculas. Para texto, usa una sola palabra si puedes (`fotosíntesis`).

## Reglas

- Pon **al menos 5 preguntas por nivel** (idealmente 8–10) para que no se
  repitan en cada intento.
- Cada intento toma 5 preguntas al azar del nivel; se necesitan **4 aciertos**
  para subir de medalla.
- Cambiar esos números: `src/quiz/quiz-engine.js`
  (`PREGUNTAS_POR_INTENTO`, `ACIERTOS_PARA_PASAR`).

## Agregar un tema nuevo

1. Crea `src/quiz/banks/mitema.json` con el formato de arriba.
2. Añádelo a la lista en `src/game/topics.js`:
   ```js
   { id: 'mitema', nombre: 'Mi Tema', emoji: '🌟', completo: true },
   ```
   El `id` debe ser igual al nombre del archivo (sin `.json`).

## Probar

`npm run dev`, entra a **Aprender**, elige el tema y responde. Después de editar
un `.json` recarga la página.
