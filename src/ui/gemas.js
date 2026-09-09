import { state } from '../game/state.js';
import { GEMAS, MARTILLO_A_LAS, tieneGema, gemasConseguidas, guanteCompleto, proximaGema, gemaSitio } from '../game/gemas.js';

// Pantalla "🔮 Búsqueda de Gemas": mapa del mundo con los sitios de las gemas,
// lista de gemas con su estado y su "don", y el estado del Guante.
export function mountGemas({ onVolver, getWorld, getPlayer }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>🔮 Búsqueda de Gemas</h2>
    <p class="sub">Encuentra las 6 Gemas de Poder. Cada una la cuida un guardián más fuerte.
      Con 3 gemas forjas el <b>Martillo del Trueno</b>; con las 6, el <b>Guante de Gemas</b>.</p>
    <canvas class="gem-map" width="300" height="300" aria-label="Mapa de gemas"></canvas>
    <p class="hint" data-prog></p>
    <div class="gem-list" data-lista></div>
    <p class="hint" data-guante></p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  const canvas = el.querySelector('.gem-map');
  const ctx = canvas.getContext('2d');
  const listaEl = el.querySelector('[data-lista]');
  const progEl = el.querySelector('[data-prog]');
  const guanteEl = el.querySelector('[data-guante]');

  function pintar() {
    const world = getWorld?.();
    const player = getPlayer?.();
    const hechas = gemasConseguidas();
    const prox = proximaGema();

    progEl.textContent = `Gemas: ${hechas} / ${GEMAS.length}`;

    // ---- lista ----
    listaEl.innerHTML = '';
    for (const g of GEMAS) {
      const ok = tieneGema(g.id);
      const esProx = !ok && prox && prox.id === g.id;
      const row = document.createElement('div');
      row.className = 'gem-row' + (ok ? ' ok' : esProx ? ' next' : ' locked');
      const estado = ok ? '✅ conseguida' : esProx ? '📍 tu objetivo ahora' : '🔒 más adelante';
      row.innerHTML = `
        <span class="gem-dot" style="background:#${g.color.toString(16).padStart(6, '0')}"></span>
        <div class="gem-txt">
          <b>${g.emoji} ${g.nombre}</b>
          <span class="gem-est">${estado}</span>
          <span class="gem-don">${ok || esProx ? g.don : 'Derrota al ' + g.guard.nombre + ' para saber qué da'}</span>
        </div>`;
      listaEl.appendChild(row);
    }

    // ---- guante ----
    if (guanteCompleto()) {
      guanteEl.innerHTML = '✊ <b>Guante de Gemas completo.</b> El botón ✨ hace la <b>Onda Prisma</b>: barre un área enorme.';
    } else if (hechas >= MARTILLO_A_LAS) {
      guanteEl.innerHTML = `⚡ Tienes el <b>Martillo del Trueno</b>. Te faltan ${GEMAS.length - hechas} gemas para el Guante completo.`;
    } else {
      guanteEl.innerHTML = `Junta ${MARTILLO_A_LAS - hechas} gema(s) más para forjar el <b>Martillo del Trueno</b>.`;
    }

    // ---- mapa ----
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ffffff22';
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.strokeStyle = '#ffffff11';
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(4 + (W - 8) * i / 4, 4); ctx.lineTo(4 + (W - 8) * i / 4, H - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 4 + (H - 8) * i / 4); ctx.lineTo(W - 4, 4 + (H - 8) * i / 4); ctx.stroke();
    }
    const px = (fx) => 8 + (W - 16) * fx;
    const pz = (fz) => 8 + (H - 16) * fz;

    for (const g of GEMAS) {
      const ok = tieneGema(g.id);
      const esProx = !ok && prox && prox.id === g.id;
      const x = px(g.sitio[0]), y = pz(g.sitio[1]);
      const col = '#' + g.color.toString(16).padStart(6, '0');
      if (esProx) {
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = ok ? col : esProx ? col : '#6b7686';
      ctx.globalAlpha = ok ? 1 : esProx ? 1 : 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (ok) { ctx.fillStyle = '#0d1b2a'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✓', x, y + 3); }
    }

    // jugador
    if (world && player && world.SX) {
      const fx = Math.max(0, Math.min(1, player.pos.x / world.SX));
      const fz = Math.max(0, Math.min(1, player.pos.z / world.SZ));
      const x = px(fx), y = pz(fz);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - 6); ctx.lineTo(x - 5, y + 5); ctx.lineTo(x + 5, y + 5); ctx.closePath();
      ctx.fill();
    }
  }

  el.refresh = pintar;
  pintar();
  return el;
}
