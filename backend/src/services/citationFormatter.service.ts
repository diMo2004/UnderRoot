import type { CitationStyle } from "./citationStyleDetector.service";

export type CitationSource = {
  paper_id: string;         // required (Semantic Scholar/OpenAlex id etc.)
  title: string;            // required
  authors?: string[];       // ["First Last", ...]
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
};

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

export function formatBibliography(style: CitationStyle, source: CitationSource, ieeeIndex?: number): string {
  const title = (source.title || "").trim().replace(/\s+/g, " ");
  const year = source.year ?? undefined;
  const venue = source.venue ?? "";
  const doiUrl = source.doi ? `https://doi.org/${source.doi}` : "";
  const url = source.url ?? "";
  const link = doiUrl || url;

  const authors = (source.authors ?? []).filter(Boolean);

  if (style === "ieee") {
    const idx = typeof ieeeIndex === "number" ? `[${ieeeIndex}] ` : "";
    const a = authors.length ? `${authors.join(", ")}, ` : "";
    const v = venue ? `${venue}, ` : "";
    const y = year ? `${year}.` : "";
    const l = link ? ` ${link}` : "";
    return `${idx}${a}"${title}," ${v}${y}${l}`.trim().replace(/\s+,/g, ",");
  }

  if (style === "apa") {
    // Minimal APA-like
    const a =
      authors.length === 0
        ? ""
        : authors.length === 1
          ? `${lastName(authors[0])}, ${authors[0].trim()[0]}.`
          : `${lastName(authors[0])}, ${authors[0].trim()[0]}., & ${lastName(authors[1])}, ${authors[1].trim()[0]}.`;

    const y = year ? `(${year}).` : "(n.d.).";
    const v = venue ? ` ${venue}.` : "";
    const l = link ? ` ${link}` : "";
    return `${a ? a + " " : ""}${y} ${title}.${v}${l}`.trim();
  }

  if (style === "mla") {
    // Minimal MLA-like
    const a =
      authors.length === 0
        ? ""
        : authors.length === 1
          ? `${lastName(authors[0])}, ${authors[0].trim().split(/\s+/).slice(0, -1).join(" ")}. `
          : `${lastName(authors[0])}, ${authors[0].trim().split(/\s+/).slice(0, -1).join(" ")}, et al. `;

    const v = venue ? `${venue}, ` : "";
    const y = year ? `${year}, ` : "";
    const l = link ? `${link}.` : "";
    return `${a}"${title}." ${v}${y}${l}`.trim().replace(/\s+,/g, ",");
  }

  if (style === "acm") {
    const a = authors.length ? `${authors.join(", ")}.` : "";
    const v = venue ? `In ${venue}.` : "";
    const y = year ? ` ${year}.` : "";
    const l = link ? ` ${link}` : "";
    return `${a}${y} ${title}. ${v}${l}`.trim();
  }

  // fallback
  return `${title}${link ? ` — ${link}` : ""}`.trim();
}

export function formatInText(style: CitationStyle, source: CitationSource, ieeeIndex?: number): string {
  // Handle both plural and singular author fields for robustness
  const authors = (source.authors ?? []).filter(Boolean);
  const fallbackAuthor = (source as any).author;
  const finalAuthors = authors.length > 0 ? authors : (fallbackAuthor ? [fallbackAuthor] : []);
  
  const year = source.year ?? undefined;

  if (style === "ieee") {
    if (typeof ieeeIndex !== "number") return "[?]";
    return `[${ieeeIndex}]`;
  }

  if (style === "apa") {
    let authorStr = "";
    if (finalAuthors.length === 0) {
      authorStr = source.title;
    } else if (finalAuthors.length === 1) {
      authorStr = lastName(finalAuthors[0]);
    } else if (finalAuthors.length === 2) {
      authorStr = `${lastName(finalAuthors[0])} & ${lastName(finalAuthors[1])}`;
    } else {
      authorStr = `${lastName(finalAuthors[0])} et al.`;
    }
    
    const y = year ? `${year}` : "n.d.";
    return `(${authorStr}, ${y})`;
  }

  if (style === "mla") {
    const a = finalAuthors.length ? lastName(finalAuthors[0]) : source.title;
    return `(${a})`;
  }

  if (style === "acm") {
    if (typeof ieeeIndex !== "number") return "[?]";
    return `[${ieeeIndex}]`;
  }

  return `(${source.title})`;
}