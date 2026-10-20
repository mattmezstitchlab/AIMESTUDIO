// AIME · authentification (Better Auth) : lien par e-mail et passkeys.
// L'identité vient toujours de la session vérifiée côté serveur, jamais d'un identifiant envoyé par le navigateur.
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import pg from 'pg';

export const PROD_URL = 'https://www.lemondeaime.com';
export const PROD_ORIGINS = ['https://www.lemondeaime.com', 'https://lemondeaime.com'];
const LINK_MINUTES = 10;

export function siteURL(env = process.env) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/+$/, '');
  if (env.VERCEL_ENV === 'production') return PROD_URL;
  const host = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  return host ? 'https://' + host : 'http://localhost:3000';
}

// Production : les passkeys appartiennent à lemondeaime.com. Preview : à l'adresse de la preview, isolée.
export function rpID(env = process.env) {
  if (env.AUTH_RP_ID) return env.AUTH_RP_ID;
  const host = new URL(siteURL(env)).hostname;
  return /(^|\.)lemondeaime\.com$/.test(host) ? 'lemondeaime.com' : host;
}

export function origins(env = process.env) {
  const url = siteURL(env);
  return new URL(url).hostname.endsWith('lemondeaime.com') ? Array.from(new Set([url, ...PROD_ORIGINS])) : [url];
}

export function mailHTML(url) {
  return '<!doctype html><html lang="fr"><body style="margin:0;background:#F7F7F6;font-family:Inter,Helvetica,Arial,sans-serif;color:#141416">' +
    '<div style="max-width:480px;margin:0 auto;padding:40px 24px">' +
    '<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#5E6068;margin:0 0 24px">AIME</p>' +
    '<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">Votre lien de connexion</h1>' +
    '<p style="font-size:15px;line-height:1.5;margin:0 0 24px">Il est valable ' + LINK_MINUTES + ' minutes et ne sert qu\'une fois.</p>' +
    '<p style="margin:0 0 32px"><a href="' + url + '" style="display:inline-block;background:#141416;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">Me connecter à AIME</a></p>' +
    '<p style="font-size:13px;line-height:1.5;color:#5E6068;margin:0">Si vous n\'avez rien demandé, ignorez ce message : personne ne peut se connecter sans ce lien.</p>' +
    '</div></body></html>';
}

export function resendSender(env = process.env) {
  return async function sendMagicLink({ email, url }) {
    if (!env.RESEND_API_KEY) {
      // Sans service d'envoi : jamais en production ; en preview, le lien va dans les journaux du déploiement.
      if (env.VERCEL_ENV === 'production') throw new Error('RESEND_API_KEY manquant');
      console.log('[auth] lien de connexion (preview, pas d\'envoi configuré) :', url);
      return;
    }
    const { Resend } = await import('resend');
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.AUTH_EMAIL_FROM || 'AIME <connexion@lemondeaime.com>',
      to: email,
      subject: 'Votre lien de connexion à AIME',
      html: mailHTML(url),
      text: 'Votre lien de connexion à AIME (valable ' + LINK_MINUTES + ' minutes, une seule fois) : ' + url + '\n\nSi vous n\'avez rien demandé, ignorez ce message.'
    });
    if (error) throw new Error('Envoi du lien impossible');
  };
}

export function authOptions(env = process.env, opts = {}) {
  const url = siteURL(env);
  return {
    appName: 'AIME',
    baseURL: url,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: opts.pool || new pg.Pool({ connectionString: env.DATABASE_URL, max: 3 }),
    trustedOrigins: origins(env),
    emailAndPassword: { enabled: false },
    user: {
      additionalFields: {
        // 'creator' ne s'attribue que dans la base, jamais depuis le navigateur.
        role: { type: 'string', required: false, defaultValue: 'member', input: false }
      }
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: opts.rateLimit !== false, storage: 'database', window: 60, max: 60 },
    advanced: {
      useSecureCookies: url.startsWith('https://'),
      // Sur Vercel, ces en-têtes sont réécrits par la plateforme avec l'adresse réelle du visiteur.
      ...(env.VERCEL ? { ipAddress: { ipAddressHeaders: ['x-real-ip', 'x-forwarded-for'] } } : {})
    },
    plugins: [
      magicLink({ expiresIn: LINK_MINUTES * 60, storeToken: 'hashed', sendMagicLink: opts.sendMagicLink || resendSender(env) }),
      passkey({ rpID: rpID(env), rpName: 'AIME', origin: origins(env) })
    ]
  };
}

let cached;
export function getAuth() {
  if (!cached) cached = betterAuth(authOptions(process.env));
  return cached;
}
