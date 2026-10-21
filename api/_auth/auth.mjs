// AIME · comptes (Better Auth). Connexion par lien envoyé par e-mail (Resend) puis clé d'accès (passkey).
// Aucun secret ici : DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY et AUTH_FROM viennent de l'environnement.
// Fermé par défaut : sans base ni secret, l'instance n'est pas créée et l'API répond 503.
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';
import { passkey } from '@better-auth/passkey';
import pg from 'pg';

/* l'adresse publique : fixée par l'environnement, sinon l'adresse de la branche Vercel, sinon le local */
export function adresse(env = process.env) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/$/, '');
  if (env.VERCEL_BRANCH_URL) return 'https://' + env.VERCEL_BRANCH_URL;
  if (env.VERCEL_URL) return 'https://' + env.VERCEL_URL;
  return 'http://localhost:8773';
}
export function pret(env = process.env) { return !!(env.DATABASE_URL && env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32); }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

/* l'envoi d'e-mails : Resend, expéditeur de notre domaine vérifié ; injectable pour les tests */
let envoyeur = null;
export function _envoyeur(f) { envoyeur = f; instance = null; }
export function envoiPret(env = process.env) { return !!(envoyeur || (env.RESEND_API_KEY && (env.AUTH_FROM || env.CONTACT_FROM))); }
export async function envoyer({ to, subject, text, html }) {
  if (envoyeur) return envoyeur({ to, subject, text, html });
  const cle = process.env.RESEND_API_KEY, de = process.env.AUTH_FROM || process.env.CONTACT_FROM;
  if (!cle || !de) throw new Error('envoi d\'e-mail non configuré');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: de, to: [to], subject, text, html }) });
  if (!r.ok) throw new Error('envoi refusé');
}
function envoyerLien({ email, url }) {
  return envoyer({ to: email, subject: 'Votre lien de connexion AIME',
    text: 'Bonjour,\n\nPour vous connecter à AIME, ouvrez ce lien (valable 15 minutes, une seule fois) :\n' + url + '\n\nSi vous n\'avez rien demandé, ignorez ce message.\n',
    html: '<p>Bonjour,</p><p>Pour vous connecter à AIME, cliquez sur ce lien (valable 15 minutes, une seule fois) :</p><p><a href="' + esc(url) + '">Me connecter à AIME</a></p><p style="color:#666">Si vous n\'avez rien demandé, ignorez ce message.</p>' });
}

/* la photo de profil : une petite image encodée (WebP, JPEG ou PNG), jamais une adresse externe ni du code */
export function imageOk(v) { return typeof v === 'string' && v.length <= 160000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v); }
function propre(u) { const o = Object.assign({}, u); if (o.name !== undefined) o.name = String(o.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80); if ('image' in o && o.image && !imageOk(o.image)) o.image = null; return o; }

let instance = null, pool = null;
export function schemaManquant(e) { return /SCHEMA_MISMATCH|schema mismatch/i.test(String((e && (e.code || (e.cause && e.cause.code))) || '') + ' ' + String(e && e.message)); }
/* oublier l'instance : la prochaine requête relit le schéma (utile juste après une migration) */
export function oublier() { const p = pool; instance = null; pool = null; if (p) p.end().catch(() => {}); }
export function _pool() { return pool; }
export function auth(env = process.env) {
  if (instance) return instance;
  if (!pret(env)) return null;
  const base = adresse(env), hote = new URL(base).hostname;
  pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 3, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? false : { rejectUnauthorized: true } });
  instance = betterAuth({
    appName: 'AIME',
    baseURL: base,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: [base],
    emailAndPassword: { enabled: false },
    advanced: { cookiePrefix: 'aime', useSecureCookies: base.startsWith('https://'), ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 30, storage: 'memory' },
    databaseHooks: { user: {
      create: { before: async u => ({ data: propre(u) }) },
      update: { before: async d => { if ('image' in d && d.image != null && d.image !== '' && !imageOk(d.image)) return false; return { data: propre(d) }; } } } },
    plugins: [
      magicLink({ expiresIn: 60 * 15, storeToken: 'hashed', sendMagicLink: envoyerLien, rateLimit: { window: 60, max: 3 } }),
      passkey({ rpID: hote, rpName: 'AIME', origin: base })
    ]
  });
  return instance;
}

/* la personne connectée, ou null : TOUJOURS depuis le cookie de session vérifié, jamais depuis le corps */
export async function personne(req) {
  const a = auth(); if (!a) return null;
  const h = new Headers(); for (const [k, v] of Object.entries(req.headers || {})) if (v != null) h.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  try { const s = await a.api.getSession({ headers: h }); return s && s.user ? { id: s.user.id, email: s.user.email, nom: s.user.name || '' } : null; }
  catch (e) { if (schemaManquant(e)) { oublier(); throw e; } return null; }
}
