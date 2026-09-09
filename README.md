# El Mundo de Cristóbal

Juego web tipo Minecraft (sandbox de voxels **original**) para teléfono y
computador. Se construye libremente, pero los **superpoderes** solo se
desbloquean respondiendo preguntas de distintos temas (finanzas, energías
renovables, reciclaje, matemática, ciencias y más — **677 preguntas**, 11
temas), con progresión por medallas **Bronce → Plata → Oro**.

Incluye editor de skins, crafteo con tablero de armado, 8 tipos de enemigos que
escalan con tu nivel, 4 jefes en zonas especiales, búsqueda de 6 gemas de poder,
9 animales + 4 dinosaurios, sistema de vida, y 10 poderes.

## Empezar

```bash
npm install
npm run dev        # → http://localhost:5273
```

## Compilar para publicar

```bash
npm run build      # genera dist/
```

El deploy a GitHub Pages es automático al hacer `git push` a `main`.

## Documentación

- `docs/CLAUDE.md` — qué es y cómo está hecho (empieza por aquí)
- `docs/ESTADO_ACTUAL.md` — qué está hecho y registro de cambios
- `docs/COMO_EDITAR_PREGUNTAS.md` — agregar/editar preguntas (sin programar)
- `docs/COMO_EDITAR_PERSONAJES.md` — poderes y skins
- `docs/DESPLIEGUE_SERVIDOR.md` — publicar en el servidor casero o en internet

## Controles

**Computador:** WASD moverse · ratón mirar · clic izq. picar / pegar a enemigos ·
clic der. poner · Shift correr · Espacio saltar · ✨ usar poder · V primera/
tercera persona · T cambiar herramienta · Q crafteo · G mini-mapa.

**Teléfono:** joystick moverse · arrastrar (mitad derecha) mirar · botones
⛏️ picar/pegar · 🧱 poner · ✨ poder · ⤒ saltar · 👁️ primera/tercera persona.

**Enemigos:** usa 👻 invisibilidad o ⚡ súper velocidad para escapar. Para los
**jefes** (torres de colores en el mapa), equipa el poder de su zona: hace 3×
de daño.
