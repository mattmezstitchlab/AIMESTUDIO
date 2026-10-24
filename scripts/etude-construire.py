# -*- coding: utf-8 -*-
"""Construit etude/index.html (page publique, HTML statique lisible sans JavaScript) à partir de :
   - etude/dossier.md : le dossier de convergence (version publique) ;
   - atlas/data.json  : les résultats de l'audit (version sans les constats de sécurité serveur).
   Lancer depuis la racine du dépôt :  python3 scripts/etude-construire.py   (demande le paquet « markdown »)."""
import json, html, re
from pathlib import Path
import markdown
from markdown.extensions.toc import TocExtension, slugify_unicode

R = Path(__file__).resolve().parent.parent
md = (R / "etude/dossier.md").read_text(encoding="utf-8")
D = json.loads((R / "atlas/data.json").read_text(encoding="utf-8"))
e = html.escape

md = md.replace("- [ ] ", "- ☐ ")
corps = markdown.markdown(md, extensions=["tables", "sane_lists", TocExtension(slugify=slugify_unicode, permalink=False)])
corps = re.sub(r"<h1[^>]*>.*?</h1>", "", corps, count=1, flags=re.S)   # le titre est dans l'en-tête de la page
corps = corps.replace("<table>", '<div class="tab"><table>').replace("</table>", "</table></div>")

