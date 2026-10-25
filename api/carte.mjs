// AIME · /api/carte : MA Carte, enregistrée sur mon compte (V1, PR P1). Seule la personne connectée lit et écrit SA Carte ;
// l'identité vient toujours du cookie de session vérifié, jamais du corps. Aucune Carte d'autrui n'est jamais lue ici,
// et rien n'est public : la publication par lien révocable viendra avec une autre PR.
//   GET                                                   → { ok, carte | null, rev, maj_le, consentement_le, texte }
//   POST { action: 'enregistrer', carte, consentement: true, rev }
//        rev = la révision que l'appareil avait sous les yeux (null s'il n'y avait rien) ; si le compte a changé entre-temps
//        (un autre appareil), 409 avec la version du compte : aucun écrasement silencieux
//   POST { action: 'retirer', confirmation: true }        → efface la Carte du compte (la copie de l'appareil n'est pas touchée)
// Sans session : 401. Base absente ou migration 2026-10-25-10 non appliquée : 503, dit. Écritures : même origine et JSON
// (api/_auth/requete.cjs), quota par personne.
import { personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';
import K from './_carte/carte.cjs';

let db; export function _db(d) { db = d; }
let qui = personne; export function _personne(f) { qui = f || personne; }

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 65536) return null; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
const INDISPONIBLE = { ok: false, raison: 'Votre Carte ne peut pas être enregistrée ici pour l\'instant (base indisponible, ou migration 2026-10-25-10 à appliquer). Elle reste sur cet appareil.' };
const ligne = async (base, id) => (await base.query('select donnees, rev, maj_le, consentement_le from cartes where user_id = $1', [id])).rows[0] || null;
const vue = l => l ? { ok: true, carte: l.donnees, rev: l.rev, maj_le: l.maj_le, consentement_le: l.consentement_le, texte: K.TEXTE_CONSENTEMENT } : { ok: true, carte: null, rev: null, maj_le: null, consentement_le: null, texte: K.TEXTE_CONSENTEMENT };

export default async function carte(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  if (req.method === 'POST') { const refus = R.ecriture(req); if (refus) return json(res, ...refus); }
  let u = null; try { u = await qui(req); } catch { return json(res, 503, INDISPONIBLE); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous pour retrouver votre Carte.' });
  const base = db !== undefined ? db : _pool();
  if (!base) return json(res, 503, INDISPONIBLE);
  try {
    if (req.method === 'GET') return json(res, 200, vue(await ligne(base, u.id)));
    const b = await corps(req);
    if (b === null) return json(res, 413, { ok: false, raison: 'Carte trop volumineuse.' });
    if (b.action === 'retirer') {
      if (b.confirmation !== true) return json(res, 400, { ok: false, raison: 'Confirmation requise.' });
      await base.query('delete from cartes where user_id = $1', [u.id]);
      return json(res, 200, vue(null));
    }
    if (b.action !== 'enregistrer') return json(res, 400, { ok: false, raison: 'Action inconnue.' });
    if (b.consentement !== true) return json(res, 400, { ok: false, raison: 'Votre accord est nécessaire pour enregistrer votre Carte sur votre compte.' });
    let propre; try { propre = K.nettoyer(b.carte); } catch (e) { if (e instanceof K.Refus) return json(res, e.code, { ok: false, raison: e.raison }); throw e; }
    const q = await Q.quota('carte:enregistrer', u.id, { db: base });
    if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Trop d\'enregistrements en peu de temps : réessayez dans un moment.' }); }
    if (b.rev != null && !(Number.isInteger(b.rev) && b.rev >= 1)) return json(res, 400, { ok: false, raison: 'Révision invalide.' });
    const attendu = b.rev == null ? null : b.rev;
    /* une seule requête : insérer si rien n'existe et que l'appareil n'attendait rien ; sinon mettre à jour SEULEMENT la révision attendue */
    const r = attendu === null
      ? await base.query(`insert into cartes (user_id, donnees, rev, consentement_le, consentement_texte) values ($1, $2::jsonb, 1, now(), $3)
          on conflict (user_id) do nothing returning donnees, rev, maj_le, consentement_le`, [u.id, JSON.stringify(propre), K.TEXTE_CONSENTEMENT])
      : await base.query(`update cartes set donnees = $2::jsonb, rev = rev + 1, maj_le = now(), consentement_le = now(), consentement_texte = $3
          where user_id = $1 and rev = $4 returning donnees, rev, maj_le, consentement_le`, [u.id, JSON.stringify(propre), K.TEXTE_CONSENTEMENT, attendu]);
    if (r.rows[0]) return json(res, 200, Object.assign(vue(r.rows[0]), { retenus: K.retenus(b.carte) }));
    const actuelle = await ligne(base, u.id);
    return json(res, 409, Object.assign(vue(actuelle), { ok: false, raison: 'Votre Carte a changé sur un autre appareil depuis que vous l\'avez ouverte. Choisissez la version à garder.' }));
  } catch (e) {
    if (e && (e.code === '42P01' || e.code === 'ECONNREFUSED' || e.code === '57P01')) return json(res, 503, INDISPONIBLE);
    if (e && e.code === '23514') return json(res, 413, { ok: false, raison: 'Carte trop volumineuse.' });
    return json(res, 503, INDISPONIBLE);
  }
}
