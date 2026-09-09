import { POWERS, cumpleRequisito, reqTexto } from './powers/registry.js';
import { state, save } from './state.js';

export function mountPoderes({ onVolver, onCambio }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>✨ Mis poderes</h2>
    <p class="sub">Equipa un poder. Se activará cuando entres a Jugar.</p>
    <div class="power-list" data-list></div>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  el.refresh = () => {
    const list = el.querySelector('[data-list]');
    list.innerHTML = '';

    const ninguno = row({ emoji: '🚫', nombre: 'Sin poder', desc: 'Jugar normal.' },
      true, state.poderEquipado === null, () => { state.poderEquipado = null; save(); onCambio?.(); el.refresh(); });
    list.appendChild(ninguno);

    for (const p of POWERS) {
      const ok = cumpleRequisito(p, state.medallas);
      const equipped = state.poderEquipado === p.id;
      list.appendChild(row(
        p, ok, equipped,
        ok ? () => { state.poderEquipado = equipped ? null : p.id; save(); onCambio?.(); el.refresh(); } : null
      ));
    }
  };

  function row(p, unlocked, equipped, onClick) {
    const d = document.createElement('div');
    d.className = `power ${unlocked ? '' : 'locked'} ${equipped ? 'equipped' : ''}`;
    d.innerHTML = `
      <div class="emoji">${p.emoji}</div>
      <div class="info">
        <div class="p-name">${p.nombre}</div>
        <div class="p-req">${unlocked ? p.desc : '🔒 Requiere: ' + reqTexto(p)}</div>
      </div>
      <button class="btn small ${equipped ? '' : 'secondary'}" ${unlocked ? '' : 'disabled'} data-btn>
        ${equipped ? 'Equipado ✓' : unlocked ? 'Equipar' : 'Bloqueado'}
      </button>`;
    if (onClick) d.querySelector('[data-btn]').addEventListener('click', onClick);
    return d;
  }

  el.refresh();
  return el;
}
