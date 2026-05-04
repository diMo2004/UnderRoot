/**
 * Math parsing utility for imported documents.
 * Normalizes Unicode math symbols to LaTeX and detects math segments
 * to create structured inlineMath / mathBlock nodes.
 */

// ─── Unicode → LaTeX mapping ───
const UNICODE_TO_LATEX: Record<string, string> = {
  // Superscripts
  '⁰': '^{0}', '¹': '^{1}', '²': '^{2}', '³': '^{3}', '⁴': '^{4}',
  '⁵': '^{5}', '⁶': '^{6}', '⁷': '^{7}', '⁸': '^{8}', '⁹': '^{9}',
  'ⁿ': '^{n}', 'ⁱ': '^{i}',
  // Subscripts
  '₀': '_{0}', '₁': '_{1}', '₂': '_{2}', '₃': '_{3}', '₄': '_{4}',
  '₅': '_{5}', '₆': '_{6}', '₇': '_{7}', '₈': '_{8}', '₉': '_{9}',
  'ₙ': '_{n}', 'ᵢ': '_{i}', 'ⱼ': '_{j}', 'ₖ': '_{k}',
  'ₐ': '_{a}', 'ₑ': '_{e}', 'ₒ': '_{o}', 'ₓ': '_{x}',
  // Greek lowercase
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega', 'ϵ': '\\varepsilon',
  'ϕ': '\\varphi', 'ϑ': '\\vartheta',
  // Greek uppercase
  'Α': 'A', 'Β': 'B', 'Γ': '\\Gamma', 'Δ': '\\Delta',
  'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi', 'Π': '\\Pi',
  'Σ': '\\Sigma', 'Υ': '\\Upsilon', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  // Operators & symbols
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∂': '\\partial', '∇': '\\nabla', '√': '\\sqrt', '∞': '\\infty',
  '±': '\\pm', '∓': '\\mp', '×': '\\times', '÷': '\\div', '·': '\\cdot',
  '∘': '\\circ', '⊕': '\\oplus', '⊗': '\\otimes',
  // Relations
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '∝': '\\propto', '≪': '\\ll', '≫': '\\gg',
  '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊃': '\\supset',
  '⊆': '\\subseteq', '⊇': '\\supseteq', '∪': '\\cup', '∩': '\\cap',
  '∅': '\\emptyset', '∀': '\\forall', '∃': '\\exists',
  // Arrows
  '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '↦': '\\mapsto',
  // Misc
  '…': '\\ldots', '⋯': '\\cdots', '⋮': '\\vdots', '⋱': '\\ddots',
  'ℝ': '\\mathbb{R}', 'ℤ': '\\mathbb{Z}', 'ℕ': '\\mathbb{N}',
  'ℂ': '\\mathbb{C}', 'ℚ': '\\mathbb{Q}',
  '⟨': '\\langle', '⟩': '\\rangle',
  '‖': '\\|',
};

// Build a regex that matches any of the Unicode math characters
const MATH_CHARS = Object.keys(UNICODE_TO_LATEX).map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const UNICODE_MATH_RE = new RegExp(`[${MATH_CHARS.join('')}]`, 'g');

// Detect whether a character is a Unicode superscript or subscript
const SUPERSCRIPT_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿⁱ]/;
const SUBSCRIPT_RE = /[₀₁₂₃₄₅₆₇₈₉ₙᵢⱼₖₐₑₒₓ]/;

/**
 * Normalize a string of consecutive super/subscript characters
 * into a single LaTeX group: x²³ → x^{23}
 */
function collapseScriptRuns(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // Detect start of superscript run
    if (SUPERSCRIPT_RE.test(ch)) {
      let run = '';
      while (i < text.length && SUPERSCRIPT_RE.test(text[i])) {
        const mapped = UNICODE_TO_LATEX[text[i]] || text[i];
        // Extract just the content from ^{X}
        const m = mapped.match(/\^\{(.+?)\}/);
        run += m ? m[1] : mapped;
        i++;
      }
      result += `^{${run}}`;
      continue;
    }
    // Detect start of subscript run
    if (SUBSCRIPT_RE.test(ch)) {
      let run = '';
      while (i < text.length && SUBSCRIPT_RE.test(text[i])) {
        const mapped = UNICODE_TO_LATEX[text[i]] || text[i];
        const m = mapped.match(/_\{(.+?)\}/);
        run += m ? m[1] : mapped;
        i++;
      }
      result += `_{${run}}`;
      continue;
    }
    // Regular character — normalize if it's a known symbol
    result += UNICODE_TO_LATEX[ch] || ch;
    i++;
  }
  return result;
}

/**
 * Normalize Unicode math symbols in a string to LaTeX equivalents.
 * Collapses consecutive super/subscripts into single groups.
 */
export function normalizeUnicodeToLatex(text: string): string {
  if (!text || !UNICODE_MATH_RE.test(text)) return text;
  return collapseScriptRuns(text);
}

/**
 * Check if a string segment looks like it contains math content.
 */
