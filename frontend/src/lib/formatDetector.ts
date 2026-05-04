/**
 * Paper format auto-detection.
 * Scores document content against IEEE, APA, and ACM patterns
 * and returns the best-matching format.
 */

export type PaperFormat = 'IEEE' | 'APA' | 'ACM';

interface FormatScore {
  format: PaperFormat;
  score: number;
  signals: string[];
}

/**
 * Detect paper format from document text content.
 * Does NOT modify content — only reads and scores.
 */
export function detectPaperFormat(text: string): FormatScore {
  const scores: FormatScore[] = [
    { format: 'IEEE', score: 0, signals: [] },
    { format: 'APA', score: 0, signals: [] },
    { format: 'ACM', score: 0, signals: [] },
  ];

  const ieee = scores[0];
  const apa = scores[1];
  const acm = scores[2];

  // ─── IEEE Signals ───
  // Numbered references: [1], [2], [3]
  const numberedRefs = (text.match(/\[\d{1,3}\]/g) || []).length;
  if (numberedRefs >= 3) {
    ieee.score += 3;
    ieee.signals.push(`numbered refs [n]: ${numberedRefs}`);
  }

  // Roman numeral section headers: I. INTRODUCTION, II. RELATED WORK
  const romanSections = (text.match(/\b(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+[A-Z]/g) || []).length;
  if (romanSections >= 2) {
    ieee.score += 4;
    ieee.signals.push(`roman sections: ${romanSections}`);
  }

  // Abstract with em dash: "Abstract—"
  if (/Abstract\s*[—–-]\s*/i.test(text)) {
    ieee.score += 3;
    ieee.signals.push('Abstract— pattern');
  }

  // Two-column indicators (long lines broken mid-word)
  if (/\bIEEE\b/.test(text)) {
    ieee.score += 2;
    ieee.signals.push('IEEE keyword');
  }

  // ALL-CAPS section headings
  const allCapsSections = (text.match(/^[A-Z][A-Z\s]{5,40}$/gm) || []).length;
  if (allCapsSections >= 3) {
    ieee.score += 2;
    ieee.signals.push(`ALL-CAPS headings: ${allCapsSections}`);
  }

  // ─── APA Signals ───
  // Author-date citations: (Smith, 2020) or (Smith & Jones, 2019)
  const authorDateCites = (text.match(/\([A-Z][a-z]+(?:\s*(?:&|and)\s*[A-Z][a-z]+)*(?:\s*et\s*al\.)?,\s*(?:19|20)\d{2}[a-z]?\)/g) || []).length;
  if (authorDateCites >= 2) {
    apa.score += 4;
    apa.signals.push(`author-date citations: ${authorDateCites}`);
  }

  // "References" section header (not "REFERENCES")
  if (/^References\s*$/m.test(text)) {
    apa.score += 2;
    apa.signals.push('References header (sentence case)');
  }

  // Sentence case headings (capitalized first word only)
  const sentenceCaseHeadings = (text.match(/^[A-Z][a-z]+(?:\s+[a-z]+){1,5}\s*$/gm) || []).length;
  if (sentenceCaseHeadings >= 3) {
    apa.score += 2;
    apa.signals.push(`sentence-case headings: ${sentenceCaseHeadings}`);
  }

  // APA DOI format: https://doi.org/
  const doiLinks = (text.match(/https?:\/\/doi\.org\//g) || []).length;
  if (doiLinks >= 2) {
    apa.score += 2;
    apa.signals.push(`DOI links: ${doiLinks}`);
  }

  // Year in parentheses: (2020).
  const yearDot = (text.match(/\((?:19|20)\d{2}\)\./g) || []).length;
  if (yearDot >= 3) {
    apa.score += 3;
    apa.signals.push(`(year). pattern: ${yearDot}`);
  }

  // ─── ACM Signals ───
  // ACM keyword
  if (/\bACM\b/.test(text)) {
    acm.score += 2;
    acm.signals.push('ACM keyword');
  }

  // CCS Concepts
  if (/CCS\s+Concepts/i.test(text)) {
    acm.score += 3;
    acm.signals.push('CCS Concepts');
  }

  // Compact numbered refs + conference venue patterns
  if (/Proceedings\s+of/i.test(text)) {
    acm.score += 2;
    acm.signals.push('Conference proceedings');
  }

  // ACM Reference Format
  if (/ACM\s+Reference\s+Format/i.test(text)) {
    acm.score += 4;
    acm.signals.push('ACM Reference Format');
  }

  // Numbered refs also boost ACM (shared with IEEE)
  if (numberedRefs >= 3 && !romanSections) {
    acm.score += 1;
    acm.signals.push('numbered refs without roman sections');
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If no clear signal, default to IEEE
  if (scores[0].score === 0) {
    return { format: 'IEEE', score: 0, signals: ['default fallback'] };
  }

  return scores[0];
}

/**
 * Get format-specific styling rules for the editor.
 * Does NOT modify content — returns style configuration only.
 */
export function getFormatStyles(format: PaperFormat) {
  switch (format) {
    case 'IEEE':
      return {
        bodyFont: "'Times New Roman', serif",
        fontSize: '12px',
        lineHeight: '1.3',
        align: 'justify' as const,
        columns: 2,
        columnGap: '24px',
        headingStyle: 'roman-caps', // I. INTRODUCTION
        citationStyle: 'numbered',  // [1]
      };
    case 'APA':
      return {
        bodyFont: "'Georgia', serif",
        fontSize: '18px',
        lineHeight: '2',
        align: 'justify' as const,
        columns: 1,
        columnGap: 'normal',
        headingStyle: 'sentence-bold', // Introduction
        citationStyle: 'author-date',  // (Smith, 2020)
      };
    case 'ACM':
      return {
        bodyFont: "'Palatino Linotype', serif",
        fontSize: '17px',
        lineHeight: '1.75',
        align: 'left' as const,
        columns: 1,
        columnGap: 'normal',
        headingStyle: 'title-bold', // Introduction
        citationStyle: 'numbered',  // [1]
      };
  }
}
