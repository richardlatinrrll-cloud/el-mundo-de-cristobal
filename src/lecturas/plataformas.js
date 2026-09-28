// Minijuego de plataformas 2D para "Mis lecturas".
// Un nivel = una ronda de preguntas. El camino está cortado por PUERTAS DE
// HIEDRA (una por pregunta, de muro a cielo: no se pueden saltar). Al tocar
// una puerta aparece su pregunta y NO se abre hasta responderla bien (si se
// equivoca: pista del capítulo, espera y la misma pregunta con las opciones
// barajadas). Caerse a un hoyo o tocar un caracol = volver a la última puerta
// abierta (solo se pierde tiempo). Todo se dibuja con canvas, sin imágenes.
import { audio } from '../game/audio.js';
import { barajarPregunta } from './libros.js';

const H = 12;            // alto del nivel en casillas
const SUELO = 10;        // fila donde empieza el suelo (filas 10 y 11 sólidas)
const VACIO = 0, TIERRA = 1, LADRILLO = 2, SORPRESA = 3, USADO = 4, PUERTA = 5;
const G = 40, SALTO = 16.5, VEL = 7, ACEL = 45;
const ESPERA_REINTENTO = 3;   // segundos de pausa tras equivocarse
const ARENA = 20;             // ancho de la arena del jefe (casillas)
const JEFE_VIDA = 8;          // golpes para derrotar al jefe (a la mitad se enfurece)
const TIEMPO_NORMAL = 15;     // segundos para responder cada ataque (fase 1)
const TIEMPO_FURIA = 10;      // … y ya enfurecido (fase 2)
const CORAZONES = 3;          // golpes que aguanta el niño antes de repetir la pelea

const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));

// ---------- generación del nivel ----------
function generarNivel(n) {
  const cols = [];            // cada columna: Uint8Array(H)
  const monedas = [], caracoles = [], puertas = [];
  const col = (x) => (cols[x] ||= new Uint8Array(H));
  const suelo = (x) => { col(x)[SUELO] = TIERRA; col(x)[SUELO + 1] = TIERRA; };

  let x = 0;
  for (; x < 10; x++) suelo(x);
  for (let i = 0; i < n; i++) {
    const largo = irnd(20, 26);
    const puertaX = x + largo;
    for (let k = x; k <= puertaX + 2; k++) suelo(k);
    let c = x + 2;
    while (c < puertaX - 5) {
      const t = Math.random();
      if (t < 0.22) {                                     // hoyo
        const w = 2 + (i > 6 && Math.random() < 0.4 ? 1 : 0);
        if (c + w >= puertaX - 4) break;
        for (let k = c; k < c + w; k++) { col(k)[SUELO] = VACIO; col(k)[SUELO + 1] = VACIO; }
        for (let k = 0; k <= w; k++) monedas.push({ x: c + k, y: SUELO - 2.6 - Math.sin((k / w) * Math.PI) * 1.2 });
        c += w + 3;                                        // siempre 3+ casillas de piso para aterrizar
      } else if (t < 0.44) {                              // plataforma flotante
        const w = irnd(3, 5);
        if (c + w >= puertaX - 4) break;
        const y = SUELO - 3;
        for (let k = c; k < c + w; k++) { col(k)[y] = LADRILLO; monedas.push({ x: k + 0.5, y: y - 0.7 }); }
        if (w >= 4) col(c + 1)[y] = SORPRESA;
        c += w + 2;
      } else if (t < 0.6) {                               // bloques sorpresa
        col(c)[SUELO - 4] = SORPRESA;
        if (Math.random() < 0.5) col(c + 2)[SUELO - 4] = SORPRESA;
        c += 4;
      } else if (t < 0.74) {                              // escalera de ladrillos
        const alto = irnd(1, 3);
        for (let s = 0; s < alto; s++) for (let h = 0; h <= s; h++) col(c + s)[SUELO - 1 - h] = LADRILLO;
        c += alto + 3;
      } else if (t < 0.9) {                               // caracol
        caracoles.push({ x: c + 1, y: SUELO - 0.7, w: 0.9, h: 0.7, dir: -1, vivo: true, aplastado: 0 });
        c += 4;
      } else {
        c += irnd(2, 3);                                   // tramo plano
      }
    }
    for (let y = 0; y < SUELO; y++) col(puertaX)[y] = PUERTA;
    puertas.push({ x: puertaX, i, abierta: false, abriendo: 0 });
    x = puertaX + 1;
  }
  // arena del jefe final: piso plano, cerrada a la derecha por el borde del nivel
  const arenaX = x;
  for (let k = x; k < x + ARENA; k++) suelo(k);
  const W = x + ARENA;
  return { cols, W, monedas, caracoles, puertas, arenaX, rosas: [] };
}