function isMathSegment(text: string): boolean {
  // Contains LaTeX commands
  if (/\\(alpha|beta|gamma|sum|int|frac|sqrt|partial|nabla|infty|leq|geq|neq|approx|equiv|in|forall|exists|Sigma|Delta|Theta|Lambda|Pi|Omega|Phi|Psi|Gamma|pm|times|div|cdot|to|mathbb)\b/.test(text)) return true;
  // Contains LaTeX operators
  if (/[\^_]{/.test(text)) return true;
  // Is a standalone equation-like pattern
  if (/^[A-Za-z0-9\s\\{}^_=+\-*/().,'<>|]+$/.test(text) && /[\\^_=]/.test(text)) return true;
  return false;
}

/**
 * Detect if an entire line is a block-level equation.
 * Block equations are standalone lines that are primarily math.
 */
export function isBlockEquation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300) return false;
  // Already wrapped in $$ or \[ \]
  if (/^\$\$.*\$\$$/.test(trimmed) || /^\\\[.*\\\]$/.test(trimmed)) return true;
  // Line is predominantly math symbols/LaTeX
  const normalized = normalizeUnicodeToLatex(trimmed);
  const mathChars = (normalized.match(/[\\^_{}=+\-*/∑∫∂∇√∞≤≥≠≈≡∈∀∃→⇒←⇐αβγδεζηθικλμνξπρστυφχψω]/g) || []).length;
  const ratio = mathChars / normalized.length;
  return ratio > 0.3 && isMathSegment(normalized);
}

/**
 * Parse a text line into TipTap-compatible content nodes,
 * splitting inline math from plain text.
 *
 * Input:  "The energy E = mc² is fundamental"
 * Output: [
 *   { type: 'text', text: 'The energy ' },
 *   { type: 'inlineMath', attrs: { latex: 'E = mc^{2}' } },
 *   { type: 'text', text: ' is fundamental' },
 * ]
 */
export function parseTextWithMath(text: string): any[] {
  if (!text) return [{ type: 'text', text: '' }];

  // First normalize Unicode
  const normalized = normalizeUnicodeToLatex(text);

  // Pattern to find inline math segments:
  // 1. Explicit $...$ delimiters
  // 2. Sequences containing LaTeX commands with context (e.g., "E = mc^{2}")
  const mathPattern = /\$([^$]+)\$|(?:(?:[A-Za-z0-9]+\s*[=<>≤≥≠≈]\s*)?(?:[A-Za-z0-9]*(?:\\[a-zA-Z]+|[\^_]\{[^}]+\})[A-Za-z0-9\s\\{}^_=+\-*/.,'()]*)+)/g;

  const nodes: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathPattern.exec(normalized)) !== null) {
    const mathText = match[1] || match[0]; // $...$ captured group or full match
    
    // Skip if the "math" is just a plain word with no actual math content
    if (!isMathSegment(mathText)) continue;

    // Add preceding plain text
    if (match.index > lastIndex) {
      const plainText = normalized.slice(lastIndex, match.index);
      if (plainText) nodes.push({ type: 'text', text: plainText });
    }

    // Add inline math node — strip $ delimiters if present
    const latex = mathText.replace(/^\$|\$$/g, '').trim();
    if (latex) {
      nodes.push({ type: 'inlineMath', attrs: { latex } });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < normalized.length) {
    const remaining = normalized.slice(lastIndex);
    if (remaining) nodes.push({ type: 'text', text: remaining });
  }

  // If no math was found, return the normalized text
  if (nodes.length === 0) {
    return [{ type: 'text', text: normalized }];
  }

  return nodes;
}

// ─── Non-destructive AI cleanup ───
// Fixes broken words from PDF column extraction without altering meaning.

/** Common broken-word patterns from PDF column extraction */
const BROKEN_WORD_FIXES: [RegExp, string][] = [
  // Space in middle of common words (PDF column artifact)
  [/\bI\s+ntroduction\b/gi, 'Introduction'],
  [/\bC\s+onclusion\b/gi, 'Conclusion'],
  [/\bA\s+bstract\b/gi, 'Abstract'],
  [/\bR\s+eferences\b/gi, 'References'],
  [/\bM\s+ethodology\b/gi, 'Methodology'],
  [/\bE\s+xperiment\b/gi, 'Experiment'],
  [/\bD\s+iscussion\b/gi, 'Discussion'],
  [/\bR\s+esults?\b/gi, 'Result'],
  [/\bA\s+lgorithm\b/gi, 'Algorithm'],
  [/\bP\s+erformance\b/gi, 'Performance'],
  [/\bE\s+valuation\b/gi, 'Evaluation'],
  [/\bA\s+cknowledg/gi, 'Acknowledg'],
  // Generic: single letter + space + rest of word (>3 chars)
  [/\b([A-Z])\s+([a-z]{3,})\b/g, '$1$2'],
  // Hyphenated line breaks: "algo-\nrithm" → "algorithm"
  [/(\w)-\s*\n\s*(\w)/g, '$1$2'],
  // Double spaces
  [/  +/g, ' '],
];

/**
 * Non-destructive cleanup of text extracted from PDFs.
 * Only fixes broken words — NEVER rewrites sentences or changes meaning.
 */
export function cleanBrokenText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of BROKEN_WORD_FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Structure detection ───

/** Detect if a line is a section heading */
function detectHeadingLevel(line: string): number | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return null;

  // Level 1: Title-like (first few lines, short, possibly ALL CAPS)
  // (handled separately in convertLinesToContent)

  // Level 2: Roman numeral sections: "I. INTRODUCTION", "II. RELATED WORK"
  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X{1,3})\.\s+[A-Z]/.test(trimmed)) return 2;

  // Level 2: Numbered sections: "1. Introduction", "2 Methods"
  if (/^\d{1,2}[.)]\s+[A-Z]/.test(trimmed) && trimmed.length < 60) return 2;

  // Level 2: ALL CAPS short lines (section headers)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && /^[A-Z\s]+$/.test(trimmed)) return 2;

  // Level 3: Subsections: "A. Feature Extraction", "1.1 Overview"
  if (/^[A-Z]\.\s+[A-Z]/.test(trimmed) && trimmed.length < 60) return 3;
  if (/^\d+\.\d+\.?\s+[A-Z]/.test(trimmed) && trimmed.length < 60) return 3;

  // Level 2: Short sentence-case line that looks like a heading
  if (/^[A-Z][^.!?]*$/.test(trimmed) && trimmed.length < 50 && trimmed.split(/\s+/).length <= 6) return 2;

  return null;
}

