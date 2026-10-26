import type { CSSProperties } from "react";

/** Three-stop paper tint (light → base → shade) used by every ticket stock. */
export const paperBg = (light: string, base: string, shade: string): CSSProperties => ({
  backgroundColor: base,
  backgroundImage: `linear-gradient(160deg, ${light} 0%, ${base} 60%, ${shade} 100%)`,
});

/** Single-line text that truncates with an ellipsis instead of breaking the layout. */
export const clip: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};
