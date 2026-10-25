/* Personal menu only. No simulated identity or role switching. */
(() => {
  const name = document.getElementById('logo'), menu = document.getElementById('identityMenu');
  const home = document.getElementById('identityHome');
  function close(focus = false) { menu.hidden = true; name.setAttribute('aria-expanded', 'false'); if (focus) name.focus(); }
  name.addEventListener('click', () => { const open = menu.hidden; close(); if (open) { menu.hidden = false; name.setAttribute('aria-expanded', 'true'); home.focus(); } });
  home.addEventListener('click', () => close(true));
  menu.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target) && !name.contains(e.target)) close(); });
})();
