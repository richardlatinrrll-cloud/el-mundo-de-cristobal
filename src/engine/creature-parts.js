import * as THREE from 'three';

// Piezas compartidas para dar un aspecto menos "de cubo" (y menos "infantil":
// colores de dibujo animado, plástico liso) a personajes, enemigos, jefes y
// animales: cápsulas redondeadas en vez de cajas para brazos/piernas, colores
// "madurados" (menos saturados, un poco más oscuros) y material con mejor
// respuesta a la luz — mismo color base y posición que antes, solo se ve
// menos de juguete.

// baja la saturación y el brillo de un color: de "rojo de crayola" a un tono
// más terroso/serio, conservando el matiz. sat=1 no cambia nada, dark=1 no
// oscurece.
export function madurar(hex, sat = 0.6, dark = 0.85) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const mezcla = (c) => Math.max(0, Math.min(255, (lum + (c - lum) * sat) * dark)) | 0;
  return (mezcla(r) << 16) | (mezcla(g) << 8) | mezcla(b);
}

// material estándar (mejor luz que Lambert) con el color ya "madurado"
export function matCriatura(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: madurar(color), roughness: 0.85, metalness: 0.04, ...opts });
}

// cápsula vertical (por defecto) que ocupa aproximadamente el mismo espacio
// que una caja (w, h, d) — se usa el mayor de w/d como diámetro.
export function capsula(w, h, d, color, opts = {}) {
  const radius = Math.max(w, d) / 2;
  const largo = Math.max(0.02, h - radius * 2);
  return new THREE.Mesh(new THREE.CapsuleGeometry(radius, largo, 4, 8), matCriatura(color, opts));
}
