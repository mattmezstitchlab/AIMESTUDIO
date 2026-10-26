import { useId } from "react";

/** A DOM-safe unique id (no colons) for SVG <defs> references. */
export function useUid(prefix = "u"): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}
