'use strict';
const form = document.querySelector('#connexion');
const status = document.querySelector('#etat');
async function request(path, body) {
  const response = await fetch('/api/auth/' + path, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error('Service indisponible. Réessayez plus tard.');
  return response.json();
}
async function session() {
  try {
    const data = await request('get-session');
    form.hidden = Boolean(data?.user);
    document.querySelector('#session').hidden = !data?.user;
    document.querySelector('#identite').textContent = data?.user?.email || '';
  } catch (error) { status.textContent = error.message; }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await request('sign-in/magic-link', { email: form.email.value.trim(), callbackURL: '/compte/', errorCallbackURL: '/compte/?erreur=1' });
    status.textContent = 'Si l’envoi est possible, un lien arrive par e-mail. Vérifiez aussi les indésirables.';
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
document.querySelector('#deconnexion').addEventListener('click', async () => {
  try { await request('sign-out', {}); await session(); status.textContent = 'Vous êtes déconnecté.'; }
  catch (error) { status.textContent = error.message; }
});
if (new URLSearchParams(location.search).has('erreur')) status.textContent = 'Lien invalide ou expiré. Demandez un nouveau lien.';
session();
