// Entrada unificada para PC (teclado + ratón + pointer lock) y móvil (joystick + botones).
// Expone .state {forward,right,jump,sprint,crouch} y callbacks de acción.

export class Controls {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.state = { forward: 0, right: 0, jump: false, sprint: false, crouch: false };
    this.onBreak = opts.onBreak || (() => {});
    this.onPlace = opts.onPlace || (() => {});
    this.onPower = opts.onPower || (() => {});
    this.onLook = opts.onLook || (() => {});
    this.onHotbar = opts.onHotbar || (() => {});
    // ajustes vivos (objeto de state.ajustes). Se puede reasignar en caliente.
    this.ajustes = opts.ajustes || { invJoyX: false, invJoyY: false, invCamY: false, sensCam: 1, stickIzquierda: true };
    this.enabled = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    this._keys = new Set();
    this._bindKeyboard();
    this._bindMouse();
    if (this.isTouch) this._bindTouch();
  }

  enable() { this.enabled = true; }
  disable() {
    this.enabled = false;
    this.state.forward = this.state.right = 0;
    this.state.jump = this.state.sprint = this.state.crouch = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get pointerLocked() { return document.pointerLockElement === this.canvas; }

  _bindKeyboard() {
    const upd = () => {
      const k = this._keys;
      this.state.forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      this.state.right = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      this.state.jump = k.has('Space');
      this.state.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
      this.state.crouch = k.has('ControlLeft') || k.has('KeyC');
    };
    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this._keys.add(e.code);
      if (e.code === 'KeyE') this.onPower();
      if (e.code === 'KeyF') this.onPower();
      if (/^Digit[1-8]$/.test(e.code)) this.onHotbar(+e.code.slice(5) - 1);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      upd();
    });
    addEventListener('keyup', (e) => { this._keys.delete(e.code); upd(); });
    addEventListener('blur', () => { this._keys.clear(); upd(); });
  }

  _bindMouse() {
    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.isTouch && !this.pointerLocked) this.canvas.requestPointerLock();
    });
    addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.pointerLocked) return;
      const s = 0.0025 * (this.ajustes.sensCam || 1);
      this.onLook(e.movementX * s, e.movementY * s * (this.ajustes.invCamY ? -1 : 1));
    });
    addEventListener('mousedown', (e) => {
      if (!this.enabled || !this.pointerLocked) return;
      if (e.button === 0) this.onBreak();
      if (e.button === 2) this.onPlace();
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  applyStickSide() {
    const wrap = document.getElementById('touch');
    if (wrap) wrap.classList.toggle('stick-right', !this.ajustes.stickIzquierda);
  }

  _bindTouch() {
    const wrap = document.getElementById('touch');
    wrap.classList.add('on');
    this.applyStickSide();
    const stick = wrap.querySelector('.stick');
    const nub = wrap.querySelector('.nub');

    // El joystick es "dinámico": aparece donde pones el dedo dentro de su zona.
    let stickId = null, ox = 0, oy = 0;
    const R = 52;

    const startStick = (e) => {
      if (!this.enabled || stickId !== null) return;
      const t = e.changedTouches[0];
      stickId = t.identifier;
      ox = t.clientX; oy = t.clientY;             // origen = donde tocaste
      nub.style.transform = 'translate(-50%,-50%)';
      e.preventDefault();
    };
    stick.addEventListener('touchstart', startStick, { passive: false });

    const moveStick = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        let dx = t.clientX - ox, dy = t.clientY - oy;
        const d = Math.hypot(dx, dy) || 1;
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        const rx = dx / R, ry = dy / R;
        this.state.right = (this.ajustes.invJoyX ? -rx : rx);
        this.state.forward = (this.ajustes.invJoyY ? ry : -ry);
        e.preventDefault();
      }
    };
    const endStick = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        stickId = null;
        nub.style.transform = 'translate(-50%,-50%)';
        this.state.forward = this.state.right = 0;
      }
    };
    addEventListener('touchmove', moveStick, { passive: false });
    addEventListener('touchend', endStick);
    addEventListener('touchcancel', endStick);

    // Mirar: arrastrar en cualquier parte que NO sea la zona del joystick ni los botones
    let lookId = null, lx = 0, ly = 0;
    const enZonaStick = (x) => {
      const izq = this.ajustes.stickIzquierda;
      return izq ? x < innerWidth * 0.4 : x > innerWidth * 0.6;
    };
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (enZonaStick(t.clientX)) continue;
        if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        const s = 0.005 * (this.ajustes.sensCam || 1);
        this.onLook((t.clientX - lx) * s, (t.clientY - ly) * s * (this.ajustes.invCamY ? -1 : 1));
        lx = t.clientX; ly = t.clientY;
      }
    }, { passive: false });
    const endLook = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    this.canvas.addEventListener('touchend', endLook);
    this.canvas.addEventListener('touchcancel', endLook);

    // Botones de acción
    const hold = (sel, on, off) => {
      const el = wrap.querySelector(sel);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { on(); e.preventDefault(); }, { passive: false });
      el.addEventListener('touchend', (e) => { off && off(); e.preventDefault(); }, { passive: false });
    };
    hold('.t-jump', () => { this.state.jump = true; }, () => { this.state.jump = false; });
    hold('.t-break', () => this.onBreak());
    hold('.t-place', () => this.onPlace());
    hold('.t-power', () => this.onPower());
  }
}
