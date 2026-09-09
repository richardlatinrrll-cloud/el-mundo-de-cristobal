// Pantalla de clave. No es seguridad "de verdad" (es una web estática), pero
// evita que cualquiera entre y no aparece en buscadores. Suficiente para
// "solo para Cristóbal". Pide la clave CADA VEZ que se abre el juego.
//
// - Clave normal: entra al juego con el avance guardado.
// - Clave maestra (RUT de Richard sin dígito verificador): modo de prueba con
//   todos los poderes y gemas desbloqueados; NO guarda el avance.

const HASH_NORMAL = '89195a';   // hash de la clave del juego
const HASH_MAESTRA = '5jqypa';  // hash de la clave maestra (pruebas)

function hash(s) {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) >>> 0;
  return x.toString(36);
}

// Siempre pide la clave al entrar (no se recuerda entre visitas).
export function claveDesbloqueada() { return false; }

// Muestra la pantalla de clave. Llama a onOk({ maestro }) al acertar.
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
    const h = hash(inp.value.trim());
    if (h === HASH_NORMAL || h === HASH_MAESTRA) {
      el.remove();
      onOk({ maestro: h === HASH_MAESTRA });
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
