import type { CSSProperties } from "react";
import { u } from "../lib/units";

/* ------------------------------------------------------------------ */
/*  Barcode                                                            */
/* ------------------------------------------------------------------ */

interface BarcodeProps {
  seed?: number;
  bars?: number;
  vertical?: boolean;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** Deterministic pseudo-random generator so each barcode looks the same across renders. */
function mulberry(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function Barcode({
  seed = 1,
  bars = 60,
  vertical = false,
  color = "currentColor",
  className,
  style,
}: BarcodeProps) {
  const rnd = mulberry(seed);
  const rects: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < bars; i++) {
    const w = [1, 1, 1.5, 2, 3, 1][Math.floor(rnd() * 6)];
    const gap = [1, 1.5, 2][Math.floor(rnd() * 3)];
    rects.push({ x, w });
    x += w + gap;
  }
  const total = x;
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      viewBox={vertical ? `0 0 100 ${total}` : `0 0 ${total} 100`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
    >
      {rects.map((r, i) =>
        vertical ? (
          <rect key={i} x={0} y={r.x} width={100} height={r.w} fill={color} />
        ) : (
          <rect key={i} x={r.x} y={0} width={r.w} height={100} fill={color} />
        ),
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Plane silhouettes                                                  */
/* ------------------------------------------------------------------ */

interface PlaneProps {
  className?: string;
  style?: CSSProperties;
  color?: string;
  /** "jet" = sleek airliner, "prop" = four-engine propeller liner */
  variant?: "jet" | "prop";
}

export function Plane({ className, style, color = "currentColor", variant = "jet" }: PlaneProps) {
  if (variant === "prop") {
    return (
      <svg aria-hidden="true" viewBox="0 0 120 100" className={className} style={style} fill={color}>
        {/* fuselage */}
        <path d="M60 4c3 0 5 6 5.5 14l1.5 30-1 32-1.2 10h-9.6L54 80l-1-32 1.5-30C55 10 57 4 60 4z" />
        {/* wings */}
        <path d="M60 46 116 60v6l-50-5-6 0.5-6-0.5-50 5v-6z" />
        {/* engines */}
        <path d="M30 50h7v14h-7zM83 50h7v14h-7zM14 54h6v10h-6zM100 54h6v10h-6z" />
        {/* props */}
        <path d="M22 50h22v2H22zM76 50h22v2H76zM10 55h14v1.5H10zM96 55h14v1.5H96z" opacity="0.8" />
        {/* tail */}
        <path d="M60 78 80 90v4l-20-6-20 6v-4z" />
        <path d="M58 70h4v22h-4z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={className} style={style} fill={color}>
      <path d="M50 2c3 0 5 6 5 14l1 24 36 22v6L56 58l-1 22 11 8v4l-16-4-16 4v-4l11-8-1-22L8 68v-6l36-22 1-24c0-8 2-14 5-14z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular postmark / seal                                           */
/* ------------------------------------------------------------------ */

interface PostmarkProps {
  size: number;
  color?: string;
  top: string;
  bottom?: string;
  center?: string[];
  style?: CSSProperties;
  className?: string;
  stroke?: number;
  worn?: boolean;
  id: string;
}

export function Postmark({
  size,
  color = "currentColor",
  top,
  bottom,
  center = [],
  style,
  className,
  stroke = 2,
  worn = true,
  id,
}: PostmarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className={`${className ?? ""} ${worn ? "ink-worn" : ""}`}
      style={{ width: u(size), height: u(size), ...style }}
    >
      <defs>
        <path id={`${id}-top`} d="M50 50 m-36 0 a36 36 0 1 1 72 0" />
        <path id={`${id}-bot`} d="M50 50 m-36 0 a36 36 0 1 0 72 0" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke={color} strokeWidth={stroke} />
      <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth={stroke * 0.7} />
      <text
        fill={color}
        fontSize="11"
        fontFamily="Courier Prime, monospace"
        fontWeight="700"
        letterSpacing="1.5"
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      {bottom && (
        <text
          fill={color}
          fontSize="9"
          fontFamily="Courier Prime, monospace"
          fontWeight="700"
          letterSpacing="1.5"
        >
          <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
      )}
      {center.map((line, i) => (
        <text
          key={line + i}
          x="50"
          y={50 + (i - (center.length - 1) / 2) * 11 + 3.5}
          textAnchor="middle"
          fill={color}
          fontSize="9.5"
          fontFamily="Courier Prime, monospace"
          fontWeight="700"
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Ruled lines (for blank labels)                                     */
/* ------------------------------------------------------------------ */

interface RulesProps {
  count: number;
  gap: number;
  color: string;
  thickness?: number;
  style?: CSSProperties;
  className?: string;
}

export function Rules({ count, gap, color, thickness = 1.5, style, className }: RulesProps) {
  return (
    <div className={className} style={{ display: "grid", rowGap: u(gap), ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: u(thickness), background: color, opacity: 0.85 }} />
      ))}
    </div>
  );
}
