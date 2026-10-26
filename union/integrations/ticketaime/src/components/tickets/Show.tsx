import type { CSSProperties } from "react";
import { fit, u } from "../../lib/units";
import { F } from "../../lib/fonts";
import { perfMask } from "../../lib/masks";
import { clip, paperBg } from "../../lib/paper";
import { useUid } from "../../lib/useUid";
import { Barcode } from "../primitives";

const nowrap: CSSProperties = { whiteSpace: "nowrap" };

/* ------------------------------------------------------------------ */
/*  1. Billet d'opéra / de ballet (personnalisable)                     */
/* ------------------------------------------------------------------ */

export interface OperaProps {
  personnalisation?: Record<string, string>;
  tone?: "ivory" | "black" | "rose";
  venue?: string;
  title?: string;
  composer?: string;
  date?: string;
  heure?: string;
  place?: string;
  prix?: string;
  holder?: string;
  number?: string;
}

export function OperaTicket({
  personnalisation = {},
  tone = "ivory",
  venue = "OPÉRA NATIONAL",
  title = "La Traviata",
  composer = "Opéra en trois actes · Giuseppe Verdi",
  date = "SAM 12 OCT.",
  heure = "20H00",
  place = "LOGE 3 · FAUTEUIL 14",
  prix = "45 €",
  holder = "",
  number = "1847",
}: OperaProps) {
  venue = personnalisation.venue ?? venue;
  title = personnalisation.title ?? title;
  composer = personnalisation.composer ?? composer;
  date = personnalisation.date ?? date;
  heure = personnalisation.heure ?? heure;
  place = personnalisation.place ?? place;
  prix = personnalisation.prix ?? prix;
  holder = personnalisation.holder ?? holder;
  number = personnalisation.number ?? number;
  if (["ivory", "black", "rose"].includes(personnalisation.tone)) tone = personnalisation.tone as typeof tone;
  const t = {
    ivory: { paper: paperBg("#f8f1df", "#f0e6cc", "#e1d3ae"), ink: "#6b1d2a", title: "#3a1219", dark: false },
    black: { paper: paperBg("#211e23", "#161317", "#0d0b0e"), ink: "#d9b866", title: "#f3e1a8", dark: true },
    rose: { paper: paperBg("#f5e0df", "#edcccc", "#dfb3b6"), ink: "#6a2b47", title: "#4a1a33", dark: false },
  }[tone];
  const cells: [string, string, number][] = [
    ["DATE", date, 1],
    ["HEURE", heure, 0.8],
    ["PLACE", place, 2.1],
  ];
  return (
    <div
      className={`paper ${t.dark ? "paper-dark" : ""} w-full h-full grid`}
      style={{ ...t.paper, ...perfMask(["80%"], u(14)), gridTemplateColumns: "minmax(0,80fr) minmax(0,20fr)" } as CSSProperties}
    >
      <div className="relative" style={{ color: t.ink }}>
        <div className="absolute ink-worn" style={{ inset: u(11), border: `${u(4)} double ${t.ink}` }} />
        <div className="absolute inset-0 flex flex-col justify-between ink-worn" style={{ padding: `${u(26)} ${u(32)} ${u(24)}`, lineHeight: 1 }}>
          <div className="text-center">
            <div style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(fit(venue, 17, 18)), letterSpacing: u(7), ...clip }}>{venue}</div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: F.script, fontSize: u(fit(title, 72, 11)), color: t.title, lineHeight: 1, ...nowrap }}>{title}</div>
            <div style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: u(fit(composer, 14, 44)), marginTop: u(4), ...clip }}>{composer}</div>
          </div>
          <div className="flex" style={{ gap: u(16), borderTop: `${u(1.5)} solid ${t.ink}`, paddingTop: u(10) }}>
            {cells.map(([l, v, f]) => (
              <div key={l} style={{ flex: f, minWidth: 0 }}>
                <div style={{ fontFamily: F.cinzel, fontWeight: 500, fontSize: u(9.5), letterSpacing: u(3), marginBottom: u(5) }}>{l}</div>
                <div style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(fit(v, 15, l === "PLACE" ? 22 : 11)), letterSpacing: u(1.2), color: t.title, ...clip }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center ink-worn"
        style={{ borderLeft: `${u(2.5)} dashed ${t.ink}`, color: t.ink, lineHeight: 1, padding: `${u(10)} ${u(6)}` }}
      >
        <span style={{ fontFamily: F.cinzel, fontWeight: 500, fontSize: u(9.5), letterSpacing: u(3) }}>N°</span>
        <span style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(26), marginTop: u(4), color: t.title }}>{number}</span>
        <span style={{ fontSize: u(18), margin: `${u(14)} 0`, opacity: 0.8 }}>❦</span>
        <span style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(fit(prix, 30, 4)), color: t.title }}>{prix}</span>
        <span style={{ fontFamily: F.type, fontSize: u(9), letterSpacing: u(1.5), marginTop: u(12), opacity: 0.85, textTransform: "uppercase", ...clip }}>
          {holder || "À CONSERVER"}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Cabaret « Le Chat Noir »                                         */
