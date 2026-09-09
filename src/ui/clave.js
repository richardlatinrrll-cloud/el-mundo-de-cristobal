// Pantalla de clave. No es seguridad "de verdad" (es una web estática), pero
// evita que cualquiera entre y no aparece en buscadores. Suficiente para
// "solo para Cristóbal".

const KEY_OK = 'mundo-cristobal-clave-ok';
const HASH_OBJETIVO = '89195a'; // hash de la clave actual

function hash(s) {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) >>> 0;
  return x.toString(36);
}

export function claveDesbloqueada() {
  try { return localStorage.getItem(KEY_OK) === '1'; } catch { return false; }
}

// Muestra la pantalla de clave. Llama a onOk() cuando aciertan.
export function mountClave(onOk) {
  const el = document.createElement('div');
  el.id = 'clave';
  el.innerHTML = `
    <div class="clave-box">
      <div class="clave-emoji">🔒</div>
      <div class="clave-titulo">El Mundo de Cristóbal</div>
      <p class="clave-sub">Escribe la clave para entrar</p>
      <input type="password" inputmode="text" autocomplete="off" autocapitalize="off"
             spellcheck="false" placeholder="Clave" data-inp />
      <button class="btn" data-btn>Entrar</button>
      <div class="clave-err" data-err hidden>Clave incorrecta. Intenta de nuevo.</div>
    </div>
  `;
  const inp = el.querySelector('[data-inp]');
  const err = el.querySelector('[data-err]');

  function probar() {
    if (hash(inp.value.trim()) === HASH_OBJETIVO) {
      try { localStorage.setItem(KEY_OK, '1'); } catch {}
      el.remove();
      onOk();
    } else {
      err.hidden = false;
      el.querySelector('.clave-box').classList.remove('shake');
      void el.offsetWidth;
      el.querySelector('.clave-box').classList.add('shake');
      inp.select();
    }
  }
  el.querySelector('[data-btn]').addEventListener('click', probar);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') probar(); });
  setTimeout(() => inp.focus(), 60);

  document.getElementById('app').appendChild(el);
  return el;
}