ST = {"verifie": "vérifié", "inaccessible": "inaccessible", "non-implemente": "non implémenté", "a-tester": "à tester"}
def table(th, rows):
    return ('<div class="tab"><table><thead><tr>' + "".join(f"<th>{e(t)}</th>" for t in th) + "</tr></thead><tbody>"
            + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>")

roles = table(["Rôle", "Rôle serveur", "Dock montré (démo)", "+ (démo)", "Bouton de l'accueil", "Ce qui manque"],
    [[f"<strong>{e(r['nom'])}</strong>", e(r["serveur"]), e(r["demo_dock"]), e(r["demo_plus"]), e(r["bouton"]), e(r["manque"])] for r in D["roles"]])
anom = table(["N°", "Gravité", "Type", "Constat", "Preuve", "Statut"],
    [[e(a["id"]), e(a["gravite"]), e(a["type"]), f"<strong>{e(a['titre'])}</strong><br>{e(a['constat'])}", f"<code>{e(a['preuve'])}</code>", e(ST.get(a["statut"], a["statut"]))] for a in D["anomalies"]])
controle = table(["Essai", "Attendu", "Obtenu", "Statut"],
    [[e(t["test"]), e(t["attendu"]), e(t["obtenu"]), e(ST.get(t["statut"], t["statut"]))] for t in D["phase4"]])
manques = table(["Fonction", "Présent", "Manquant", "Statut"], [[e(m[0]), e(m[1]), e(m[2]), e(ST.get(m[3], m[3]))] for m in D["manques"]])

# une capture par rôle (démo de l'accueil jouée, ordinateur), plus l'accueil et le + du Dock
choix = ["PUBLIC__LE-COEUR__accueil__arrivee__ORDINATEUR", "PUBLIC__LE-COEUR__je-suis__liste-ouverte__ORDINATEUR", "PUBLIC__PLUS__carte-actions__ouvert__ORDINATEUR"] + \
        [f"{r['id']}__LE-COEUR__demo-je-suis__demo-terminee__ORDINATEUR" for r in D["roles"]]
par_id = {x["id"]: x for x in D["ecrans"]}
galerie = "".join(
    f'<figure><a href="/atlas/{e(par_id[c]["img"])}"><img loading="lazy" src="/atlas/{e(par_id[c]["img"])}" alt="{e(par_id[c]["titre"] + " · " + par_id[c]["roleNom"])}"></a>'
    f'<figcaption><strong>{e(par_id[c]["roleNom"])}</strong> · {e(par_id[c]["titre"])} · {e(par_id[c]["etatNom"])}</figcaption></figure>'
    for c in choix if c in par_id)

page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Étude de convergence · AIME</title>
<meta name="description" content="Audit des parcours, rôles et écrans du Dock d'AIME, et dossier de conception du moteur universel et du Dock unique (24 octobre 2026).">
<meta name="theme-color" content="#0A0A0C">
<meta name="robots" content="noindex">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" href="data:,">
<link rel="preload" href="/fonts/InterVariable-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/CalSans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/travaux/travaux.css">
<link rel="stylesheet" href="/dock/dock.css">
<style>
.texte{{max-width:880px;display:grid;gap:12px;padding-bottom:40px}}
.texte h2,.texte h3{{scroll-margin-top:96px}}
.texte h2{{margin:40px 0 4px;font:600 26px/1.2 var(--titre)}}
.texte h3{{margin:22px 0 2px;font:600 18px/1.3 var(--ui)}}
.texte p,.texte li{{color:var(--doux);line-height:1.65;margin:0}}
.texte ul,.texte ol{{margin:0;padding-left:22px;display:grid;gap:6px}}
.texte strong{{color:var(--encre);font-weight:600}}
.texte a{{color:var(--encre)}}
.texte code{{font:13px ui-monospace,Menlo,Consolas,monospace;color:var(--encre);overflow-wrap:anywhere}}
.tab{{overflow-x:auto;border:1px solid var(--ligne);border-radius:12px;margin:6px 0}}
.tab table{{border-collapse:collapse;width:100%;font-size:14px;min-width:560px}}
.tab th,.tab td{{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--ligne);color:var(--doux);line-height:1.5}}
.tab th{{color:var(--encre);font-weight:600;background:var(--carte)}}
.tab tr:last-child td{{border-bottom:0}}
.sommaire{{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 0}}
.galerie{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}}
.galerie figure{{margin:0;display:grid;gap:6px}}
.galerie img{{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:10px;border:1px solid var(--ligne);background:var(--carte)}}
.galerie figcaption{{font-size:13px;color:var(--doux)}}
</style>
<link rel="stylesheet" href="/nav/pied-legal.css">
</head>
<body>
<a class="evite" href="#contenu">Aller au contenu</a>
<header class="tete"><a class="mk" href="/" aria-label="AIME, Page Zéro">AIME<sup>®</sup></a><nav aria-label="Compte"><a href="/compte/">Mon compte</a><a class="b" href="/contact/">Nous écrire</a></nav></header>
<main id="contenu" tabindex="-1">
<section class="intro"><p class="k">Étude · 24 octobre 2026</p><h1>Un seul Dock pour tous les rôles&nbsp;?</h1>
<p>Audit des parcours, rôles et écrans du Dock de lemondeaime.com ({D["stats"]["captures"]} captures, {D["stats"]["roles"]} rôles, {len(D["anomalies"])} anomalies publiées), puis dossier de conception du moteur universel. Aucune modification du site n'a été faite pendant l'audit.</p>
<p class="sommaire"><a class="b" href="#synthèse">Lire la synthèse</a><a class="b" href="/etude/dossier.md">Texte brut (Markdown)</a><a class="b" href="#annexe">Résultats de l'audit</a></p></section>
<article class="texte">
{corps}
<h2 id="annexe">Annexe A · Les onze rôles audités</h2>
<p>Ce que chaque place de « Je suis… » ouvre réellement sur l'accueil : la démo, le Dock montré, le bouton, et ce qui manque.</p>
{roles}
<h2>Annexe B · Contrôle fonctionnel</h2>
<p>Propagation et cloisonnement des données, testés dans les démonstrations (données fictives, rien envoyé au serveur de production).</p>
{controle}
<h2>Annexe C · Anomalies</h2>
<p>{e(D.get("note_securite", ""))}</p>
{anom}
<h2>Annexe D · Fonctions présentes, écrans manquants</h2>
{manques}
<h2>Annexe E · Captures</h2>
<p>Une sélection : l'accueil, la liste « Je suis… », le + du Dock, puis la démo jouée pour chacun des onze rôles (ordinateur). L'Atlas complet est réservé à l'administration.</p>
<div class="galerie">{galerie}</div>
</article>
</main>
<nav class="pied-legal" aria-label="Informations légales"><a href="/tarifs/">Tarifs</a><span aria-hidden="true">·</span><a href="/mentions-legales/">Mentions légales</a><span aria-hidden="true">·</span><a href="/confidentialite/">Confidentialité</a><span aria-hidden="true">·</span><a href="/contact/">Contact</a></nav>
<footer class="pied"><a href="/">← Page Zéro</a><span>AIME®</span></footer>
<script src="/dock/modele.js"></script>
<script src="/dock/dock.js"></script>
<script src="/dock/plus.js"></script>
<div id="dock-site"></div>
<script>(function(){{var el=document.getElementById('dock-site');if(el&&window.AIMEDock&&window.AIMEDockVue){{AIMEDockVue.poser(el,AIMEDock.composer({{}}),{{mode:'page',id:'dock-site'}});if(window.AIMEPlus)AIMEPlus.brancher(el);document.body.classList.add('avec-dock')}}}})();</script>
</body>
</html>
"""
(R / "etude/index.html").write_text(page, encoding="utf-8")
print("etude/index.html :", len(page) // 1024, "Ko")