/* ------------------------------------------------------------------ */

export function CabaretTicket() {
  const black = "#17120e";
  return (
    <div
      className="paper edge-notch w-full h-full"
      style={{ ...paperBg("#f3b94f", "#eaa334", "#d78a22"), "--notch": u(14) } as CSSProperties}
    >
      <div
        className="absolute inset-0 rays"
        style={
          {
            "--rx": "30%",
            "--ry": "46%",
            "--rc": "rgba(255,240,170,0.38)",
            WebkitMaskImage: "radial-gradient(circle at 30% 46%, #000, transparent 70%)",
            maskImage: "radial-gradient(circle at 30% 46%, #000, transparent 70%)",
          } as CSSProperties
        }
      />
      <div className="absolute ink-worn" style={{ inset: u(10), border: `${u(5)} solid ${black}` }} />
      <div className="absolute inset-0 ink-worn" style={{ padding: `${u(28)} ${u(28)} ${u(24)}`, color: black }}>
        <div className="flex items-center" style={{ height: u(158), gap: u(8) }}>
          <svg aria-hidden="true" viewBox="0 0 120 120" style={{ width: u(116), height: u(116), flex: "none" }}>
            <path d="M24 46L20 8L52 30Z M96 46L100 8L68 30Z" fill={black} />
            <circle cx="60" cy="68" r="42" fill={black} />
            <g fill="#f6d33a">
              <ellipse cx="44" cy="62" rx="10" ry="7" transform="rotate(-14 44 62)" />
              <ellipse cx="76" cy="62" rx="10" ry="7" transform="rotate(14 76 62)" />
            </g>
            <ellipse cx="44" cy="62" rx="2.6" ry="6.5" fill={black} />
            <ellipse cx="76" cy="62" rx="2.6" ry="6.5" fill={black} />
            <path d="M54 76L66 76L60 83Z" fill="#e76e6a" />
            <path d="M60 83V90 M60 90Q52 96 46 92 M60 90Q68 96 74 92" stroke="#e8e0cf" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M6 72H34 M6 82L34 78 M114 72H86 M114 82L86 78" stroke={black} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ lineHeight: 0.88 }}>
            <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(10.5), letterSpacing: u(3.5), marginBottom: u(8), ...nowrap }}>CABARET ARTISTIQUE</div>
            <div style={{ fontFamily: F.display, fontSize: u(60), ...nowrap }}>LE CHAT</div>
            <div style={{ fontFamily: F.display, fontSize: u(60), color: "#f9ecc8", WebkitTextStroke: `${u(2)} ${black}`, ...nowrap }}>NOIR</div>
          </div>
        </div>
        <div
          className="text-center"
          style={{ background: black, color: "#f6e7c4", fontFamily: F.cond, fontWeight: 500, fontSize: u(12.5), letterSpacing: u(2.4), padding: `${u(9)} ${u(8)}`, marginTop: u(6), ...nowrap }}
        >
          MONTMARTRE · REVUE &amp; FRENCH CANCAN · 21H
        </div>
        <div className="flex justify-between" style={{ fontFamily: F.type, fontSize: u(11), letterSpacing: u(2), marginTop: u(10) }}>
          <span>ENTRÉE + 1 CONSOMMATION</span>
          <span>N° 2209</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Grand Cirque                                                     */
