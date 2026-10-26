/**
 * Every piece of ephemera is designed on a fixed pixel grid (its original
 * width/height in the source artwork). `u(n)` converts a design pixel value
 * into a length that scales with the ticket's rendered width, via the `--u`
 * custom property set by <Ticket /> (1 design px = 100cqw / designWidth).
 */
export const u = (n: number): string => `calc(${n} * var(--u))`;

/**
 * Shrinks a font size so that `text` still fits in roughly `maxChars`
 * characters at `base` size. Keeps user-provided text inside the ticket.
 */
export const fit = (text: string, base: number, maxChars: number): number =>
  Math.min(base, (base * maxChars) / Math.max(text.length, 1));
