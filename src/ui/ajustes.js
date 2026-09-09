import { state, save } from '../game/state.js';
import { audio, SPOTIFY_PHONK } from '../game/audio.js';

// Pantalla de Ajustes: controles, pantalla y sonido.
export function mountAjustes({ onVolver, onCambio }) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn small secondary" data-volver>← Menú</button>
      <div class="spacer"></div>
    </div>
    <h2>⚙️ Ajustes</h2>
    <p class="sub">Si algo se siente al revés, cámbialo aquí. Se aplica al instante.</p>

    <div class="ajustes-list">
      <label class="aj"><span>Joystick a la izquierda <span class="hint">(apágalo si eres zurdo)</span></span>
        <input type="checkbox" data-k="stickIzquierda"></label>
      <label class="aj"><span>Invertir joystick ← → (izquierda/derecha)</span>
        <input type="checkbox" data-k="invJoyX"></label>
      <label class="aj"><span>Invertir joystick ↑ ↓ (adelante/atrás)</span>
        <input type="checkbox" data-k="invJoyY"></label>
      <label class="aj"><span>Invertir cámara al mirar arriba/abajo</span>
        <input type="checkbox" data-k="invCamY"></label>
      <label class="aj"><span>Sensibilidad de la cámara: <b data-sens>1.0</b></span>
        <input type="range" min="0.4" max="2" step="0.1" data-k="sensCam"></label>
      <label class="aj"><span>Vista por defecto</span>
        <select data-k="vista">
          <option value="primera">Primera persona</option>
          <option value="tercera">Tercera persona</option>
        </select></label>
      <label class="aj"><span>Pantalla completa al jugar <span class="hint">(oculta la barra del navegador)</span></span>
        <input type="checkbox" data-k="pantallaCompleta"></label>

      <label class="aj"><span>Música</span>
        <select data-k="musica">
          <option value="juego">Del juego (phonk)</option>
          <option value="spotify">Spotify (aparte)</option>
          <option value="ninguna">Sin música</option>
        </select></label>
      <label class="aj"><span>Volumen música: <b data-vm>50%</b></span>
        <input type="range" min="0" max="1" step="0.05" data-k="volMusica"></label>
      <label class="aj"><span>Volumen efectos: <b data-ve>70%</b></span>
        <input type="range" min="0" max="1" step="0.05" data-k="volEfectos"></label>
      <div class="aj" data-spotify hidden>
        <span>Abre una lista de phonk en Spotify y déjala sonando; el juego pone solo los efectos.</span>
        <a class="btn small" href="${SPOTIFY_PHONK}" target="_blank" rel="noopener">▶ Abrir Spotify</a>
      </div>
    </div>
    <p class="hint">En el juego: botón 👁️ cambia primera/tercera persona en cualquier momento.</p>
  `;
  el.querySelector('[data-volver]').addEventListener('click', onVolver);

  const sensLabel = el.querySelector('[data-sens]');
  const vmLabel = el.querySelector('[data-vm]');
  const veLabel = el.querySelector('[data-ve]');
  const spotifyRow = el.querySelector('[data-spotify]');

  function pintar() {
    for (const inp of el.querySelectorAll('[data-k]')) {
      const k = inp.dataset.k;
      const v = state.ajustes[k];
      if (inp.type === 'checkbox') inp.checked = !!v;
      else inp.value = v;
    }
    sensLabel.textContent = Number(state.ajustes.sensCam).toFixed(1);
    vmLabel.textContent = Math.round((state.ajustes.volMusica ?? 0.5) * 100) + '%';
    veLabel.textContent = Math.round((state.ajustes.volEfectos ?? 0.7) * 100) + '%';
    spotifyRow.hidden = state.ajustes.musica !== 'spotify';
  }

  el.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-k]');
    if (!inp) return;
    const k = inp.dataset.k;
    let v;
    if (inp.type === 'checkbox') v = inp.checked;
    else if (inp.type === 'range') v = parseFloat(inp.value);
    else v = inp.value;
    state.ajustes[k] = v;
    if (k === 'sensCam') sensLabel.textContent = v.toFixed(1);
    if (k === 'volMusica') vmLabel.textContent = Math.round(v * 100) + '%';
    if (k === 'volEfectos') veLabel.textContent = Math.round(v * 100) + '%';
    if (k === 'musica') {
      spotifyRow.hidden = v !== 'spotify';
      audio.init();
      if (v === 'juego') { audio.resume(); audio.startMusic(); } else audio.stopMusic();
    }
    audio.applyVolumes();
    if (k === 'volEfectos') audio.sfx('menu');   // muestrita del volumen
    save();
    onCambio?.(k, v);
  });

  el.refresh = pintar;
  pintar();
  return el;
}
