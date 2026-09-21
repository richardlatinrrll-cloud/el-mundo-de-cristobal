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

// un tramo que conecta DOS PUNTOS cualquiera (no solo vertical), con radio
// distinto en cada punta — para cuellos/colas que de verdad se vean de una
// pieza en vez de cajas sueltas "flotando" a ojo en ángulos raros.
function tramo(p0, p1, r0, r1, mat) {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length() || 0.001;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), mat);
  mesh.position.copy(p0).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

// cadena de tramos entre una lista de puntos [[x,y,z], ...], con el radio
// afinándose de r0 a r1 a lo largo de la cadena (cuello/cola de dinosaurio o
// dragón, curva de verdad en vez de 2 cajas rotadas a mano). `out` es el
// array/grupo donde se agregan las piezas. Devuelve `{ juntas, material }` —
// TODOS los tramos comparten `material` (una sola pieza para el flash de
// golpe), aunque la cadena tenga un solo tramo y ninguna unión.
export function cadena(out, puntos, r0, r1, color, opts = {}) {
  const mat = matCriatura(color, opts);
  const n = puntos.length - 1;
  const juntas = [];
  for (let i = 0; i < n; i++) {
    const a = new THREE.Vector3(...puntos[i]), b = new THREE.Vector3(...puntos[i + 1]);
    const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    out.add(tramo(a, b, ra, rb, mat));
    // esferita en la unión para que no se note el borde recto del cilindro
    if (i > 0) { const j = new THREE.Mesh(new THREE.SphereGeometry(ra, 8, 6), mat); j.position.copy(a); out.add(j); juntas.push(j); }
  }
  return { juntas, material: mat };
}

// ala tipo membrana (silueta con "dedos", no un rectángulo plano): un hueso
// delantero (cápsula) + una membrana con muescas hecha con THREE.Shape.
// `puntosAla` son [x,y] en el plano local del ala, punta del hombro en (0,0).
export function ala(puntosAla, color, opts = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(puntosAla[0][0], puntosAla[0][1]);
  for (let i = 1; i < puntosAla.length; i++) shape.lineTo(puntosAla[i][0], puntosAla[i][1]);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = matCriatura(color, { side: THREE.DoubleSide, ...opts });
  return new THREE.Mesh(geo, mat);
}