/* ------------------------------------------------------------------ */

export function CircusTicket() {
  const red = "#c2392f";
  const cream = "#f4e8c8";
  const slices = Array.from({ length: 8 }, (_, i) => {
    const x1 = 20 + i * 25;
    return `M120 12 L${x1} 62 L${x1 + 25} 62Z`;
  });
  return (
    <div
      className="paper edge-notch w-full h-full"
      style={{ ...paperBg("#f5e9c9", "#ecdaae", "#d9c28b"), "--notch": u(15) } as CSSProperties}
    >
      <div className="absolute ink-worn" style={{ inset: u(10), border: `${u(3)} solid ${red}` }} />
      <div className="absolute inset-0 flex flex-col items-center ink-worn" style={{ padding: `${u(22)} ${u(24)} ${u(34)}` }}>
        <svg aria-hidden="true" viewBox="0 0 240 110" style={{ width: u(230), height: u(105) }}>
          {slices.map((d, i) => (
            <path key={i} d={d} fill={i % 2 ? cream : red} stroke={red} strokeWidth="1" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx={32.5 + i * 25} cy="62" r="12.5" fill={i % 2 ? cream : red} stroke={red} strokeWidth="1" />
          ))}
          <g>
            {Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={32.5 + i * 25} y="62" width="25" height="42" fill={i % 2 ? cream : red} opacity="0.9" />
            ))}
          </g>
          <path d="M105 104V84Q120 68 135 84V104Z" fill="#3a1a14" />
          <path d="M120 12V0M120 0L138 5L120 10Z" stroke={red} strokeWidth="2" fill={red} />
          <path d="M8 105H232" stroke={red} strokeWidth="2.5" />
        </svg>
        <div className="text-center" style={{ color: red, lineHeight: 1, marginTop: u(8) }}>
          <div style={{ fontFamily: F.western, fontSize: u(36), ...nowrap }}>GRAND CIRQUE</div>
          <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(22), letterSpacing: u(14), marginTop: u(6), paddingLeft: u(14) }}>LUMIÈRE</div>
          <div style={{ fontFamily: F.type, fontSize: u(11.5), letterSpacing: u(2), marginTop: u(10), color: "#5a3a22", ...nowrap }}>
            ENTRÉE ENFANT · 1 PLACE · 15H
          </div>
        </div>
      </div>
      <div
        className="absolute left-0 right-0"
        style={{ bottom: u(10), left: u(10), right: u(10), height: u(14), background: `repeating-linear-gradient(90deg, ${red} 0 ${u(16)}, ${cream} ${u(16)} ${u(32)})` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Le Grand Illusionniste                                           */
/* ------------------------------------------------------------------ */

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <span className="absolute" style={{ left: `${x}%`, top: `${y}%`, fontSize: u(s), color: "#f3d77a", opacity: 0.9, lineHeight: 1 }}>
      ✦
    </span>
  );
}

