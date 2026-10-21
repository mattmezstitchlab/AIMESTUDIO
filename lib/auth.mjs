import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import pg from 'pg';

export function configuration(env = process.env) {
  for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'RESEND_API_KEY', 'AUTH_EMAIL_FROM']) {
    if (!env[key]) throw new Error('Authentication is not configured');
  }
  const url = new URL(env.BETTER_AUTH_URL);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('Invalid authentication configuration');
  }
  return { origin: url.origin, env };
}

export function options(env = process.env) {
  const { origin } = configuration(env);
  return {
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: new pg.Pool({ connectionString: env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000 }),
    // Isolate this implementation from existing app and Neon managed-auth tables.
    user: { modelName: 'aime_auth_user' },
    account: { modelName: 'aime_auth_account' },
    verification: { modelName: 'aime_auth_verification' },
    session: { modelName: 'aime_auth_session', expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    trustedOrigins: [origin],
    advanced: { useSecureCookies: true, defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax' } },
    rateLimit: { enabled: true, storage: 'database', modelName: 'aime_auth_rate_limit', window: 60, max: 20 },
    plugins: [magicLink({
      expiresIn: 300,
      storeToken: 'hashed',
      rateLimit: { window: 60, max: 3 },
      async sendMagicLink({ email, url }) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.AUTH_EMAIL_FROM, to: [email], subject: 'Votre connexion à AIME', text: `Connectez-vous à AIME avec ce lien à usage unique (5 minutes) :\n${url}\n\nSi vous ne l’avez pas demandé, ignorez ce message.` }),
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error('Unable to send sign-in email');
      }
    })]
  };
}
let instance;
export function getAuth() {
  return instance ||= betterAuth(options());
}
