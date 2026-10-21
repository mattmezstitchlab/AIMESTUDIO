#!/usr/bin/env python3
"""Génère os/coque.css : les règles de la coque (fenêtres, dock, recherche, toutes les apps, orbe) extraites de os/os.css
et enfermées sous .os-coque, pour poser l'OS sur la Page Zéro sans toucher à ses styles. Relancer après toute modification de os.css."""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
src = re.sub(r'/\*.*?\*/', '', (R / 'os/os.css').read_text(), flags=re.S)
PREF = ('.fenetres', '.fen', '.dock', '.mini-orbe', '.ico', '.voile', '.palette', '.tout', '.b-fermer', '.orbe-pan', '.orbe-dit', '.orbe-sugg', '.orbe-pref', '.orbe-bulle', 'kbd', 'body.os-geste', '.sr')
def blocs(t):
    i, out = 0, []
    while i < len(t):
        j = t.find('{', i)
        if j < 0: break
        tete = t[i:j].strip(); n, k = 1, j + 1
        while n and k < len(t):
            n += {'{': 1, '}': -1}.get(t[k], 0); k += 1
        out.append((tete, t[j + 1:k - 1])); i = k
    return out
def portee(sel):
    s = sel.strip()
    if s.startswith('body.os-geste'): return s.replace('body.os-geste', 'body.os-geste .os-coque', 1)
    return '.os-coque ' + s
def regles(t):
    o = []
    for tete, corps in blocs(t):
        if tete.startswith('@keyframes'):
            o.append(tete.replace('@keyframes ', '@keyframes os-') + '{' + corps + '}')
        elif tete.startswith('@media'):
            dedans = regles(corps)
            if dedans: o.append(tete + '{' + dedans + '}')
        elif tete.startswith('@font-face'):
            continue
        elif tete == ':root':
            o.append('.os-coque{' + corps + '}')
        else:
            sels = [s for s in tete.split(',') if s.strip()]
            if sels and all(s.strip().startswith(PREF) for s in sels):
                o.append(','.join(portee(s) for s in sels) + '{' + corps + '}')
    return ''.join(o)
css = regles(src)
css = re.sub(r'animation:(\s*)(fen-in|halo|respire|tourne)\b', r'animation:\1os-\2', css)
css = re.sub(r'animation-name:(\s*)(fen-in|halo|respire|tourne)\b', r'animation-name:\1os-\2', css)
entete = '/* GÉNÉRÉ par scripts/coque-css.py depuis os/os.css : ne pas modifier à la main. */\n'
page = '''
/* la Page Zéro est le bureau : les fenêtres flottent au-dessus d'elle, le dock reste en bas */
.os-coque [hidden]{display:none!important}
.os-coque{--barre:0px;color:var(--ink);font-family:"Inter Variable",Inter,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.os-coque .fenetres{position:fixed;inset:0 0 calc(var(--dock) + 24px + env(safe-area-inset-bottom,0px)) 0;z-index:900;pointer-events:none}
.os-coque .fen{pointer-events:auto}
.os-coque .dock,.os-coque .voile,.os-coque .palette,.os-coque .tout,.os-coque .orbe-pan,.os-coque .orbe-bulle{z-index:1000}
.os-coque .tout{inset:24px max(16px,4vw) calc(var(--dock) + 24px)}
.os-coque .dock-accueil{width:46px;height:46px;border-radius:14px;border:1px solid var(--line2);background:transparent;color:var(--ink);font:700 13px/1 "Inter Variable",sans-serif;cursor:pointer}
.os-coque .dock-accueil:hover{border-color:var(--ink)}
body.os-page{padding-bottom:calc(var(--dock-h,72px) + 30px)}
'''
(R / 'os/coque.css').write_text(entete + css.replace('}', '}\n') + page)
print(len(css))