export function MagicTicket() {
  const gold = "#e8c35f";
  return (
    <div
      className="paper paper-dark edge-notch w-full h-full"
      style={{ ...paperBg("#4f2d80", "#3b1e60", "#2a1346"), "--notch": u(24) } as CSSProperties}
    >
      <div
        className="absolute inset-0 rays"
        style={
          {
            "--rx": "50%",
            "--ry": "47%",
            "--rc": "rgba(232,195,95,0.18)",
            WebkitMaskImage: "radial-gradient(circle at 50% 47%, #000, transparent 70%)",
            maskImage: "radial-gradient(circle at 50% 47%, #000, transparent 70%)",
          } as CSSProperties
        }
      />
      <div className="absolute ink-worn" style={{ inset: u(12), border: `${u(2.5)} solid ${gold}` }} />
      <div className="absolute" style={{ inset: u(19), border: `${u(1)} solid ${gold}`, opacity: 0.55 }} />
      {[[14, 30, 18], [80, 24, 24], [20, 54, 14], [76, 58, 16], [50, 14, 12], [88, 44, 12]].map(([x, y, s], i) => (
        <Sparkle key={i} x={x} y={y} s={s} />
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-between text-center ink-worn" style={{ padding: `${u(38)} ${u(26)} ${u(36)}`, color: gold, lineHeight: 1 }}>
        <div>
          <div style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(16), letterSpacing: u(6), paddingLeft: u(6) }}>LE GRAND</div>
          <div style={{ fontFamily: F.deco, fontSize: u(31), letterSpacing: u(1), marginTop: u(8), color: "#f6e0a0", ...nowrap }}>ILLUSIONNISTE</div>
        </div>
        <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: u(190), height: u(190) }}>
          <ellipse cx="38" cy="30" rx="5.5" ry="19" transform="rotate(-12 38 30)" fill="#f4ecdd" />
          <ellipse cx="62" cy="30" rx="5.5" ry="19" transform="rotate(12 62 30)" fill="#f4ecdd" />
          <ellipse cx="38" cy="30" rx="2.4" ry="13" transform="rotate(-12 38 30)" fill="#e9b3bd" />
          <ellipse cx="62" cy="30" rx="2.4" ry="13" transform="rotate(12 62 30)" fill="#e9b3bd" />
          <path d="M26 82 L28 44 Q28 40 32 40 H68 Q72 40 72 44 L74 82Z" fill="#100a16" />
          <rect x="27" y="68" width="46" height="9" fill="#b8352b" />
          <ellipse cx="50" cy="82" rx="42" ry="8.5" fill="#100a16" />
          <ellipse cx="50" cy="40" rx="22" ry="4" fill="#241833" />
          <path d="M80 56 L96 36" stroke="#f4ecdd" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M92 40 L96 36" stroke="#100a16" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ width: "100%" }}>
          <div style={{ fontFamily: F.script, fontSize: u(42), color: "#f6e0a0" }}>Abracadabra</div>
          <div style={{ height: u(1.5), background: gold, opacity: 0.6, margin: `${u(8)} 0 ${u(10)}` }} />
          <div style={{ fontFamily: F.cond, fontWeight: 500, fontSize: u(12.5), letterSpacing: u(3.5), ...nowrap }}>MAGIE · MYSTÈRE · MERVEILLES</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: u(12), letterSpacing: u(2), marginTop: u(8), opacity: 0.85 }}>SOIRÉE UNIQUE · 21H · PLACE 14</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Festival de jazz (personnalisable)                               */
/* ------------------------------------------------------------------ */

export interface JazzProps {
  titre?: string;
  lieu?: string;
  date?: string;
  heure?: string;
  place?: string;
  holder?: string;
  number?: string;
}