// ---------- API ----------
// preguntas: las de esta ronda (en orden). registrar(resultados) → resumen.
// Devuelve una promesa: { accion: 'otra' | 'volver' | 'salio' }
export function jugarLectura({ libro, preguntas, registrar }) {
  return new Promise((resolve) => {
    const nivel = generarNivel(preguntas.length);
    const { cols, W } = nivel;
    const get = (x, y) => {
      if (x < 0 || x >= W) return LADRILLO;
      if (y < 0 || y >= H) return VACIO;
      const c = cols[x];
      return c ? c[y] : VACIO;
    };
    const solido = (t) => t !== VACIO;

    const resultados = preguntas.map((q) => ({ q, primeraOk: true }));
    const jug = { x: 2, y: SUELO - 1.3, w: 0.7, h: 1.3, vx: 0, vy: 0, suelo: false, dir: 1, paso: 0, inv: 0 };
    let control = { x: 2, y: SUELO - 1.3 };
    let camX = 0, t0 = performance.now(), caidas = 0, monedas = 0;
    let pausa = false, terminado = false, raf = 0;
    const particulas = [];
    // jefe final (se puede nombrar por libro con "jefe": { "nombre": ... } en el .json)
    const jefe = {
      nombre: libro.jefe?.nombre || 'Guardián de la Hiedra',
      x: nivel.arenaX + 12, y: SUELO - 4, w: 3, h: 4,
      vida: JEFE_VIDA, estado: 'oculto', flash: 0, carga: 0, muerte: 0, entra: 0,
    };
    let fase = 'camino';          // 'camino' → 'jefe' → 'fin'
    let corazones = CORAZONES, golpes = 0, derrotas = 0, congelado = false, sacudir = 0;
    const timers = [];            // esperas en tiempo de juego (se congelan con el menú de salir)
    const vuelos = [];            // proyectiles animados { x0,y0,x1,y1,t,dur,tipo,res }
    const raices = [];            // raíces que brotan del suelo { x, t, alto }
    const semillas = [];          // semillas rodantes que hay que saltar { x, y, vx, pego }
    let esquive = null;           // animación de salto para esquivar { t, dur }
    const esperar = (s) => new Promise((res) => timers.push({ t: s, res }));
    const volar = (v) => new Promise((res) => vuelos.push({ t: 0, ...v, res }));
    window.__lectura = { jug, nivel, keys: null, jefe, semillas, forzar: (a) => { forzado = a; } };   // para depurar desde la consola

    // ----- DOM -----
    const root = document.createElement('div');
    root.className = 'lectura-juego';
    root.innerHTML = `
      <canvas></canvas>
      <div class="lj-hud">
        <button class="lj-salir" data-salir>✕ Salir</button>
        <div class="lj-info">
          <div class="lj-titulo">${libro.emoji || '📖'} ${escapeHtml(libro.titulo)}</div>
          <div class="lj-barra"><i></i></div>
        </div>
        <div class="lj-cont"><span data-puerta></span> · 🪙 <span data-monedas>0</span></div>
      </div>
      <div class="lj-jefe" hidden>
        <div class="lj-jefe-nom">🌿 <span data-jnom></span></div>
        <div class="lj-jefe-vida"><i></i></div>
        <div class="lj-corazones" data-cor></div>
      </div>
      <div class="lj-touch">
        <div class="lj-pad"><button data-k="izq">◀</button><button data-k="der">▶</button></div>
        <button class="lj-saltar" data-k="saltar">⤒</button>
      </div>
      <div class="lj-rotar">📱↻<br>Gira el teléfono</div>`;
    document.getElementById('app').appendChild(root);
    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const elPuerta = root.querySelector('[data-puerta]');
    const elMonedas = root.querySelector('[data-monedas]');
    const elBarra = root.querySelector('.lj-barra > i');

    // ----- controles -----
    const keys = { izq: false, der: false, saltar: false };
    let saltoPedido = false;
    window.__lectura.keys = keys;
    const MAPA = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', Space: 'saltar', ArrowUp: 'saltar', KeyW: 'saltar' };
    const onKey = (e) => {
      const k = MAPA[e.code];
      if (!k || pausa) return;
      e.preventDefault();
      const on = e.type === 'keydown';
      if (k === 'saltar' && on && !keys.saltar) saltoPedido = true;
      keys[k] = on;
    };
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKey);
    for (const b of root.querySelectorAll('[data-k]')) {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); if (k === 'saltar' && !keys.saltar) saltoPedido = true; keys[k] = true; b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    }
    const soltarTodo = () => { keys.izq = keys.der = keys.saltar = false; root.querySelectorAll('[data-k].on').forEach((b) => b.classList.remove('on')); };

    root.querySelector('[data-salir]').addEventListener('click', () => confirmarSalida());

    // ----- tamaño -----
    let esc = 32, offY = 0;
    function ajustar() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(innerWidth * dpr);
      cv.height = Math.round(innerHeight * dpr);
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      esc = Math.min(cv.height / H, cv.width / 16);
      offY = cv.height - H * esc;
    }
    ajustar();
    addEventListener('resize', ajustar);

    // ----- física -----
    function chocaCaja(x, y, w, h) {
      for (let cx = Math.floor(x); cx <= Math.floor(x + w - 1e-4); cx++)
        for (let cy = Math.floor(y); cy <= Math.floor(y + h - 1e-4); cy++)
          if (solido(get(cx, cy))) return { cx, cy };
      return null;
    }
    function moverJugador(dt) {
      const quiere = (keys.der ? 1 : 0) - (keys.izq ? 1 : 0);
      if (quiere) { jug.vx += quiere * ACEL * dt; jug.dir = quiere; }
      else jug.vx -= Math.sign(jug.vx) * Math.min(Math.abs(jug.vx), ACEL * dt);
      jug.vx = Math.max(-VEL, Math.min(VEL, jug.vx));
      if (saltoPedido && jug.suelo) { jug.vy = -SALTO; jug.suelo = false; audio.sfx('saltar'); }
      saltoPedido = false;
      if (!keys.saltar && jug.vy < -6) jug.vy = -6;           // salto corto si suelta
      jug.vy = Math.min(jug.vy + G * dt, 22);

      // eje X
      jug.x += jug.vx * dt;
      let h = chocaCaja(jug.x, jug.y, jug.w, jug.h);
      if (h) {
        if (jug.vx > 0) jug.x = h.cx - jug.w - 1e-3; else if (jug.vx < 0) jug.x = h.cx + 1 + 1e-3;
        jug.vx = 0;
      }
      // eje Y
      jug.y += jug.vy * dt;
      jug.suelo = false;
      h = chocaCaja(jug.x, jug.y, jug.w, jug.h);
      if (h) {
        if (jug.vy > 0) { jug.y = h.cy - jug.h - 1e-3; jug.suelo = true; }
        else if (jug.vy < 0) {
          jug.y = h.cy + 1 + 1e-3;
          golpeCabeza(Math.floor(jug.x + jug.w / 2), h.cy);
        }
        jug.vy = 0;
      }
      if (jug.suelo && Math.abs(jug.vx) > 0.5) jug.paso += dt * Math.abs(jug.vx) * 2.2;
      if (jug.y > H + 2) { caidas++; audio.sfx('dano'); reaparecer(); }
    }
    function golpeCabeza(cx, cy) {
      const t = get(cx, cy) === SORPRESA ? [cx, cy] : get(cx - 1, cy) === SORPRESA ? [cx - 1, cy] : get(cx + 1, cy) === SORPRESA ? [cx + 1, cy] : null;
      if (!t) return;
      cols[t[0]][t[1]] = USADO;
      monedas++;
      elMonedas.textContent = monedas;
      audio.sfx('acierto');
      particulas.push({ x: t[0] + 0.5, y: t[1] - 0.5, vx: 0, vy: -9, vida: 0.6, tipo: 'moneda' });
    }
    function reaparecer() {
      jug.x = control.x; jug.y = control.y; jug.vx = 0; jug.vy = 0; jug.inv = 1.5;
      for (const c of nivel.caracoles) if (c.vivo && Math.abs(c.x - jug.x) < 4) c.x = jug.x + 5;
    }

    function moverCaracoles(dt) {
      for (const c of nivel.caracoles) {
        if (!c.vivo) { c.aplastado -= dt; continue; }
        if (Math.abs(c.x - jug.x) > 22) continue;          // quietos hasta que te acercas
        const nx = c.x + c.dir * 1.6 * dt;
        const frente = c.dir > 0 ? Math.floor(nx + c.w) : Math.floor(nx);
        const pared = solido(get(frente, Math.floor(c.y + 0.3)));
        const piso = solido(get(frente, SUELO)) || solido(get(frente, Math.floor(c.y + c.h + 0.1)));
        if (pared || !piso) c.dir *= -1; else c.x = nx;
        // contacto con el jugador
        if (jug.x < c.x + c.w && jug.x + jug.w > c.x && jug.y < c.y + c.h && jug.y + jug.h > c.y) {
          if (jug.vy > 2 && jug.y + jug.h - c.y < 0.55) {
            c.vivo = false; c.aplastado = 0.5; jug.vy = -11; audio.sfx('golpe');
          } else if (jug.inv <= 0) {
            caidas++; audio.sfx('dano'); reaparecer();
          }
        }
      }
    }

    function recogerMonedas() {
      for (const m of nivel.monedas) {
        if (m.tomada) continue;
        if (Math.abs(m.x - (jug.x + jug.w / 2)) < 0.6 && Math.abs(m.y - (jug.y + jug.h / 2)) < 0.9) {
          m.tomada = true; monedas++; elMonedas.textContent = monedas; audio.sfx('poner');
        }
      }
    }

    // ----- puertas / preguntas -----
    const siguientePuerta = () => nivel.puertas.find((p) => !p.abierta);
    function actualizarHud() {
      const abiertas = nivel.puertas.filter((p) => p.abierta).length;
      elPuerta.textContent = `🚪 ${Math.min(abiertas + 1, preguntas.length)}/${preguntas.length}`;
      elBarra.style.width = `${(abiertas / preguntas.length) * 100}%`;
    }
    actualizarHud();

    function revisarPuerta() {
      const p = siguientePuerta();
      if (!p || pausa) return;
      if (jug.x + jug.w >= p.x - 0.05 && jug.x < p.x + 1) preguntar(p);
    }

    function preguntar(puerta) {
      pausa = true;
      soltarTodo();
      jug.vx = 0;
      const base = preguntas[puerta.i];
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap lj-modal';
      root.appendChild(wrap);
      let intentos = 0;
      mostrar();

      function mostrar() {
        const q = barajarPregunta(base);
        wrap.innerHTML = `
          <div class="modal">
            <div class="q-head">
              <span>${libro.emoji || '📖'} Puerta ${puerta.i + 1} de ${preguntas.length}</span>
              <span>${intentos ? `intento ${intentos + 1}` : ''}</span>
            </div>
            <div class="q-text">${escapeHtml(q.p)}</div>
            <div class="options"></div>
            <div class="feedback"></div>
          </div>`;
        const box = wrap.querySelector('.options');
        const fb = wrap.querySelector('.feedback');
        q.opciones.forEach((op, idx) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.textContent = op;
          b.addEventListener('click', () => responder(idx));
          box.appendChild(b);
        });
        function responder(idx) {
          [...box.children].forEach((b) => (b.disabled = true));
          if (idx === q.correcta) {
            box.children[idx].classList.add('correct');
            fb.className = 'feedback ok';
            fb.textContent = intentos ? '✅ ¡Ahora sí! Se abre la puerta… (esta volverá en otra ronda)' : '✅ ¡Correcto! Se abre la puerta…';
            audio.sfx('acierto');
            setTimeout(() => { wrap.remove(); abrirPuerta(puerta); }, 1100);
          } else {
            // no se muestra cuál era: hay que pensarla de nuevo
            box.children[idx].classList.add('wrong');
            intentos++;
            resultados[puerta.i].primeraOk = false;
            audio.sfx('fallo');
            fb.className = 'feedback bad';
            let s = ESPERA_REINTENTO;
            const pista = base.cap ? ` Pista: está en el capítulo ${base.cap}.` : '';
            const tick = () => {
              fb.textContent = `❌ No es esa.${pista} Piénsala otra vez… ${s}`;
              if (s-- <= 0) { mostrar(); return; }
              setTimeout(tick, 1000);
            };
            tick();
          }
        }
      }
    }

    function abrirPuerta(p) {
      p.abierta = true;
      p.abriendo = 1;
      for (let y = 0; y < SUELO; y++) cols[p.x][y] = VACIO;
      for (let k = 0; k < 26; k++) {
        particulas.push({ x: p.x + 0.5, y: rnd(1, SUELO), vx: rnd(-3, 3), vy: rnd(-5, 1), vida: rnd(0.6, 1.2), tipo: 'hoja' });
      }
      nivel.rosas.push({ x: p.x + 1.4, t: 0 });
      control = { x: p.x + 0.4, y: SUELO - jug.h - 0.01 };
      audio.sfx('nivel');
      actualizarHud();
      pausa = false;
    }

    // ----- jefe final -----
    // Cola de preguntas del jefe: primero las que falló en las puertas de este
    // nivel, después el resto, barajado. Se rellena si se acaba.
    function colaJefe() {
      const mezcla = (a) => a.sort(() => Math.random() - 0.5);
      return [...mezcla(resultados.filter((r) => !r.primeraOk)), ...mezcla(resultados.filter((r) => r.primeraOk))].map((r) => r.q);
    }
    const elJefe = root.querySelector('.lj-jefe');
    function hudJefe() {
      elJefe.hidden = fase !== 'jefe';
      root.querySelector('[data-jnom]').textContent = jefe.nombre;
      root.querySelector('.lj-jefe-vida > i').style.width = `${(jefe.vida / JEFE_VIDA) * 100}%`;
      root.querySelector('[data-cor]').textContent = '❤️'.repeat(corazones) + '🖤'.repeat(CORAZONES - corazones);
    }

    // --- helpers de la pelea ---
    function flotar(o) { const v = { t: 0, dur: 1e9, res: () => {}, ...o, x1: o.x0, y1: o.y0 }; vuelos.push(v); return v; }
    function quitar(v) { const i = vuelos.indexOf(v); if (i >= 0) vuelos.splice(i, 1); }
    async function cargar(s) { jefe.estado = 'carga'; jefe.carga = 0; await esperar(s); jefe.estado = 'quieto'; }
    function golpear(n) {
      corazones = Math.max(0, corazones - n); golpes++; jug.inv = 1.1; audio.sfx('dano');
      sacudir = 0.35 + 0.2 * n; hudJefe();
    }
    async function contraataque(n = 1) {
      for (let k = 0; k < n && jefe.vida > 0; k++) {
        await volar({ tipo: 'rosa', x0: jug.x + 0.6, y0: jug.y + 0.4, x1: jefe.x + 1.2, y1: jefe.y + 1.6, dur: 0.45 });
        jefe.vida = Math.max(0, jefe.vida - 1); jefe.flash = 0.5; audio.sfx('golpe');
        for (let i = 0; i < 14; i++) particulas.push({ x: jefe.x + 1.2, y: jefe.y + 1.6, vx: rnd(-4, 4), vy: rnd(-7, -1), vida: rnd(0.4, 0.9), tipo: 'hoja' });
        hudJefe();
      }
      await esperar(0.5);
    }
    function anunciar(texto, s = 1.6) {
      const d = document.createElement('div');
      d.className = 'lj-anuncio';
      d.textContent = texto;
      root.appendChild(d);
      setTimeout(() => d.remove(), s * 1000);
    }

    let cola = [];
    async function preguntar(titulo) {
      if (!cola.length) cola = colaJefe();
      const q = cola.shift();
      const ok = await preguntaJefe(q, { titulo, tiempo: jefe.furia ? TIEMPO_FURIA : TIEMPO_NORMAL });
      if (!ok) cola.push(q);                                   // vuelve más adelante en la pelea
      return ok;
    }

    // --- los ataques ---
    const ATAQUES = {
      async bola() {
        await cargar(jefe.furia ? 0.5 : 0.8);
        const mx = (jug.x + jefe.x) / 2 + 1, my = SUELO - 3;
        await volar({ tipo: 'espina', x0: jefe.x - 0.2, y0: jefe.y + 1.4, x1: mx, y1: my, dur: 0.5 });
        const b = flotar({ tipo: 'espina', x0: mx, y0: my });
        const ok = await preguntar('🌰 ¡Bola de espinas!');
        quitar(b);
        if (ok) {
          esquive = { t: 0, dur: 0.7 }; audio.sfx('saltar');
          await volar({ tipo: 'espina', x0: mx, y0: my, x1: jug.x - 6, y1: SUELO - 0.6, dur: 0.6 });
          await contraataque(1);
        } else {
          await volar({ tipo: 'espina', x0: mx, y0: my, x1: jug.x + 0.35, y1: jug.y + 0.6, dur: 0.3 });
          golpear(1); await esperar(0.8);
        }
      },
      async lluvia() {
        await cargar(0.9);
        const gotas = [-0.9, 0.3, 1.5].map((dx, i) => flotar({ tipo: 'espina', x0: jug.x + dx, y0: 1.2 + (i % 2) * 0.6 }));
        const ok = await preguntar('🌧️ ¡Lluvia de espinas!');
        gotas.forEach(quitar);
        if (ok) {
          esquive = { t: 0, dur: 0.7 }; audio.sfx('saltar');
          await Promise.all(gotas.map((g, i) => volar({ tipo: 'espina', x0: g.x0, y0: g.y0, x1: g.x0 + (i - 1) * 3, y1: SUELO + 1, dur: 0.6 })));
          await contraataque(1);
        } else {
          await Promise.all(gotas.map((g) => volar({ tipo: 'espina', x0: g.x0, y0: g.y0, x1: jug.x + 0.35, y1: jug.y + 0.5, dur: 0.35 })));
          golpear(1); await esperar(0.8);
        }
      },
      async raices() {
        await cargar(0.8);
        sacudir = 0.6; audio.sfx('jefe');
        let buenas = 0;
        for (let k = 1; k <= 2; k++) {
          const r = { x: jug.x + 0.35, t: 0, alto: 0.25 };        // brote que avisa
          raices.push(r);
          const ok = await preguntar(`🌱 ¡Raíces del suelo! (${k}/2)`);
          if (ok) { buenas++; esquive = { t: 0, dur: 0.7 }; audio.sfx('saltar'); r.alto = 2.2; r.t = 0; await esperar(0.8); }
          else { r.alto = 2.2; r.t = 0; await esperar(0.2); golpear(1); await esperar(0.7); }
          raices.splice(raices.indexOf(r), 1);
          if (corazones <= 0) return;
        }
        if (buenas === 2) { anunciar('💥 ¡Doble contraataque!'); await contraataque(2); }
        else if (buenas === 1) await contraataque(1);
      },
      async ola() {
        await cargar(1.1);
        const mx = (jug.x + jefe.x) / 2 + 0.5;
        await volar({ tipo: 'ola', x0: jefe.x - 0.5, y0: SUELO, x1: mx, y1: SUELO, dur: 0.6 });
        const o = flotar({ tipo: 'ola', x0: mx, y0: SUELO });
        const ok = await preguntar('🌊 ¡Ola de hiedra! Si fallas pierdes 2 ❤️');
        quitar(o);
        if (ok) {
          esquive = { t: 0, dur: 0.9, alto: 3.6 }; audio.sfx('saltar');
          await volar({ tipo: 'ola', x0: mx, y0: SUELO, x1: nivel.arenaX - 4, y1: SUELO, dur: 0.8 });
          await contraataque(1);
        } else {
          await volar({ tipo: 'ola', x0: mx, y0: SUELO, x1: jug.x, y1: SUELO, dur: 0.3 });
          golpear(2); await esperar(0.9);
        }
      },
      async curar() {
        jefe.curo = true; jefe.curando = true;
        anunciar('💚 ¡Se está curando!');
        await esperar(0.8);
        const ok = await preguntar('💚 ¡Se cura! Acierta para impedirlo');
        jefe.curando = false;
        if (ok) { anunciar('✋ ¡Lo interrumpiste!'); await contraataque(1); }
        else {
          jefe.vida = Math.min(JEFE_VIDA, jefe.vida + 2); audio.sfx('nivel');
          for (let i = 0; i < 20; i++) particulas.push({ x: jefe.x + 1.5, y: jefe.y + 2, vx: rnd(-2, 2), vy: rnd(-6, -2), vida: rnd(0.5, 1), tipo: 'cura' });
          hudJefe(); await esperar(1);
        }
      },
      // sin pregunta: hay que saltar de verdad con los controles
      async semillas() {
        anunciar('🏃 ¡Salta las semillas! (⤒ / espacio)', 2.2);
        await cargar(0.9);
        pausa = false;
        const n = jefe.furia ? 5 : 3;
        for (let k = 0; k < n; k++) {
          semillas.push({ x: jefe.x - 0.3, y: SUELO - 0.45, vx: -(jefe.furia ? 8 : 6.5), pego: false });
          audio.sfx('poner');
          await esperar(rnd(0.9, 1.5));
        }
        while (semillas.length) await esperar(0.1);
        while (!jug.suelo) await esperar(0.05);
        pausa = true; soltarTodo(); jug.vx = 0;
        await esperar(0.4);
      },
    };

    let forzado = null;           // prueba: window.__lectura.forzar('semillas')
    function elegirAtaque(prev) {
      if (forzado) return forzado;
      if (!prev) return 'bola';                                  // el primero, para entender la mecánica
      if (jefe.furia && !jefe.curo && jefe.vida <= 3 && Math.random() < 0.5) return 'curar';
      const lista = jefe.furia ? ['bola', 'lluvia', 'raices', 'ola', 'ola', 'semillas'] : ['bola', 'bola', 'lluvia', 'raices', 'semillas'];
      let a;
      do a = lista[irnd(0, lista.length - 1)]; while (a === prev && (a === 'semillas' || a === 'ola'));
      return a;
    }

    async function peleaJefe() {
      fase = 'jefe';
      pausa = true;
      soltarTodo();
      jug.vx = 0; jug.vy = 0; jug.dir = 1;
      jug.x = nivel.arenaX + 4; jug.y = SUELO - jug.h - 0.01;
      jefe.estado = 'entra';
      audio.sfx('jefe');
      hudJefe();
      await esperar(1.2);
      jefe.estado = 'quieto';
      cola = colaJefe();
      let prev = null;
      while (jefe.vida > 0) {
        if (corazones <= 0) {                                  // lo derrotó: se repite la pelea
          derrotas++;
          await avisoDerrota();
          corazones = CORAZONES; jefe.vida = JEFE_VIDA; jefe.furia = false; jefe.curo = false;
          cola = colaJefe(); prev = null; hudJefe();
          await esperar(0.6);
        }
        if (!jefe.furia && jefe.vida <= JEFE_VIDA / 2) {       // fase 2
          jefe.furia = true; sacudir = 0.9; audio.sfx('jefe');
          anunciar(`😡 ¡El ${jefe.nombre} se enfureció!`, 2);
          await esperar(1.6);
        }
        prev = elegirAtaque(prev);
        await ATAQUES[prev]();
      }
      // ¡derrotado!
      jefe.estado = 'muere'; jefe.muerte = 0;
      audio.sfx('medalla');
      for (let k = 0; k < 40; k++) particulas.push({ x: jefe.x + 1.5, y: jefe.y + 2, vx: rnd(-6, 6), vy: rnd(-9, -2), vida: rnd(0.6, 1.4), tipo: 'petalo' });
      await esperar(1.6);
      fase = 'fin';
      hudJefe();
      await esperar(0.9);
      terminar();
    }

    // una sola oportunidad por ataque, con reloj: si se acaba el tiempo, cuenta como error
    function preguntaJefe(base, { titulo, tiempo }) {
      return new Promise((res) => {
        const q = barajarPregunta(base);
        const wrap = document.createElement('div');
        wrap.className = 'modal-wrap lj-modal lj-modal-jefe';
        wrap.innerHTML = `
          <div class="modal">
            <div class="q-head"><span>${titulo}</span><span>${'❤️'.repeat(corazones)} · ⏱️ <b data-seg>${tiempo}</b></span></div>
            <div class="lj-reloj"><i></i></div>
            <div class="q-text">${escapeHtml(q.p)}</div>
            <div class="options"></div>
            <div class="feedback"></div>
          </div>`;
        root.appendChild(wrap);
        const box = wrap.querySelector('.options');
        const fb = wrap.querySelector('.feedback');
        const barra = wrap.querySelector('.lj-reloj > i');
        const seg = wrap.querySelector('[data-seg]');
        let restante = tiempo, listo = false;
        const iv = setInterval(() => {
          if (listo || congelado) return;
          restante -= 0.1;
          barra.style.width = `${Math.max(0, restante / tiempo) * 100}%`;
          seg.textContent = Math.max(0, Math.ceil(restante));
          if (restante <= 3) barra.classList.add('poco');
          if (restante <= 0) responder(-1);
        }, 100);
        function responder(idx) {
          if (listo) return;
          listo = true;
          clearInterval(iv);
          [...box.children].forEach((x) => (x.disabled = true));
          const ok = idx === q.correcta;
          if (idx >= 0) box.children[idx].classList.add(ok ? 'correct' : 'wrong');
          if (ok) { fb.className = 'feedback ok'; fb.textContent = '✅ ¡Correcto! ¡Esquívalo y contraataca!'; audio.sfx('acierto'); }
          else {
            // si la falla ante el jefe, esa pregunta tampoco cuenta como dominada
            const r = resultados.find((x) => x.q === base);
            if (r) r.primeraOk = false;
            fb.className = 'feedback bad';
            fb.textContent = `${idx < 0 ? '⏰ ¡Se acabó el tiempo!' : '❌ ¡Te va a dar!'}${base.cap ? ` Pista: capítulo ${base.cap}.` : ''} Esta pregunta volverá.`;
            audio.sfx('fallo');
          }
          setTimeout(() => { wrap.remove(); res(ok); }, ok ? 800 : 1800);
        }
        q.opciones.forEach((op, idx) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.textContent = op;
          b.addEventListener('click', () => responder(idx));
          box.appendChild(b);
        });
      });
    }

    function avisoDerrota() {
      return new Promise((res) => {
        const w = document.createElement('div');
        w.className = 'modal-wrap lj-modal';
        w.innerHTML = `<div class="modal lj-fin">
            <div class="medal">💥</div>
            <div class="result-big">¡El ${escapeHtml(jefe.nombre)} te ganó!</div>
            <p class="hint">Recuperas tus corazones, pero él también. ¡Otra vez! Las preguntas que fallaste vuelven primero.</p>
            <div class="row" style="margin-top:14px; justify-content:center"><button class="btn small" data-ok>⚔️ Pelear de nuevo</button></div>
          </div>`;
        root.appendChild(w);
        w.querySelector('[data-ok]').addEventListener('click', () => { w.remove(); res(); });
      });
    }

    // ----- salir / terminar -----
    function confirmarSalida() {
      if (terminado) return;
      const estaba = pausa;
      pausa = true;
      congelado = true;
      soltarTodo();
      const w = document.createElement('div');
      w.className = 'modal-wrap lj-modal';
      w.innerHTML = `<div class="modal">
          <div class="q-text">¿Salir de la lectura?</div>
          <p class="hint">Si sales ahora <b>pierdes el avance de este nivel</b> y tendrás que empezarlo de nuevo.</p>
          <div class="row" style="margin-top:16px; gap:10px; justify-content:center; flex-wrap:wrap">
            <button class="btn small" data-seguir>Seguir jugando</button>
            <button class="btn small secondary" data-irse>Salir igual</button>
          </div></div>`;
      root.appendChild(w);
      w.querySelector('[data-seguir]').addEventListener('click', () => { w.remove(); pausa = estaba; congelado = false; });
      w.querySelector('[data-irse]').addEventListener('click', () => { w.remove(); cerrar({ accion: 'salio' }); });
    }

    function terminar() {
      terminado = true;
      pausa = true;
      soltarTodo();
      audio.sfx('medalla');
      const r = registrar(resultados);
      const ok = resultados.filter((x) => x.primeraOk).length;
      const seg = Math.round((performance.now() - t0) / 1000);
      const w = document.createElement('div');
      w.className = 'modal-wrap lj-modal';
      w.innerHTML = `<div class="modal lj-fin">
          <div class="medal subio">${r.completado ? '🏆' : '🌹'}</div>
          <div class="result-big">${r.completado ? `¡Dominaste «${escapeHtml(libro.titulo)}»!` : '¡Nivel terminado!'}</div>
          <p class="hint">Al primer intento: <b>${ok} de ${preguntas.length}</b>${ok < preguntas.length ? ' — las que fallaste vuelven en la próxima ronda.' : ' — ¡perfecto!'}</p>
          <div class="lj-prog"><i style="width:${(r.dominadas / r.total) * 100}%"></i></div>
          <p class="hint">Preguntas dominadas del libro: <b>${r.dominadas} / ${r.total}</b>${r.completado ? '' : ` · faltan ${r.total - r.dominadas}`}</p>
          <p class="hint">⚔️ Derrotaste al ${escapeHtml(jefe.nombre)}${golpes ? ` · te dio ${golpes} ${golpes === 1 ? 'vez' : 'veces'}` : ' sin que te tocara'}${derrotas ? ` · te ganó ${derrotas} ${derrotas === 1 ? 'vez' : 'veces'} antes` : ''}</p>
          <p class="hint">⏱️ ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} · 🪙 ${monedas} · caídas ${caidas}</p>
          <div class="row" style="margin-top:14px; gap:10px; justify-content:center; flex-wrap:wrap">
            ${r.completado ? '' : '<button class="btn small" data-otra>▶️ Siguiente nivel</button>'}
            <button class="btn small ${r.completado ? '' : 'secondary'}" data-volver>Volver</button>
          </div></div>`;
      root.appendChild(w);
      w.querySelector('[data-otra]')?.addEventListener('click', () => cerrar({ accion: 'otra' }));
      w.querySelector('[data-volver]').addEventListener('click', () => cerrar({ accion: 'volver' }));
    }

    function cerrar(res) {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      removeEventListener('resize', ajustar);
      root.remove();
      resolve(res);
    }

    // ----- bucle -----
    let ult = performance.now();
    function loop(now) {
      const dt = Math.min(1 / 30, (now - ult) / 1000);
      ult = now;
      paso(dt, now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    // gancho de prueba: avanzar n pasos de simulación sin depender de la pantalla
    window.__lectura.paso = (n = 1) => { for (let i = 0; i < n; i++) paso(1 / 30, performance.now()); };

    function paso(dt, now) {
      if (!pausa) {
        moverJugador(dt);
        moverCaracoles(dt);
        recogerMonedas();
        revisarPuerta();
        if (fase === 'camino' && !siguientePuerta() && jug.x > nivel.arenaX + 2) peleaJefe();
        if (fase === 'jefe') jug.x = Math.max(nivel.arenaX + 0.5, Math.min(jefe.x - 1, jug.x));   // no sale de la arena
      }
      if (!congelado && fase === 'jefe') {
        for (let i = semillas.length - 1; i >= 0; i--) {
          const sm = semillas[i];
          sm.x += sm.vx * dt;
          const toca = Math.abs(sm.x - (jug.x + jug.w / 2)) < 0.55 && jug.y + jug.h > sm.y - 0.35;
          if (toca && !sm.pego && jug.inv <= 0) { sm.pego = true; golpear(1); }
          if (sm.x < nivel.arenaX - 3) semillas.splice(i, 1);
        }
        for (const r of raices) r.t += dt;
      }
      if (jug.inv > 0) jug.inv -= dt;
      if (!congelado) {
        for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].res();
        for (let i = vuelos.length - 1; i >= 0; i--) {
          const v = vuelos[i];
          if ((v.t += dt) >= v.dur) { vuelos.splice(i, 1); v.res(); }
        }
        if (esquive && (esquive.t += dt) >= esquive.dur) esquive = null;
        if (jefe.flash > 0) jefe.flash -= dt;
        if (jefe.estado === 'carga') jefe.carga += dt;
        if (jefe.estado === 'entra') jefe.entra += dt;
        if (jefe.estado === 'muere') jefe.muerte += dt;
        if (sacudir > 0) sacudir -= dt;
      }
      for (const p of particulas) { p.vy += 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; }
      for (let i = particulas.length - 1; i >= 0; i--) if (particulas[i].vida <= 0) particulas.splice(i, 1);
      for (const r of nivel.rosas) r.t = Math.min(1, r.t + dt * 1.5);
      const vistaW = cv.width / esc;
      const objetivo = fase === 'camino'
        ? jug.x + jug.w / 2 - vistaW * 0.4
        : (nivel.arenaX + 4 + jefe.x + jefe.w) / 2 - vistaW / 2;   // en la pelea encuadra al niño y al jefe
      camX += (objetivo - camX) * Math.min(1, dt * 8);
      camX = Math.max(0, Math.min(W - vistaW, camX));
      dibujar(now / 1000);
    }

    // ---------- dibujo ----------
    function dibujar(t) {
      const cw = cv.width, ch = cv.height, s = esc;
      const X = (x) => (x - camX) * s, Y = (y) => offY + y * s;
      // cielo
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#6ec3ff'); g.addColorStop(1, '#d7f0ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      if (sacudir > 0) ctx.translate(rnd(-1, 1) * s * 0.18, rnd(-1, 1) * s * 0.18);   // golpe recibido
      // nubes
      ctx.fillStyle = '#ffffffd0';
      for (let i = 0; i < 8; i++) {
        const nx = ((i * 9.7 - camX * 0.2 + t * 0.3) % 70 + 70) % 70 - 6;
        const ny = 1 + (i * 37 % 4);
        nube(X(nx + camX), Y(ny), s);
      }
      // páramo (colinas lilas de brezo) y setos
      colinas(0.25, '#9b7bb8', 8.2, 1.6, 0.13);
      colinas(0.5, '#6aa76a', 9.1, 1.1, 0.21);

      const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(W, Math.ceil(camX + cw / s) + 1);
      for (let x = x0; x < x1; x++) {
        const c = cols[x];
        if (!c) continue;
        for (let y = 0; y < H; y++) {
          const tt = c[y];
          if (!tt) continue;
          const px = X(x), py = Y(y);
          if (tt === TIERRA) {
            ctx.fillStyle = '#8b5a2b'; ctx.fillRect(px, py, s + 1, s + 1);
            if (!solido(get(x, y - 1))) { ctx.fillStyle = '#4caf50'; ctx.fillRect(px, py, s + 1, s * 0.3); ctx.fillStyle = '#6fd66f'; ctx.fillRect(px, py, s + 1, s * 0.1); }
            else { ctx.fillStyle = '#7a4d24'; ctx.fillRect(px + s * 0.2, py + s * 0.5, s * 0.15, s * 0.12); }
          } else if (tt === LADRILLO) {
            ctx.fillStyle = '#b8743f'; ctx.fillRect(px, py, s, s);
            ctx.strokeStyle = '#6d3f1d'; ctx.lineWidth = Math.max(1, s * 0.05);
            ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
            ctx.beginPath(); ctx.moveTo(px, py + s / 2); ctx.lineTo(px + s, py + s / 2); ctx.moveTo(px + s / 2, py); ctx.lineTo(px + s / 2, py + s / 2); ctx.stroke();
          } else if (tt === SORPRESA || tt === USADO) {
            ctx.fillStyle = tt === SORPRESA ? '#f4b400' : '#9c8155'; ctx.fillRect(px, py, s, s);
            ctx.strokeStyle = '#7a5200'; ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
            if (tt === SORPRESA) { ctx.fillStyle = '#fff'; ctx.font = `bold ${s * 0.7}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', px + s / 2, py + s / 2 + s * 0.04); }
          } else if (tt === PUERTA) {
            ctx.fillStyle = '#2f6b35'; ctx.fillRect(px - s * 0.15, py, s * 1.3, s + 1);
            ctx.fillStyle = '#3f8a45';
            for (let k = 0; k < 3; k++) ctx.fillRect(px + ((y * 7 + k * 13) % 10) / 10 * s - s * 0.1, py + k * s * 0.33, s * 0.35, s * 0.22);
          }
        }
      }
      // detalles de cada puerta cerrada: puerta de madera, número y el petirrojo
      for (const p of nivel.puertas) {
        if (p.abierta || p.x < x0 - 2 || p.x > x1 + 1) continue;
        const px = X(p.x), py = Y(SUELO - 2.2);
        ctx.fillStyle = '#7b4a1e';
        ctx.beginPath(); ctx.moveTo(px, Y(SUELO)); ctx.lineTo(px, py + s * 0.4); ctx.quadraticCurveTo(px + s / 2, py - s * 0.2, px + s, py + s * 0.4); ctx.lineTo(px + s, Y(SUELO)); ctx.fill();
        ctx.fillStyle = '#e0b35a'; ctx.beginPath(); ctx.arc(px + s * 0.25, Y(SUELO - 1), s * 0.08, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${s * 0.5}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(p.i + 1), px + s / 2, py + s * 0.75);
        if (p === siguientePuerta()) petirrojo(px + s / 2, Y(SUELO - 2.7) + Math.sin(t * 5) * s * 0.05, s, t);
      }
      // rosas que florecen en cada puerta abierta
      for (const r of nivel.rosas) rosa(X(r.x), Y(SUELO), s * (0.4 + 0.6 * r.t));
      // jefe final
      if (jefe.estado !== 'oculto') guardian(t);
      // proyectiles: bolas de espinas del jefe y rosas del niño
      for (const v of vuelos) {
        const k = Math.min(1, v.t / v.dur);
        const vx = v.x0 + (v.x1 - v.x0) * k, vy = v.y0 + (v.y1 - v.y0) * k - (v.tipo === 'rosa' ? Math.sin(k * Math.PI) * 1.5 : 0);
        if (v.tipo === 'rosa') rosaVolando(X(vx), Y(vy), s, t);
        else if (v.tipo === 'ola') ola(X(vx), Y(SUELO), s, t);
        else espina(X(vx), Y(vy) + (v.dur > 1e6 ? Math.sin(t * 6) * s * 0.08 : 0), s, t);
      }
      // al vencer al jefe, la arena se llena de flores
      if (jefe.estado === 'muere') for (let k = 0; k < 18; k++) {
        const fx = nivel.arenaX + 1 + k * 1.05;
        if (jefe.muerte < 0.3 + k * 0.05) continue;
        if (fx < x0 - 1 || fx > x1) continue;
        flor(X(fx), Y(SUELO), s, ['#ff5c8a', '#ffd166', '#c77dff', '#ff8c42'][k % 4]);
      }
      // monedas
      for (const m of nivel.monedas) {
        if (m.tomada || m.x < x0 - 1 || m.x > x1 + 1) continue;
        const k = Math.abs(Math.cos(t * 4 + m.x));
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.ellipse(X(m.x), Y(m.y), s * 0.28 * Math.max(0.15, k), s * 0.3, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
      }
      // caracoles
      for (const c of nivel.caracoles) {
        if (!c.vivo && c.aplastado <= 0) continue;
        if (c.x < x0 - 1 || c.x > x1 + 1) continue;
        caracol(X(c.x), Y(c.y), s, c.dir, !c.vivo);
      }
      // partículas
      for (const p of particulas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 2));
        if (p.tipo === 'moneda') { ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s * 0.25, 0, 7); ctx.fill(); }
        else if (p.tipo === 'cura') { ctx.fillStyle = '#7dff9b'; ctx.font = `bold ${s * 0.45}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('+', X(p.x), Y(p.y)); }
        else if (p.tipo === 'petalo') { ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), s * 0.14, s * 0.08, p.x, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = '#4caf50'; ctx.fillRect(X(p.x), Y(p.y), s * 0.22, s * 0.14); }
      }
      ctx.globalAlpha = 1;
      // jugador (parpadea si está recién reaparecido)
      const alzar = esquive ? Math.sin((esquive.t / esquive.dur) * Math.PI) * (esquive.alto || 2.6) : 0;   // salto de esquive
      // raíces y semillas rodantes
      for (const r of raices) raiz(X(r.x), Y(SUELO), s, r.alto * Math.min(1, r.t / 0.2), t);
      for (const sm of semillas) espina(X(sm.x), Y(sm.y), s * 0.8, -sm.x * 1.5, false);
      if (jug.inv <= 0 || Math.floor(t * 12) % 2) nino(X(jug.x), Y(jug.y - alzar), s, jug);
      ctx.restore();

      function guardian(t) {
        // Guardián de la Hiedra: un gigante de hojas con ojos de brasa y brazos de espinas
        const m = jefe.estado === 'muere' ? Math.max(0, 1 - jefe.muerte / 1.4)
          : jefe.estado === 'entra' ? Math.min(1, 0.15 + jefe.entra / 1.1) : 1;   // brota de la tierra
        if (m <= 0) return;
        const bob = Math.sin(t * 2.2) * 0.12;
        const cx = X(jefe.x + jefe.w / 2), base = Y(SUELO), alto = jefe.h * s * m, ancho = jefe.w * s * m;
        const top = base - alto + bob * s;
        ctx.save();
        if (jefe.flash > 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.45;
        // aura: verde si se está curando, roja si está enfurecido
        if (jefe.curando || jefe.furia) {
          ctx.fillStyle = jefe.curando ? `rgba(90,255,140,${0.25 + 0.15 * Math.sin(t * 8)})` : `rgba(255,60,40,${0.12 + 0.08 * Math.sin(t * 6)})`;
          ctx.beginPath(); ctx.ellipse(cx, top + alto * 0.55, ancho * 0.75, alto * 0.65, 0, 0, 7); ctx.fill();
        }
        // cuerpo
        ctx.fillStyle = '#24502a';
        ctx.beginPath(); ctx.ellipse(cx, top + alto * 0.55, ancho * 0.5, alto * 0.48, 0, 0, 7); ctx.fill();
        // hojas del cuerpo
        ctx.fillStyle = '#3d7a3f';
        for (let k = 0; k < 9; k++) {
          const a = k * 0.7 + 0.3, r = 0.3 + (k % 3) * 0.08;
          ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * ancho * r, top + alto * (0.5 + Math.sin(a) * 0.3), s * 0.35 * m, s * 0.18 * m, a, 0, 7); ctx.fill();
        }
        // corona de espinas
        ctx.fillStyle = '#5b3a1e';
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath(); ctx.moveTo(cx + k * s * 0.35 * m - s * 0.12 * m, top + alto * 0.12);
          ctx.lineTo(cx + k * s * 0.35 * m, top - s * 0.35 * m - Math.abs(k) * -s * 0.05); ctx.lineTo(cx + k * s * 0.35 * m + s * 0.12 * m, top + alto * 0.12); ctx.fill();
        }
        // brazos de espinas (el izquierdo se levanta al cargar)
        const levanta = jefe.estado === 'carga' ? Math.min(1, jefe.carga / 0.6) : 0;
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = s * 0.22 * m; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - ancho * 0.4, top + alto * 0.5); ctx.lineTo(cx - ancho * 0.85, top + alto * (0.75 - levanta * 0.65)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + ancho * 0.4, top + alto * 0.5); ctx.lineTo(cx + ancho * 0.8, top + alto * 0.8); ctx.stroke();
        if (levanta > 0) { ctx.fillStyle = `rgba(190,120,255,${0.35 + 0.3 * Math.sin(t * 20)})`; ctx.beginPath(); ctx.arc(cx - ancho * 0.85, top + alto * (0.75 - levanta * 0.65), s * 0.5 * levanta, 0, 7); ctx.fill(); }
        // ojos de brasa (miran al niño)
        ctx.fillStyle = jefe.flash > 0 ? '#ffffff' : jefe.furia ? '#ff2d2d' : '#ffb703';
        for (const dx of [-0.18, 0.18]) { ctx.beginPath(); ctx.ellipse(cx + ancho * dx, top + alto * 0.35, s * 0.2 * m, s * 0.13 * m, 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#7a1f00';
        for (const dx of [-0.18, 0.18]) { ctx.beginPath(); ctx.arc(cx + ancho * dx - s * 0.06, top + alto * 0.35, s * 0.07 * m, 0, 7); ctx.fill(); }
        // boca
        ctx.strokeStyle = '#102712'; ctx.lineWidth = s * 0.08 * m;
        ctx.beginPath(); ctx.arc(cx, top + alto * 0.55, ancho * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.restore();
      }

      function colinas(par, color, base, amp, fr) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, ch);
        for (let sx = 0; sx <= cw; sx += 8) {
          const wx = sx / s + camX * par;
          ctx.lineTo(sx, Y(base - amp * (0.5 + 0.5 * Math.sin(wx * fr) * Math.cos(wx * fr * 0.37))));
        }
        ctx.lineTo(cw, ch); ctx.fill();
      }
    }

    function espina(x, y, s, t, conPregunta = true) {
      // bola de espinas del jefe con un "?" (es una pregunta que viene volando)
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3);
      ctx.fillStyle = '#5b3a1e';
      for (let k = 0; k < 8; k++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.3); ctx.lineTo(0, -s * 0.58); ctx.lineTo(s * 0.1, -s * 0.3); ctx.fill();
      }
      ctx.fillStyle = '#6a2c91'; ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, 7); ctx.fill();
      ctx.restore();
      if (!conPregunta) return;
      ctx.fillStyle = '#fff'; ctx.font = `bold ${s * 0.45}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + s * 0.02);
    }
    function raiz(x, suelo, s, alto, t) {
      if (alto <= 0) return;
      ctx.fillStyle = '#6b4226';
      for (const dx of [-0.35, 0, 0.35]) {
        const h = alto * (dx === 0 ? 1 : 0.7) * s;
        ctx.beginPath(); ctx.moveTo(x + dx * s - s * 0.14, suelo); ctx.lineTo(x + dx * s + Math.sin(t * 9 + dx) * s * 0.05, suelo - h); ctx.lineTo(x + dx * s + s * 0.14, suelo); ctx.fill();
      }
      ctx.fillStyle = '#3d7a3f';
      ctx.beginPath(); ctx.ellipse(x + s * 0.12, suelo - alto * s * 0.55, s * 0.14, s * 0.07, 0.6, 0, 7); ctx.fill();
    }
    function ola(x, suelo, s, t) {
      // ola de hiedra: una cresta verde de 3 casillas de alto
      const h = 3.2 * s, w = 1.8 * s;
      ctx.fillStyle = '#2f6b35';
      ctx.beginPath(); ctx.moveTo(x + w, suelo); ctx.quadraticCurveTo(x + w, suelo - h, x, suelo - h);
      ctx.quadraticCurveTo(x - w * 0.4, suelo - h * 0.85, x - w * 0.2, suelo - h * 0.65); ctx.quadraticCurveTo(x - w * 0.6, suelo - h * 0.3, x - w, suelo); ctx.fill();
      ctx.fillStyle = '#4caf50';
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x - w * 0.5 + (k % 3) * w * 0.5, suelo - h * (0.2 + 0.25 * Math.floor(k / 2)) + Math.sin(t * 8 + k) * s * 0.05, s * 0.2, s * 0.1, k, 0, 7); ctx.fill(); }
    }
    function rosaVolando(x, y, s, t) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 10);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(-s * 0.04, 0, s * 0.08, s * 0.4);
      ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, 7); ctx.fill();
      ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, 7); ctx.fill();
      ctx.restore();
    }
    function nube(x, y, s) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.6, 0, 7); ctx.arc(x + s * 0.7, y - s * 0.25, s * 0.75, 0, 7); ctx.arc(x + s * 1.5, y, s * 0.6, 0, 7);
      ctx.fill();
    }
    function nino(x, y, s, j) {
      const w = j.w * s, h = j.h * s;
      const pierna = j.suelo ? Math.sin(j.paso * Math.PI) * s * 0.12 : s * 0.1;
      ctx.fillStyle = '#1e3a8a';                                     // piernas
      ctx.fillRect(x + w * 0.15, y + h * 0.7 + pierna * 0.3, w * 0.3, h * 0.3 - pierna * 0.3);
      ctx.fillRect(x + w * 0.55, y + h * 0.7 - pierna * 0.3, w * 0.3, h * 0.3 + pierna * 0.3);
      ctx.fillStyle = '#e63946'; ctx.fillRect(x + w * 0.05, y + h * 0.38, w * 0.9, h * 0.36);   // polera
      ctx.fillStyle = '#f1c27d'; ctx.fillRect(x + w * 0.12, y + h * 0.05, w * 0.76, h * 0.36);  // cara
      ctx.fillStyle = '#222';                                                                    // ojo
      ctx.fillRect(x + (j.dir > 0 ? w * 0.6 : w * 0.25), y + h * 0.17, w * 0.12, h * 0.08);
      ctx.fillStyle = '#2563eb';                                                                 // gorro
      ctx.fillRect(x + w * 0.08, y, w * 0.84, h * 0.12);
      ctx.fillRect(x + (j.dir > 0 ? w * 0.6 : -w * 0.1), y + h * 0.08, w * 0.5, h * 0.06);
    }
    function caracol(x, y, s, dir, aplastado) {
      const hh = aplastado ? 0.35 : 1;
      ctx.fillStyle = '#c9b458';
      ctx.fillRect(x, y + s * 0.5 * (aplastado ? 1.3 : 1), s * 0.9, s * 0.2);
      if (!aplastado) {
        ctx.fillStyle = '#c9b458';
        ctx.fillRect(x + (dir > 0 ? s * 0.75 : 0), y + s * 0.1, s * 0.1, s * 0.45);
      }
      ctx.fillStyle = '#9b5de5';
      ctx.beginPath(); ctx.ellipse(x + s * 0.45, y + s * 0.35 * (aplastado ? 1.6 : 1), s * 0.32, s * 0.3 * hh, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a2a8a'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.arc(x + s * 0.45, y + s * 0.35 * (aplastado ? 1.6 : 1), s * 0.14 * hh, 0, 5); ctx.stroke();
    }
    function petirrojo(x, y, s, t) {
      ctx.fillStyle = '#6b4f3a'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.28, s * 0.22, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8572a'; ctx.beginPath(); ctx.ellipse(x - s * 0.08, y + s * 0.04, s * 0.15, s * 0.14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - s * 0.14, y - s * 0.08, s * 0.035, 0, 7); ctx.fill();
      ctx.fillStyle = '#f4a300'; ctx.beginPath(); ctx.moveTo(x - s * 0.27, y - s * 0.05); ctx.lineTo(x - s * 0.38, y - s * 0.01); ctx.lineTo(x - s * 0.27, y + s * 0.02); ctx.fill();
      ctx.fillStyle = '#5a3f2c'; ctx.fillRect(x + s * 0.2, y - s * 0.12 + Math.sin(t * 8) * s * 0.03, s * 0.18, s * 0.08);
    }
    function rosa(x, suelo, s) {
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(x - s * 0.04, suelo - s * 1.1, s * 0.08, s * 1.1);
      ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.ellipse(x + s * 0.12, suelo - s * 0.5, s * 0.14, s * 0.07, -0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(x, suelo - s * 1.15, s * 0.22, 0, 7); ctx.fill();
      ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(x, suelo - s * 1.15, s * 0.09, 0, 7); ctx.fill();
    }
    function flor(x, suelo, s, color) {
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(x - s * 0.04, suelo - s * 0.8, s * 0.08, s * 0.8);
      ctx.fillStyle = color;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.13, suelo - s * 0.85 + Math.sin(a) * s * 0.13, s * 0.1, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x, suelo - s * 0.85, s * 0.07, 0, 7); ctx.fill();
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
