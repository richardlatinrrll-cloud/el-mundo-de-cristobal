import * as THREE from 'three';

// Modelo en primera persona: una mano sosteniendo la herramienta/arma actual.
// Se balancea al golpear. Se oculta en tercera persona.
export class ViewModel {
  constructor(camera) {
    this.group = new THREE.Group();
    this.group.position.set(0.42, -0.42, -0.72);
    this.group.rotation.set(0.12, -0.32, 0);
    camera.add(this.group);
    this.hold = new THREE.Group();
    this.group.add(this.hold);
    this.swingT = 0;
    this._id = 'mano';
    this._poder = null;
    this._build();
  }

  _mat(c) { return new THREE.MeshLambertMaterial({ color: c }); }

  _build() {
    const id = this._id;
    this.hold.clear();
    const skin = this._poder === 'fuerza' ? 0xffb14a : 0xd8a77a;
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.24), this._mat(skin));
    this.hold.add(fist);
    if (this._poder === 'fuerza') {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35 }));
      this.hold.add(glow);
    }
    const add = (geo, c, x, y, z) => {
      const m = new THREE.Mesh(geo, this._mat(c)); m.position.set(x, y, z); this.hold.add(m); return m;
    };

    if (/^(pico|hacha|pala|martillo)/.test(id)) {
      add(new THREE.BoxGeometry(0.05, 0.52, 0.05), 0x8a6234, 0, 0.24, -0.02); // mango
      let head, col;
      if (id.startsWith('pico')) head = new THREE.BoxGeometry(0.44, 0.09, 0.09);
      else if (id.startsWith('hacha')) head = new THREE.BoxGeometry(0.22, 0.26, 0.07);
      else if (id === 'martillo_trueno') head = new THREE.BoxGeometry(0.36, 0.3, 0.3);
      else head = new THREE.BoxGeometry(0.2, 0.24, 0.06); // pala
      col = id.includes('cristal') ? 0x7ad8e8 : id.includes('hierro') ? 0xb7a08a
        : id === 'martillo_trueno' ? 0xffd166 : id.includes('piedra') ? 0x8a8f98 : 0xb8894b;
      add(head, col, 0, 0.52, -0.02);
      if (id === 'martillo_trueno') {
        const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12),
          new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
        spark.position.set(0, 0.52, -0.02); this.hold.add(spark);
      }
    } else if (/^espada/.test(id)) {
      add(new THREE.BoxGeometry(0.05, 0.15, 0.05), 0x6b4a2f, 0, 0.11, 0);
      add(new THREE.BoxGeometry(0.24, 0.05, 0.05), 0x5a4a2f, 0, 0.19, 0);
      const col = id.includes('cristal') ? 0x7ad8e8 : id.includes('hierro') ? 0xd8d8e0 : 0x9aa0aa;
      add(new THREE.BoxGeometry(0.07, 0.58, 0.03), col, 0, 0.5, 0);
    } else if (id === 'arco') {
      const arco = add(new THREE.BoxGeometry(0.05, 0.62, 0.05), 0x8a6234, 0.04, 0.16, 0);
      arco.rotation.z = 0.18;
    }
  }

  setTool(id, poder) {
    if (id === this._id && poder === this._poder) return;
    this._id = id || 'mano';
    this._poder = poder || null;
    this._build();
  }

  swing() { this.swingT = 0.26; }

  update(dt, thirdPerson) {
    this.group.visible = !thirdPerson;
    if (thirdPerson) return;
    if (this.swingT > 0) {
      this.swingT = Math.max(0, this.swingT - dt);
      const s = Math.sin((1 - this.swingT / 0.26) * Math.PI);
      this.hold.rotation.x = -s * 1.35;
      this.hold.rotation.z = -s * 0.35;
      this.group.position.z = -0.72 + s * 0.14;
    } else {
      const b = Math.sin(performance.now() / 520) * 0.012;
      this.hold.rotation.x = b;
      this.hold.rotation.z = 0;
      this.group.position.z = -0.72;
    }
  }
}