export function JazzFestivalTicket({
  titre = "NUIT DU JAZZ",
  lieu = "PARC DE LA VILLETTE",
  date = "14 · 15 · 16 JUIN",
  heure = "21H",
  place = "FOSSE",
  holder = "",
  number = "00718",
}: JazzProps) {
  const brown = "#4e2916";
  const orange = "#d9622b";
  const teal = "#2f6f6b";
  return (
    <div
      className="paper w-full h-full grid"
      style={{ ...paperBg("#f0deb2", "#e7d09c", "#d4ba7e"), ...perfMask(["82%"], u(14)), gridTemplateColumns: "minmax(0,82fr) minmax(0,18fr)" } as CSSProperties}
    >
      <div className="relative overflow-hidden">
        {/* setting sun */}
        <div
          className="absolute"
          style={{
            left: u(-24),
            bottom: u(26),
            width: u(190),
            height: u(95),
            borderRadius: `${u(190)} ${u(190)} 0 0`,
            background: `repeating-radial-gradient(circle at 50% 100%, ${orange} 0 ${u(16)}, #e7d09c ${u(16)} ${u(24)})`,
          }}
        />
        <div className="absolute" style={{ left: 0, right: 0, bottom: 0, height: u(26) }}>
          {[orange, brown, teal].map((c, i) => (
            <div key={i} style={{ height: u(8.6), background: c }} />
          ))}
        </div>
        <div className="absolute ink-worn" style={{ left: u(176), right: u(22), top: u(26), color: brown, lineHeight: 1 }}>
          <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(12), letterSpacing: u(7), ...nowrap }}>FESTIVAL INTERNATIONAL</div>
          <div style={{ fontFamily: F.bebas, fontSize: u(fit(titre, 78, 10)), letterSpacing: u(3), marginTop: u(8), color: "#3a1c0d", textTransform: "uppercase", ...clip }}>{titre}</div>
          <div style={{ fontFamily: F.bebas, fontSize: u(fit(date, 34, 17)), letterSpacing: u(3.5), marginTop: u(4), color: orange, ...clip }}>{date}</div>
          <div className="flex" style={{ gap: u(20), marginTop: u(14), borderTop: `${u(2)} solid ${brown}`, paddingTop: u(10) }}>
            {[["LIEU", lieu], ["HEURE", heure], ["ENTRÉE", place]].map(([l, v], i) => (
              <div key={l} style={{ flex: i === 0 ? 2.4 : 1.05, minWidth: 0 }}>
                <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(10), letterSpacing: u(3), marginBottom: u(4) }}>{l}</div>
                <div style={{ fontFamily: F.cond, fontWeight: 700, fontSize: u(fit(v, 16, i === 0 ? 17 : 8)), letterSpacing: u(0.8), textTransform: "uppercase", ...clip }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center ink-worn" style={{ borderLeft: `${u(2.5)} dashed ${brown}`, color: brown, lineHeight: 1 }}>
        <span className="vtext-up" style={{ fontFamily: F.stat, fontSize: u(23), letterSpacing: u(4), ...nowrap }}>N° {number}</span>
        <span style={{ fontFamily: F.type, fontSize: u(9), letterSpacing: u(1.5), marginTop: u(12), textTransform: "uppercase", ...clip }}>{holder || "1 JOUR"}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  6. Théâtre des Deux Masques                                         */
/* ------------------------------------------------------------------ */

function TheatreMask({ happy, size, rotate, uid }: { happy: boolean; size: number; rotate: number; uid: string }) {
  const navy = "#1f355c";
  return (
    <svg aria-hidden="true" viewBox="0 0 100 120" style={{ width: u(size), height: u(size * 1.2), transform: `rotate(${rotate}deg)` }}>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc8c" />
          <stop offset="1" stopColor="#c9a04a" />
        </linearGradient>
      </defs>
      <path d="M8 14Q50 0 92 14Q98 60 80 92Q50 124 20 92Q2 60 8 14Z" fill={`url(#${uid}-g)`} />
      {happy ? (
        <g fill={navy}>
          <path d="M22 48Q33 34 46 48Q34 43 22 48Z" />
          <path d="M54 48Q67 34 78 48Q66 43 54 48Z" />
          <path d="M26 72Q50 106 74 72Q50 88 26 72Z" />
        </g>
      ) : (
        <g fill={navy}>
          <path d="M22 40Q34 54 46 42Q34 48 22 40Z" />
          <path d="M54 42Q66 54 78 40Q66 48 54 42Z" />
          <path d="M28 94Q50 66 72 94Q50 80 28 94Z" />
        </g>
      )}
    </svg>
  );
}

export function MasksTicket() {
  const uid = useUid("mk");
  const gold = "#e3c06c";
  return (
    <div
      className="paper paper-dark edge-notch w-full h-full"
      style={{ ...paperBg("#2f4d7e", "#243d68", "#182a4c"), "--notch": u(18) } as CSSProperties}
    >
      <div className="absolute ink-worn" style={{ inset: u(10), border: `${u(2.5)} solid ${gold}` }} />
      <div className="absolute" style={{ inset: u(17), border: `${u(1)} solid ${gold}`, opacity: 0.55 }} />
      <div className="absolute inset-0 flex flex-col items-center justify-between text-center ink-worn" style={{ padding: `${u(28)} ${u(24)} ${u(26)}`, color: gold, lineHeight: 1 }}>
        <div style={{ fontFamily: F.cinzel, fontWeight: 700, fontSize: u(14), letterSpacing: u(5), ...nowrap }}>THÉÂTRE DES DEUX MASQUES</div>
        <div className="flex items-center justify-center" style={{ gap: u(-8), marginTop: u(6) }}>
          <TheatreMask happy size={92} rotate={-12} uid={`${uid}a`} />
          <TheatreMask happy={false} size={92} rotate={12} uid={`${uid}b`} />
        </div>
        <div>
          <div style={{ fontFamily: F.playfair, fontStyle: "italic", fontWeight: 700, fontSize: u(26), color: "#f6e3ac" }}>Comédie en trois actes</div>
          <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(12), letterSpacing: u(4), marginTop: u(10), ...nowrap }}>
            SOIR · 20H30 · ORCHESTRE
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  7. Plan de salle                                                    */
/* ------------------------------------------------------------------ */

export function SeatPlanTicket() {
  const ink = "#23211d";
  const red = "#c8402f";
  const rows = "ABCDEFG".split("");
  return (
    <div
      className="paper w-full h-full"
      style={{ ...paperBg("#f0ebdd", "#e8e2d1", "#d8d1bc"), ...perfMask(["65%"], u(12)) } as CSSProperties}
    >
      <div className="absolute ink-worn" style={{ left: 0, top: 0, bottom: 0, width: "65%", padding: `${u(20)} ${u(22)}`, color: ink }}>
        <div
          className="mx-auto flex items-center justify-center"
          style={{ width: "74%", height: u(22), background: ink, color: "#efe8d6", borderRadius: `0 0 ${u(50)} ${u(50)} / 0 0 ${u(16)} ${u(16)}`, fontFamily: F.cond, fontWeight: 600, fontSize: u(11.5), letterSpacing: u(9), paddingLeft: u(9) }}
        >
          SCÈNE
        </div>
        <div className="flex flex-col" style={{ gap: u(5), marginTop: u(22) }}>
          {rows.map((r, ri) => (
            <div key={r} className="flex items-center" style={{ gap: u(4) }}>
              <span style={{ width: u(14), fontFamily: F.mono, fontWeight: 700, fontSize: u(10) }}>{r}</span>
              {Array.from({ length: 12 }).map((_, ci) => {
                const hit = ri === 3 && ci === 8;
                return (
                  <span
                    key={ci}
                    style={{
                      width: u(15),
                      height: u(15),
                      borderRadius: `${u(4)} ${u(4)} ${u(2)} ${u(2)}`,
                      background: hit ? red : "rgba(35,33,29,0.18)",
                      border: hit ? `${u(2)} solid ${ink}` : `${u(1)} solid rgba(35,33,29,0.35)`,
                      marginRight: ci === 5 ? u(10) : 0,
                      boxShadow: hit ? `0 0 0 ${u(3)} rgba(200,64,47,0.28)` : "none",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.type, fontSize: u(9.5), letterSpacing: u(2), marginTop: u(14), opacity: 0.8 }}>
          ● VOTRE PLACE · PLAN NON CONTRACTUEL
        </div>
      </div>
      <div className="absolute ink-worn flex flex-col justify-center" style={{ right: 0, top: 0, bottom: 0, width: "35%", padding: `0 ${u(14)} 0 ${u(24)}`, color: ink, lineHeight: 1 }}>
        <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(10.5), letterSpacing: u(4) }}>PLACEMENT</div>
        <div style={{ fontFamily: F.bebas, fontSize: u(38), letterSpacing: u(1.5), margin: `${u(6)} 0 ${u(14)}` }}>ORCHESTRE</div>
        <div className="flex" style={{ gap: u(14) }}>
          <div>
            <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(10), letterSpacing: u(3) }}>RANG</div>
            <div style={{ fontFamily: F.bebas, fontSize: u(54), color: red, marginTop: u(4) }}>D</div>
          </div>
          <div>
            <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: u(10), letterSpacing: u(3) }}>PLACE</div>
            <div style={{ fontFamily: F.bebas, fontSize: u(54), color: red, marginTop: u(4) }}>9</div>
          </div>
        </div>
        <div style={{ fontFamily: F.type, fontSize: u(10), letterSpacing: u(1.5), marginTop: u(14) }}>ENTRÉE PORTE B</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  8. Pass backstage                                                   */
/* ------------------------------------------------------------------ */

const SLOT_MASK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='350' viewBox='0 0 240 350'><path fill='black' fill-rule='evenodd' d='M0 0H240V350H0Z M88 16 h64 a8 8 0 0 1 8 8 v0 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 v0 a8 8 0 0 1 8 -8z'/></svg>\")";

export function BackstagePass() {
  const pink = "#ff3d81";
  const yellow = "#ffd23f";
  const cyan = "#2de2e6";
  return (
    <div
      className="paper paper-dark w-full h-full"
      style={{
        ...paperBg("#1f1c22", "#121014", "#0a090c"),
        borderRadius: u(14),
        WebkitMask: SLOT_MASK,
        mask: SLOT_MASK,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
      } as CSSProperties}
    >
      <div
        className="absolute"
        style={{ left: 0, right: 0, top: u(46), height: u(60), background: `repeating-linear-gradient(-45deg, ${pink} 0 ${u(14)}, ${yellow} ${u(14)} ${u(28)}, ${cyan} ${u(28)} ${u(42)})`, opacity: 0.95 }}
      />
      <div className="absolute inset-0 flex flex-col items-center text-center ink-worn" style={{ padding: `${u(118)} ${u(18)} ${u(22)}`, lineHeight: 0.9 }}>
        <div style={{ fontFamily: F.bebas, fontSize: u(92), color: "#f4eee0", letterSpacing: u(2), textShadow: `${u(4)} ${u(4)} 0 ${pink}` }}>TOUS</div>
        <div style={{ fontFamily: F.bebas, fontSize: u(92), color: yellow, letterSpacing: u(2), textShadow: `${u(4)} ${u(4)} 0 ${pink}` }}>ACCÈS</div>
        <div
          style={{ marginTop: u(12), background: yellow, color: "#121014", fontFamily: F.stat, fontSize: u(19), letterSpacing: u(6), padding: `${u(5)} ${u(14)} ${u(4)} ${u(20)}`, ...nowrap }}
        >
          ARTISTE · STAFF
        </div>
        <div style={{ fontFamily: F.cond, fontWeight: 500, fontSize: u(11.5), letterSpacing: u(2.4), marginTop: u(12), color: cyan, ...nowrap }}>
          NUIT ÉLECTRIQUE · TOUR 84
        </div>
        <div style={{ height: u(34), width: "78%", marginTop: "auto", color: "#f1ead9", opacity: 0.92 }}>
          <Barcode seed={84} bars={46} />
        </div>
      </div>
    </div>
  );
}
