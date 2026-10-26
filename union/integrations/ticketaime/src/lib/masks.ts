import type { CSSProperties } from "react";

/**
 * Tear-off perforation: semicircular notches cut out of the top and bottom
 * edges at each horizontal position in `xs` (e.g. ["77%"]). `r` is the notch
 * radius, expressed with the design-unit helper `u()`.
 */
export function perfMask(xs: string[], r: string): CSSProperties {
  const layers = xs
    .flatMap((x) => [
      `radial-gradient(circle at ${x} 0, transparent ${r}, #000 calc(${r} + 0.5px))`,
      `radial-gradient(circle at ${x} 100%, transparent ${r}, #000 calc(${r} + 0.5px))`,
    ])
    .join(",");
  return {
    WebkitMask: layers,
    mask: layers,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
  } as CSSProperties;
}
