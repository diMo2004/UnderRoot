export type CitationStyle = "apa" | "ieee" | "mla" | "unknown";

/**
 * Detect citation style from a "template" string.
 * This can be:
 * - pasted sample references section
 * - a doc template name
 * - a snippet containing "References" examples
 *
 * Heuristics (simple but practical):
 * - IEEE: lots of [1], [2] patterns
 * - APA: "(2020)." patterns + "&" + sentence case titles
 * - MLA: quoted titles "..." and "Accessed" or "Web."
 */
export function detectCitationStyleFromTemplate(template?: string): CitationStyle {
  if (!template) return "unknown";
  const t = template.toLowerCase();
  if (t.includes("apa")) return "apa";
  if (t.includes("ieee")) return "ieee";
  if (t.includes("mla")) return "mla";

  // IEEE: numbered brackets
  if (/\[\s*\d+\s*\]/.test(template)) return "ieee";

  // APA: year in parentheses followed by dot: (2020).
  if (/\(\s*(19|20)\d{2}\s*\)\./.test(template) || /\.\s*\(\s*(19|20)\d{2}\s*\)\./.test(template)) {
    return "apa";
  }

  // MLA: often includes quoted titles and "Accessed"
  if (/\baccessed\b/.test(t) || /"\s*[^"]+?\s*"\./.test(template)) {
    return "mla";
  }

  return "unknown";
}