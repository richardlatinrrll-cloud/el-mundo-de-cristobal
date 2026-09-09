# El Mundo de Cristóbal

Juego web tipo Minecraft para teléfono y computador. El niño desbloquea
**superpoderes** respondiendo preguntas de distintos temas (finanzas, energías
renovables, reciclaje, tecnología, matemática y más — **677 preguntas**), con
progresión por medallas **Bronce → Plata → Oro**. Incluye un **editor de skins**
para crear sus propios personajes, **5 tipos de enemigos** que aparecen más y
más difíciles según tu nivel, y **4 jefes** en zonas especiales que se abren al
desbloquear cada poder importante.

## Empezar

```bash
npm install
npm run dev
```

Abre la URL que muestra la consola (por defecto http://localhost:5273).

## Compilar para publicar

```bash
npm run build      # genera dist/
```

## Documentación

- `docs/CLAUDE.md` — cómo está hecho el proyecto
- `docs/ESTADO_ACTUAL.md` — qué está hecho y qué falta
- `docs/COMO_EDITAR_PREGUNTAS.md` — agregar/editar preguntas (sin programar)
- `docs/COMO_EDITAR_PERSONAJES.md` — poderes y skins
- `docs/DESPLIEGUE_SERVIDOR.md` — publicar en el servidor casero o en internet

## Controles

**Computador:** WASD moverse · ratón mirar · clic izq. picar / pegar a enemigos ·
clic der. poner · Shift correr · Espacio saltar · F usar poder · V primera/tercera
persona · 1–8 elegir bloque.

**Teléfono:** joystick moverse · arrastrar (mitad derecha) mirar · botones
⛏️ picar/pegar · 🧱 poner · ✨ poder · ⤒ saltar · 👁️ primera/tercera persona.

**Enemigos:** usa 👻 invisibilidad o ⚡ súper velocidad para escapar. Para los
**jefes** (torres de colores en el mapa), equipa el poder de su zona: hace 3×
de daño.