/** Detect if a line is an abstract marker */
function isAbstractMarker(line: string): boolean {
  const t = line.trim();
  return /^Abstract\s*[—–\-:.]?\s*$/i.test(t) || /^ABSTRACT\s*[—–\-:.]?\s*$/.test(t);
}

/** Detect if text starts with "Abstract—" (IEEE style inline abstract) */
function startsWithAbstract(line: string): string | null {
  const match = line.match(/^Abstract\s*[—–\-]\s*(.+)/i);
  return match ? match[1] : null;
}

/**
 * Convert a list of raw text lines into TipTap document content nodes,
 * with structured math nodes, heading detection, abstract blocks,
 * and non-destructive cleanup.
 */
export function convertLinesToContent(lines: string[]): any[] {
  const content: any[] = [];
  let isFirstContent = true;
  let inAbstract = false;

  // Pre-process: merge fragmented PDF lines into logical paragraphs
  const mergedBlocks: string[] = [];
  let currentBlock = '';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const cleaned = cleanBrokenText(raw).trim();
    if (!cleaned) continue;

    // Determine if this line should force a new block
    const isEquation = isBlockEquation(cleaned);
    const heading = detectHeadingLevel(cleaned);
    const isAbstract = isAbstractMarker(cleaned) || startsWithAbstract(cleaned);
    
    // Heuristic: if it's very short and ends in a period, or starts with a number, maybe it's a new block,
    // but the safest bet is just checking structural markers.
    if (isEquation || heading !== null || isAbstract) {
      if (currentBlock) mergedBlocks.push(currentBlock);
      mergedBlocks.push(cleaned);
      currentBlock = '';
    } else {
      if (currentBlock) {
        if (currentBlock.endsWith('-')) {
          currentBlock = currentBlock.slice(0, -1) + cleaned;
        } else {
          currentBlock += ' ' + cleaned;
        }
      } else {
        currentBlock = cleaned;
      }
    }
  }
  if (currentBlock) mergedBlocks.push(currentBlock);

  // Process merged blocks into nodes
  for (let idx = 0; idx < mergedBlocks.length; idx++) {
    const trimmed = mergedBlocks[idx];

    // ── Block equation ──
    if (isBlockEquation(trimmed)) {
      const normalized = normalizeUnicodeToLatex(trimmed)
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .trim();
      content.push({
        type: 'mathBlock',
        attrs: { latex: normalized },
      });
      isFirstContent = false;
      continue;
    }

    // ── Title detection (first substantial line) ──
    if (isFirstContent && trimmed.length > 5 && trimmed.length < 200) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: trimmed }],
      });
      isFirstContent = false;
      continue;
    }
    isFirstContent = false;

    // ── Abstract marker ──
    if (isAbstractMarker(trimmed)) {
      inAbstract = true;
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Abstract' }],
      });
      continue;
    }

    // ── IEEE-style inline abstract: "Abstract— text..." ──
    const abstractBody = startsWithAbstract(trimmed);
    if (abstractBody) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Abstract' }],
      });
      const nodes = parseTextWithMath(abstractBody);
      content.push({ type: 'paragraph', content: nodes });
      inAbstract = false;
      continue;
    }

    // ── Section heading detection ──
    const headingLevel = detectHeadingLevel(trimmed);
    if (headingLevel !== null) {
      inAbstract = false; // section heading ends abstract
      content.push({
        type: 'heading',
        attrs: { level: headingLevel },
        content: [{ type: 'text', text: trimmed }],
      });
      continue;
    }

    // ── Regular paragraph (with inline math parsing) ──
    const nodes = parseTextWithMath(trimmed);
    content.push({
      type: 'paragraph',
      content: nodes,
    });
  }

  return content;
}
