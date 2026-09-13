import * as THREE from 'three';

// Piezas compartidas para dar un aspecto menos "de cubo" y más orgánico a
// personajes, enemigos, jefes y animales: cápsulas redondeadas en vez de
// cajas para brazos/piernas, con el mismo color/material que ya usaba cada
// caja. No cambia el resto de cada modelo (torso, cabeza, adornos), solo las
// extremidades, que son lo que más se nota "de bloque".

// cápsula vertical (por defecto) que ocupa aproximadamente el mismo espacio
// que una caja (w, h, d) — se usa el mayor de w/d como diámetro.
export function capsula(w, h, d, color, opts = {}) {
  const radius = Math.max(w, d) / 2;
  const largo = Math.max(0.02, h - radius * 2);
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  return new THREE.Mesh(new THREE.CapsuleGeometry(radius, largo, 4, 8), mat);
}
