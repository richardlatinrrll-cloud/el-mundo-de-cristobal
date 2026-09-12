import { especimenesCapturados, alienDef } from '../game/powers/ovnitrix.js';

// Pantalla del Ovnitrix: elegir en qué alien transformarse, entre las
// especies ya escaneadas (enemigos/jefes/dinosaurios derrotados).
export function mountOvnitrix({ onVolver, onElegir }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Cerrar</button>
      <div class="spacer"></div>
    </div>
    <h2>🛸 Ovnitrix</h2>
    <p class="sub">Elige el alien con el ADN que ya escaneaste. Dura 60 s.</p>
    <div class="power-list" data-list></div>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  el.refresh = () => {
    const list = el.querySelector('[data-list]');
    list.innerHTML = '';
    const ids = especimenesCapturados();
    if (!ids.length) {
      const p = document.createElement('p');
      p.className = 'sub';
      p.textContent = 'Todavía no escaneaste ningún enemigo.';
      list.appendChild(p);
      return;
    }
    for (const id of ids) {
      const a = alienDef(id);
      if (!a) continue;
      const d = document.createElement('div');
      d.className = 'power';
      d.innerHTML = `
        <div class="emoji">${a.emoji}</div>
        <div class="info">
          <div class="p-name">${a.nombre}</div>
          <div class="p-req">${descAlien(a)}</div>
        </div>
        <button class="btn small" data-btn>Transformarse</button>`;
      d.querySelector('[data-btn]').addEventListener('click', () => onElegir(id));
      list.appendChild(d);
    }
  };

  return el;
}

function descAlien(a) {
  const s = a.stats;
  const bits = [];
  if (s.sprintMul) bits.push('velocidad');
  if (s.jumpV) bits.push('salto');
  if (s.gemDano) bits.push('fuerza de golpe');
  if (s.empuje) bits.push('resiste empujones');
  if (s.flying) bits.push('vuela');
  if (s.invisible) bits.push('invisible');
  if (s.instaBreak) bits.push('rompe bloques al toque');
  if (s.reach) bits.push('alcance largo');
  if (s.visionNocturna) bits.push('ve de noche');
  return bits.join(' · ');
}
