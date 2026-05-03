"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── UnderRoot Brand Palette ───────────────────────────────────────────────────
const P = {
  cream: "#F5F0E8",
  darkest: "#0D2318",
  dark: "#1C3A2A",
  mid: "#2E5C40",
  gold: "#B8962E",
  offwhite: "#FAF8F3",
  muted: "#6B6450",
  border: "#DDD5C0",
};

// ── Citation Formats ──────────────────────────────────────────────────────────
const CITATION_FORMATS = [
  {
    id: "ieee",
    label: "IEEE",
    fullName: "Institute of Electrical and Electronics Engineers",
    example: "[1] A. Author, \"Title of paper,\" Journal Name, vol. 1, no. 1, pp. 1–10, Jan. 2022.",
    color: "#1A6B9A",
  },
  {
    id: "apa",
    label: "APA 7th",
    fullName: "American Psychological Association",
    example: "Author, A. A. (2022). Title of article. Journal Name, 1(1), 1–10. https://doi.org/10.xxxx",
    color: "#2E5C40",
  },
  {
    id: "acm",
    label: "ACM",
    fullName: "Association for Computing Machinery",
    example: "Author, A. 2022. Title of paper. J. Assoc. Comput. Mach. 1, 1 (Jan. 2022), 1–10.",
    color: "#8B2E1A",
  },
  {
    id: "chicago",
    label: "Chicago",
    fullName: "Chicago Manual of Style (Author-Date)",
    example: "Author, Andrew. 2022. \"Title of Article.\" Journal Name 1 (1): 1–10.",
    color: "#5A3E8A",
  },
  {
    id: "mla",
    label: "MLA 9th",
    fullName: "Modern Language Association",
    example: "Author, Andrew. \"Title of Article.\" Journal Name, vol. 1, no. 1, Jan. 2022, pp. 1–10.",
    color: "#7A5A20",
  },
];

// ── Format a citation object into the chosen style ────────────────────────────
function formatCitation(raw, format, index) {
  const a = raw.author || "A. Author";
  const y = raw.year || "2022";
  const t = raw.title || "Untitled";
  const j = raw.journal || "Journal";
  const v = raw.volume || "1";
  const n = raw.issue || "1";
  const p = raw.pages || "1-10";
  const doi = raw.doi ? ` https://doi.org/${raw.doi}` : "";

  switch (format) {
    case "ieee":
      return `[${index}] ${a}, "${t}," ${j}, vol. ${v}, no. ${n}, pp. ${p}, ${y}.`;
    case "apa":
      return `${a} (${y}). ${t}. ${j}, ${v}(${n}), ${p}.${doi}`;
    case "acm":
      return `${a}. ${y}. ${t}. ${j} ${v}, ${n} (${y}), ${p}. DOI:${raw.doi || "10.xxxx/xxxx"}`;
    case "chicago":
      return `${a}. ${y}. "${t}." ${j} ${v} (${n}): ${p}.`;
    case "mla":
      return `${a}. "${t}." ${j}, vol. ${v}, no. ${n}, ${y}, pp. ${p}.`;
    default:
      return `${a} (${y}). ${t}. ${j}.`;
  }
}

function buildInText(raw, format, index) {
  switch (format) {
    case "ieee": return `[${index}]`;
    case "apa":  return `(${(raw.author || "Author").split(",")[0]}, ${raw.year || "2022"})`;
    case "acm":  return `[${index}]`;
    case "chicago": return `(${(raw.author || "Author").split(",")[0]} ${raw.year || "2022"})`;
    case "mla":  return `(${(raw.author || "Author").split(",")[0]} ${raw.pages || "1"})`;
    default: return `[${index}]`;
  }
}

// ── Heat helpers ──────────────────────────────────────────────────────────────
function heatColor(s) {
  if (s >= 80) return "#9B2C1A";
  if (s >= 60) return "#B85C2A";
  if (s >= 40) return "#B8962E";
  if (s >= 20) return "#2E5C40";
  return "#3A6B8A";
}
function heatBg(s) {
  if (s >= 80) return "rgba(155,44,26,0.09)";
  if (s >= 60) return "rgba(184,92,42,0.09)";
  if (s >= 40) return "rgba(184,150,46,0.10)";
  if (s >= 20) return "rgba(46,92,64,0.09)";
  return "rgba(58,107,138,0.07)";
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function runPlagiarismCheck(text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are an academic plagiarism detector. Split the following text into individual sentences. For each sentence estimate a plagiarism similarity score (0-100) based on how generic, commonly-used, or potentially copied the phrasing appears in academic literature. Suggest a plausible fictional source journal/paper name if score > 40. Return ONLY valid JSON array, no markdown:
[{"sentence":"...","score":42,"source":"Journal of X (2022)"},...]

TEXT:
${text}`,
      }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map((c) => c.text || "").join("");
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return []; }
}

async function runMindmap(text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are an academic mind-map generator. Analyse the text and produce a hierarchical mind map: root node (main topic), up to 5 branch nodes (key themes), up to 3 leaf nodes per branch (sub-concepts). Return ONLY valid JSON, no markdown:
{"id":"root","label":"Main Topic","children":[{"id":"b1","label":"Theme","children":[{"id":"l1","label":"Sub-concept","children":[]}]}]}

TEXT:
${text}`,
      }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map((c) => c.text || "").join("");
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { id: "root", label: "Main Topic", children: [] }; }
}

async function runCitationExtraction(text, citationFormat) {
  const formatInfo = CITATION_FORMATS.find((f) => f.id === citationFormat);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are an academic citation expert. Analyse the following text and:
1. Identify all claims, facts, statistics, and statements that require academic citations.
2. For each, generate a plausible (fictional but realistic) academic source in ${formatInfo.fullName} (${formatInfo.label}) style.
3. Return structured raw metadata for each source so it can be reformatted later.

Return ONLY valid JSON, no markdown, no preamble:
{
  "citations": [
    {
      "sentence": "The sentence or fragment needing citation",
      "inTextCitation": "In-text marker e.g. [1] or (Author, 2022)",
      "formatted": "Full formatted citation in ${formatInfo.label} style",
      "raw": {
        "author": "Surname, A.",
        "year": "2022",
        "title": "Title of the Paper",
        "journal": "Journal Name",
        "volume": "12",
        "issue": "3",
        "pages": "45-60",
        "doi": "10.xxxx/xxxxx"
      }
    }
  ],
  "bibliography": ["Full citation 1 in ${formatInfo.label} style", "Full citation 2"]
}

TEXT:
${text}`,
      }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map((c) => c.text || "").join("");
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { citations: [], bibliography: [] }; }
}

// ── Mind Map ──────────────────────────────────────────────────────────────────
function layoutTree(node, x, y, depth) {
  node.x = x; node.y = y; node.depth = depth;
  const spread = 155 - depth * 25;
  const totalH = (node.children.length - 1) * spread;
  node.children.forEach((child, i) =>
    layoutTree(child, x + 215, y - totalH / 2 + i * spread, depth + 1));
  return node;
}
function flatNodes(node, arr = []) {
  arr.push(node);
  node.children.forEach((c) => flatNodes(c, arr));
  return arr;
}
function flatEdges(node, edges = []) {
  node.children.forEach((c) => {
    edges.push({ x1: node.x, y1: node.y, x2: c.x, y2: c.y });
    flatEdges(c, edges);
  });
  return edges;
}
const depthFill = ["#0D2318", "#B8962E", "#2E5C40", "#7A6020", "#3D7A5A"];
const depthStroke = ["#B8962E", "#0D2318", "#B8962E", "#DDD5C0", "#B8962E"];

function MindMapSVG({ tree }) {
  const laid = layoutTree(JSON.parse(JSON.stringify(tree)), 110, 320, 0);
  const nodes = flatNodes(laid);
  const edges = flatEdges(laid);
  const maxX = Math.max(...nodes.map((n) => n.x)) + 130;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 60;
  const minY = Math.min(...nodes.map((n) => n.y)) - 60;
  return (
    <svg viewBox={`50 ${minY} ${maxX} ${maxY - minY + 40}`} width="100%"
      style={{ minHeight: 400, fontFamily: "'Georgia', serif" }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#B8962E" />
        </marker>
      </defs>
      {edges.map((e, i) => (
        <path key={i}
          d={`M${e.x1 + 65},${e.y1} C${(e.x1 + e.x2) / 2 + 20},${e.y1} ${(e.x1 + e.x2) / 2 - 20},${e.y2} ${e.x2 - 8},${e.y2}`}
          fill="none" stroke="#B8962E" strokeWidth="1.5" strokeDasharray="5 3"
          markerEnd="url(#arr)" opacity={0.55} />
      ))}
      {nodes.map((n) => {
        const d = Math.min(n.depth, 4);
        const isRoot = d === 0;
        const w = isRoot ? 130 : 110; const h = isRoot ? 44 : 34;
        const label = n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label;
        return (
          <g key={n.id} transform={`translate(${n.x - w / 2},${n.y - h / 2})`}>
            <rect width={w} height={h} rx={isRoot ? 6 : 22}
              fill={depthFill[d]} stroke={depthStroke[d]} strokeWidth={isRoot ? 2 : 1.2} />
            <text x={w / 2} y={h / 2 + 5} textAnchor="middle"
              fill="#FAF8F3" fontSize={isRoot ? 13 : 11} fontWeight={isRoot ? "700" : "400"}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Plagiarism Heatmap ────────────────────────────────────────────────────────
function PlagiarismHeatmap({ results }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ position: "relative" }}>
      <p style={{ fontSize: 12, color: P.muted, marginBottom: 14, fontStyle: "italic" }}>
        Hover any sentence to inspect its similarity score and probable source.
      </p>
      <div style={{ fontSize: 15, fontFamily: "'Georgia', serif", lineHeight: 2.2, color: P.dark }}>
        {results.map((r, i) => (
          <span key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{
              background: heatBg(r.score), borderBottom: `2.5px solid ${heatColor(r.score)}`,
              cursor: "pointer", padding: "1px 3px", borderRadius: 2,
              position: "relative", transition: "background 0.15s",
            }}>
            {r.sentence}{" "}
            {hovered === i && (
              <span style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                background: P.darkest, color: P.offwhite, fontSize: 11,
                borderRadius: 6, padding: "7px 12px", whiteSpace: "nowrap",
                zIndex: 99, boxShadow: "0 6px 20px rgba(13,35,24,0.35)",
                pointerEvents: "none", border: `1px solid ${P.gold}`,
              }}>
                <span style={{ color: heatColor(r.score), fontWeight: 700 }}>{r.score}% similarity</span>
                {r.source && <span style={{ color: P.border }}> · {r.source}</span>}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreSummary({ results }) {
  const avg = Math.round(results.reduce((a, b) => a + b.score, 0) / results.length);
  const high = results.filter((r) => r.score >= 60).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Overall Similarity", value: `${avg}%`, color: heatColor(avg) },
        { label: "High-Risk Sentences", value: String(high), color: "#9B2C1A" },
        { label: "Total Sentences", value: String(results.length), color: P.darkest },
      ].map((s) => (
        <div key={s.label} style={{
          background: P.cream, border: `1px solid ${P.border}`,
          borderRadius: 10, padding: "14px 16px", textAlign: "center",
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'Georgia', serif" }}>{s.value}</div>
          <div style={{ fontSize: 10, color: P.muted, marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
      {[
        { label: "0–19%", color: "#3A6B8A" },
        { label: "20–39%", color: "#2E5C40" },
        { label: "40–59%", color: "#B8962E" },
        { label: "60–79%", color: "#B85C2A" },
        { label: "80–100%", color: "#9B2C1A" },
      ].map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: it.color, display: "inline-block" }} />
          <span style={{ color: P.muted }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Citation Format Selector ──────────────────────────────────────────────────
function CitationFormatSelector({ selected, onChange }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: P.gold, marginBottom: 8, fontWeight: 700, marginTop: 0 }}>
        Citation Format
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CITATION_FORMATS.map((f) => {
          const active = selected === f.id;
          return (
            <button key={f.id} onClick={() => onChange(f.id)} title={f.fullName}
              style={{
                padding: "5px 11px", borderRadius: 20,
                border: active ? `1.5px solid ${f.color}` : `1.5px solid ${P.border}`,
                background: active ? f.color : P.cream,
                color: active ? "#FAF8F3" : P.muted,
                fontSize: 11, fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: "'Georgia', serif",
                letterSpacing: "0.06em", transition: "all 0.15s",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>
      <div style={{
        marginTop: 8, padding: "9px 12px",
        background: "rgba(184,150,46,0.06)",
        border: `1px solid rgba(184,150,46,0.22)`,
        borderRadius: 7, fontSize: 9.5, color: P.muted,
        fontFamily: "monospace", lineHeight: 1.75,
      }}>
        <span style={{ color: P.gold, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'Georgia', serif" }}>
          Example —{" "}
        </span>
        {CITATION_FORMATS.find((f) => f.id === selected)?.example}
      </div>
    </div>
  );
}

// ── Raw Metadata Accordion ────────────────────────────────────────────────────
function RawMetaAccordion({ raw, fmtColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(!open)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 10, color: P.muted, fontFamily: "'Georgia', serif",
          display: "flex", alignItems: "center", gap: 5, padding: 0,
        }}>
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)", fontSize: 8 }}>▶</span>
        {open ? "Hide" : "Show"} raw metadata
      </button>
      {open && (
        <div style={{
          marginTop: 7, padding: "10px 14px",
          background: "#0D2318", borderRadius: 6,
          fontSize: 10, fontFamily: "monospace",
          color: "#B8E0B0", lineHeight: 2,
        }}>
          {Object.entries(raw || {}).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: fmtColor }}>{k}</span>
              <span style={{ color: "#FAF8F3" }}>: </span>
              <span style={{ color: "#DDD5C0" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Citation Results Panel ────────────────────────────────────────────────────
function CitationResults({ data, citationFormat, onReformat }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copiedBib, setCopiedBib] = useState(false);

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const copyBib = () => {
    navigator.clipboard.writeText(data.bibliography.join("\n\n"));
    setCopiedBib(true);
    setTimeout(() => setCopiedBib(false), 1800);
  };

  const fmtInfo = CITATION_FORMATS.find((f) => f.id === citationFormat);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Citations Found", value: String(data.citations.length), color: fmtInfo.color },
          { label: "Active Format", value: fmtInfo.label, color: P.darkest },
          { label: "Bibliography Entries", value: String(data.bibliography.length), color: P.mid },
        ].map((s) => (
          <div key={s.label} style={{
            background: P.cream, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: s.label === "Active Format" ? 16 : 26, fontWeight: 700, color: s.color, fontFamily: "'Georgia', serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: P.muted, marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reformat strip */}
      <div style={{
        marginBottom: 20, padding: "10px 14px", background: P.cream,
        borderRadius: 8, border: `1px solid ${P.border}`,
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 9, color: P.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
          Reformat as:
        </span>
        {CITATION_FORMATS.filter((f) => f.id !== citationFormat).map((f) => (
          <button key={f.id} onClick={() => onReformat(f.id)}
            style={{
              padding: "4px 12px", borderRadius: 14,
              border: `1.5px solid ${f.color}`, background: "transparent",
              color: f.color, fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Georgia', serif", letterSpacing: "0.06em",
              transition: "all 0.15s",
            }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 9, color: P.border, fontStyle: "italic" }}>
          Instant client-side reformat — no API call needed
        </span>
      </div>

      {/* Citation cards */}
      <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 20 }}>
        <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: P.darkest, fontWeight: 700, marginBottom: 14 }}>
          Inline Citations ({data.citations.length})
        </p>
        {data.citations.map((c, i) => (
          <div key={i} style={{
            marginBottom: 16, padding: "14px 16px",
            borderRadius: 10, background: P.cream,
            border: `1px solid ${P.border}`,
            borderLeftWidth: 4, borderLeftColor: fmtInfo.color,
          }}>
            {/* Sentence */}
            <p style={{ margin: "0 0 10px", fontSize: 13, color: P.dark, lineHeight: 1.7, fontStyle: "italic" }}>
              "{c.sentence}"
            </p>
            {/* In-text marker */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                background: fmtInfo.color, color: "#FAF8F3",
                fontSize: 10, fontWeight: 700, padding: "2px 9px",
                borderRadius: 12, letterSpacing: "0.06em", fontFamily: "monospace",
              }}>
                {c.inTextCitation}
              </span>
              <span style={{ fontSize: 10, color: P.muted }}>in-text marker</span>
            </div>
            {/* Formatted reference */}
            <div style={{
              background: P.offwhite, border: `1px solid ${P.border}`,
              borderRadius: 6, padding: "9px 13px",
              fontSize: 11.5, color: P.dark, lineHeight: 1.8,
              fontFamily: citationFormat === "ieee" || citationFormat === "acm" ? "monospace" : "'Georgia', serif",
            }}>
              {c.formatted}
            </div>
            {/* Actions row */}
            <div style={{ display: "flex", gap: 8, marginTop: 9, alignItems: "center" }}>
              <button onClick={() => copy(c.formatted, i)}
                style={{
                  padding: "4px 12px",
                  background: copiedIdx === i ? P.mid : "transparent",
                  border: `1px solid ${copiedIdx === i ? P.mid : P.border}`,
                  borderRadius: 6, fontSize: 10, color: copiedIdx === i ? P.offwhite : P.muted,
                  cursor: "pointer", fontFamily: "'Georgia', serif", transition: "all 0.15s",
                }}>
                {copiedIdx === i ? "✓ Copied" : "Copy Citation"}
              </button>
              <button onClick={() => copy(c.inTextCitation, `it-${i}`)}
                style={{
                  padding: "4px 12px",
                  background: copiedIdx === `it-${i}` ? P.mid : "transparent",
                  border: `1px solid ${copiedIdx === `it-${i}` ? P.mid : P.border}`,
                  borderRadius: 6, fontSize: 10, color: copiedIdx === `it-${i}` ? P.offwhite : P.muted,
                  cursor: "pointer", fontFamily: "'Georgia', serif", transition: "all 0.15s",
                }}>
                {copiedIdx === `it-${i}` ? "✓ Copied" : "Copy In-Text"}
              </button>
            </div>
            <RawMetaAccordion raw={c.raw} fmtColor={fmtInfo.color} />
          </div>
        ))}
      </div>

      {/* Bibliography block */}
      {data.bibliography.length > 0 && (
        <div style={{
          marginTop: 28, padding: 22,
          background: P.cream, borderRadius: 12,
          border: `1px solid ${P.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: P.darkest, fontWeight: 700, margin: 0 }}>
              References / Bibliography
            </p>
            <button onClick={copyBib}
              style={{
                padding: "5px 16px", background: copiedBib ? P.mid : P.darkest,
                color: P.offwhite, border: "none", borderRadius: 6,
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Georgia', serif", letterSpacing: "0.10em",
                textTransform: "uppercase", transition: "background 0.15s",
              }}>
              {copiedBib ? "✓ Copied All" : "Copy All"}
            </button>
          </div>
          <ol style={{ margin: 0, paddingLeft: citationFormat === "ieee" || citationFormat === "acm" ? 0 : 20, listStyleType: citationFormat === "ieee" || citationFormat === "acm" ? "none" : "decimal" }}>
            {data.bibliography.map((ref, i) => (
              <li key={i} style={{
                fontSize: 12, color: P.dark, lineHeight: 1.9,
                marginBottom: 6, paddingLeft: citationFormat === "ieee" || citationFormat === "acm" ? 0 : 0,
                fontFamily: citationFormat === "ieee" || citationFormat === "acm" ? "monospace" : "'Georgia', serif",
              }}>
                {ref}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Rich Text Editor Toolbar ──────────────────────────────────────────────────
const FONT_FAMILIES = [
  "Georgia, serif",
  "Times New Roman, serif",
  "Arial, sans-serif",
  "Helvetica, sans-serif",
  "Verdana, sans-serif",
  "Courier New, monospace",
  "Trebuchet MS, sans-serif",
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36];

const COLORS = [
  "#0D2318","#1C3A2A","#2E5C40","#B8962E","#9B2C1A","#3A6B8A",
  "#000000","#333333","#666666","#999999","#CCCCCC","#FFFFFF",
  "#E74C3C","#E67E22","#F1C40F","#2ECC71","#3498DB","#9B59B6",
];

function Toolbar({ editorRef, onUpdate }) {
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [fontSize, setFontSize] = useState(13);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [chartType, setChartType] = useState("bar");

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    onUpdate();
  };

  const applyFont = (family) => { setFontFamily(family); exec("fontName", family); };

  const applySize = (size) => {
    setFontSize(size);
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = size + "px";
    try {
      range.surroundContents(span);
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
    } catch { exec("fontSize", 3); }
    onUpdate();
  };

  const insertTable = () => {
    const rows = parseInt(tableRows), cols = parseInt(tableCols);
    let html = `<table style="border-collapse:collapse;width:100%;margin:12px 0">`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        const isH = r === 0;
        const tag = isH ? "th" : "td";
        html += `<${tag} style="border:1.5px solid #DDD5C0;padding:8px 12px;${isH ? "background:#0D2318;color:#FAF8F3;font-weight:700;text-align:left;" : `background:${r % 2 === 0 ? "#FAF8F3" : "#F5F0E8"};color:#1C3A2A;`}">${isH ? `Header ${c + 1}` : `Cell ${r},${c + 1}`}</${tag}>`;
      }
      html += "</tr>";
    }
    html += "</table>";
    exec("insertHTML", html);
    setShowTable(false);
  };

  const insertChart = () => {
    const id = "chart_" + Date.now();
    exec("insertHTML", `<div id="${id}" style="margin:16px 0;padding:16px;background:#FAF8F3;border:1px solid #DDD5C0;border-radius:8px"><canvas id="${id}_canvas" width="500" height="220" style="display:block;max-width:100%"></canvas><p style="text-align:center;font-size:11px;color:#6B6450;margin:8px 0 0;letter-spacing:0.08em;text-transform:uppercase">Sample ${chartType} chart</p></div>`);
    setTimeout(() => {
      const canvas = document.getElementById(`${id}_canvas`);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const labels = ["Jan","Feb","Mar","Apr","May","Jun"];
      const vals = [42,67,55,80,73,91];
      const w = canvas.width, h = canvas.height;
      const pad = { top:20, right:20, bottom:36, left:44 };
      const cW = w-pad.left-pad.right, cH = h-pad.top-pad.bottom;
      ctx.clearRect(0,0,w,h); ctx.fillStyle="#FAF8F3"; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="#DDD5C0"; ctx.lineWidth=0.5;
      [0,25,50,75,100].forEach(v=>{
        const y=pad.top+cH-(v/100)*cH;
        ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke();
        ctx.fillStyle="#6B6450"; ctx.font="10px Georgia"; ctx.textAlign="right";
        ctx.fillText(v,pad.left-6,y+4);
      });
      const bc=["#0D2318","#B8962E","#2E5C40","#9B2C1A","#3A6B8A","#7A6020"];
      if (chartType==="bar") {
        const bw=(cW/labels.length)*0.6, gap=(cW/labels.length)*0.4;
        labels.forEach((l,i)=>{ const x=pad.left+i*(cW/labels.length)+gap/2, bh=(vals[i]/100)*cH, y=pad.top+cH-bh; ctx.fillStyle=bc[i%bc.length]; ctx.fillRect(x,y,bw,bh); ctx.fillStyle="#1C3A2A"; ctx.font="11px Georgia"; ctx.textAlign="center"; ctx.fillText(l,x+bw/2,pad.top+cH+18); });
      } else if (chartType==="line") {
        ctx.strokeStyle="#B8962E"; ctx.lineWidth=2.5; ctx.beginPath();
        labels.forEach((_,i)=>{ const x=pad.left+i*(cW/(labels.length-1)), y=pad.top+cH-(vals[i]/100)*cH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke();
        labels.forEach((l,i)=>{ const x=pad.left+i*(cW/(labels.length-1)), y=pad.top+cH-(vals[i]/100)*cH; ctx.fillStyle="#0D2318"; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#1C3A2A"; ctx.font="11px Georgia"; ctx.textAlign="center"; ctx.fillText(l,x,pad.top+cH+18); });
      } else if (chartType==="pie") {
        const cx=w/2,cy=h/2-10,r=Math.min(cW,cH)/2-10,total=vals.reduce((a,b)=>a+b,0); let start=-Math.PI/2;
        vals.forEach((v,i)=>{ const angle=(v/total)*Math.PI*2; ctx.fillStyle=bc[i%bc.length]; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+angle); ctx.closePath(); ctx.fill(); const mid=start+angle/2; ctx.fillStyle="#FAF8F3"; ctx.font="bold 11px Georgia"; ctx.textAlign="center"; ctx.fillText(labels[i],cx+Math.cos(mid)*(r*0.65),cy+Math.sin(mid)*(r*0.65)+4); start+=angle; });
      }
    }, 100);
    setShowChart(false); onUpdate();
  };

  const btnStyle = (active=false) => ({
    padding:"5px 8px", background: active?P.darkest:"transparent",
    border:`1px solid ${active?P.gold:P.border}`, borderRadius:5,
    cursor:"pointer", fontSize:12, color:active?P.offwhite:P.dark,
    fontFamily:"'Georgia', serif", lineHeight:1, minWidth:28, textAlign:"center",
    transition:"all 0.15s",
  });
  const divider = <div style={{ width:1, height:22, background:P.border, margin:"0 4px" }} />;

  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:4, padding:"8px 10px", background:P.cream, borderRadius:"8px 8px 0 0", border:`1px solid ${P.border}`, borderBottom:"none" }}>
        <select value={fontFamily} onChange={(e)=>applyFont(e.target.value)} style={{ padding:"4px 6px", fontSize:11, border:`1px solid ${P.border}`, borderRadius:5, background:P.offwhite, color:P.dark, fontFamily:"'Georgia',serif", cursor:"pointer", maxWidth:130 }}>
          {FONT_FAMILIES.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f.split(",")[0]}</option>)}
        </select>
        <select value={fontSize} onChange={(e)=>applySize(parseInt(e.target.value))} style={{ padding:"4px 6px", fontSize:11, border:`1px solid ${P.border}`, borderRadius:5, background:P.offwhite, color:P.dark, fontFamily:"'Georgia',serif", cursor:"pointer", width:60 }}>
          {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
        </select>
        {divider}
        <button style={btnStyle()} onMouseDown={e=>{e.preventDefault();exec("bold");}} title="Bold"><strong>B</strong></button>
        <button style={{...btnStyle(),fontStyle:"italic"}} onMouseDown={e=>{e.preventDefault();exec("italic");}} title="Italic"><em>I</em></button>
        <button style={{...btnStyle(),textDecoration:"underline"}} onMouseDown={e=>{e.preventDefault();exec("underline");}} title="Underline">U</button>
        <button style={{...btnStyle(),textDecoration:"line-through"}} onMouseDown={e=>{e.preventDefault();exec("strikeThrough");}} title="Strikethrough">S</button>
        {divider}
        {[{cmd:"justifyLeft",t:"Left"},{cmd:"justifyCenter",t:"Center"},{cmd:"justifyRight",t:"Right"},{cmd:"justifyFull",t:"Justify"}].map(({cmd,t})=>(
          <button key={cmd} style={btnStyle()} title={t} onMouseDown={e=>{e.preventDefault();exec(cmd);}}>{t[0]}</button>
        ))}
        {divider}
        <button style={btnStyle()} title="Bullet List" onMouseDown={e=>{e.preventDefault();exec("insertUnorderedList");}}>
          <svg width="14" height="12" viewBox="0 0 14 12"><circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/><rect x="4" y="0" width="10" height="2" fill="currentColor"/><circle cx="1.5" cy="6" r="1.5" fill="currentColor"/><rect x="4" y="5" width="10" height="2" fill="currentColor"/><circle cx="1.5" cy="10.5" r="1.5" fill="currentColor"/><rect x="4" y="10" width="10" height="2" fill="currentColor"/></svg>
        </button>
        <button style={btnStyle()} title="Numbered List" onMouseDown={e=>{e.preventDefault();exec("insertOrderedList");}}>
          <svg width="14" height="12" viewBox="0 0 14 12"><text x="0" y="3" fontSize="4" fill="currentColor" fontFamily="Georgia">1.</text><rect x="5" y="0" width="9" height="2" fill="currentColor"/><text x="0" y="8" fontSize="4" fill="currentColor" fontFamily="Georgia">2.</text><rect x="5" y="5" width="9" height="2" fill="currentColor"/><text x="0" y="13" fontSize="4" fill="currentColor" fontFamily="Georgia">3.</text><rect x="5" y="10" width="9" height="2" fill="currentColor"/></svg>
        </button>
        {divider}
        <div style={{position:"relative"}}>
          <button style={{...btnStyle(),borderBottom:"3px solid #E74C3C"}} title="Text Color" onMouseDown={e=>{e.preventDefault();setShowColorPicker(!showColorPicker);setShowBgPicker(false);setShowTable(false);setShowChart(false);}}>A</button>
          {showColorPicker&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:P.offwhite,border:`1px solid ${P.border}`,borderRadius:8,padding:10,boxShadow:"0 8px 24px rgba(13,35,24,0.2)",display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,width:154}}>
              {COLORS.map(c=><button key={c} style={{width:20,height:20,borderRadius:4,background:c,border:`1.5px solid ${P.border}`,cursor:"pointer"}} onMouseDown={e=>{e.preventDefault();exec("foreColor",c);setShowColorPicker(false);}}/>)}
            </div>
          )}
        </div>
        <div style={{position:"relative"}}>
          <button style={{...btnStyle(),borderBottom:"3px solid #F1C40F"}} title="Highlight" onMouseDown={e=>{e.preventDefault();setShowBgPicker(!showBgPicker);setShowColorPicker(false);setShowTable(false);setShowChart(false);}}>
            <svg width="13" height="13" viewBox="0 0 13 13"><rect x="0" y="0" width="13" height="10" rx="2" fill="currentColor" opacity={0.3}/><rect x="0" y="10" width="13" height="3" rx="1" fill="#F1C40F"/></svg>
          </button>
          {showBgPicker&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:P.offwhite,border:`1px solid ${P.border}`,borderRadius:8,padding:10,boxShadow:"0 8px 24px rgba(13,35,24,0.2)",display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,width:154}}>
              {COLORS.map(c=><button key={c} style={{width:20,height:20,borderRadius:4,background:c,border:`1.5px solid ${P.border}`,cursor:"pointer"}} onMouseDown={e=>{e.preventDefault();exec("hiliteColor",c);setShowBgPicker(false);}}/>)}
            </div>
          )}
        </div>
        {divider}
        {["H1","H2","H3"].map(h=><button key={h} style={{...btnStyle(),fontSize:10,fontWeight:700}} title={`Heading ${h[1]}`} onMouseDown={e=>{e.preventDefault();exec("formatBlock",h);}}>{h}</button>)}
        <button style={{...btnStyle(),fontSize:10}} title="Paragraph" onMouseDown={e=>{e.preventDefault();exec("formatBlock","P");}}>¶</button>
        {divider}
        <div style={{position:"relative"}}>
          <button style={btnStyle()} title="Insert Table" onMouseDown={e=>{e.preventDefault();setShowTable(!showTable);setShowChart(false);setShowColorPicker(false);setShowBgPicker(false);}}>
            <svg width="14" height="14" viewBox="0 0 14 14"><rect x="0" y="0" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1"/><line x1="0" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1"/><line x1="5" y1="0" x2="5" y2="14" stroke="currentColor" strokeWidth="1"/><line x1="9" y1="0" x2="9" y2="14" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          {showTable&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:P.offwhite,border:`1px solid ${P.border}`,borderRadius:8,padding:14,boxShadow:"0 8px 24px rgba(13,35,24,0.2)",width:190}}>
              <p style={{margin:"0 0 10px",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:P.gold,fontWeight:700}}>Insert Table</p>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1}}><label style={{fontSize:10,color:P.muted,display:"block",marginBottom:3}}>Rows</label><input type="number" min={1} max={20} value={tableRows} onChange={e=>setTableRows(e.target.value)} style={{width:"100%",padding:"4px 8px",fontSize:12,border:`1px solid ${P.border}`,borderRadius:5,background:P.cream,color:P.dark,boxSizing:"border-box"}}/></div>
                <div style={{flex:1}}><label style={{fontSize:10,color:P.muted,display:"block",marginBottom:3}}>Cols</label><input type="number" min={1} max={10} value={tableCols} onChange={e=>setTableCols(e.target.value)} style={{width:"100%",padding:"4px 8px",fontSize:12,border:`1px solid ${P.border}`,borderRadius:5,background:P.cream,color:P.dark,boxSizing:"border-box"}}/></div>
              </div>
              <button onMouseDown={e=>{e.preventDefault();insertTable();}} style={{width:"100%",padding:"8px 0",background:P.darkest,color:P.offwhite,border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase"}}>Insert</button>
            </div>
          )}
        </div>
        <div style={{position:"relative"}}>
          <button style={btnStyle()} title="Insert Chart" onMouseDown={e=>{e.preventDefault();setShowChart(!showChart);setShowTable(false);setShowColorPicker(false);setShowBgPicker(false);}}>
            <svg width="14" height="14" viewBox="0 0 14 14"><rect x="0" y="4" width="3" height="10" rx="1" fill="currentColor"/><rect x="4" y="0" width="3" height="14" rx="1" fill="currentColor" opacity={0.7}/><rect x="8" y="6" width="3" height="8" rx="1" fill="currentColor" opacity={0.85}/><rect x="12" y="2" width="2" height="12" rx="1" fill="currentColor" opacity={0.6}/></svg>
          </button>
          {showChart&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:P.offwhite,border:`1px solid ${P.border}`,borderRadius:8,padding:14,boxShadow:"0 8px 24px rgba(13,35,24,0.2)",width:190}}>
              <p style={{margin:"0 0 10px",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:P.gold,fontWeight:700}}>Insert Chart</p>
              {[{type:"bar",label:"Bar Chart"},{type:"line",label:"Line Graph"},{type:"pie",label:"Pie Chart"}].map(({type,label})=>(
                <button key={type} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",marginBottom:6,border:`1px solid ${chartType===type?P.gold:P.border}`,borderRadius:6,background:chartType===type?P.darkest:P.cream,color:chartType===type?P.offwhite:P.dark,fontSize:12,cursor:"pointer",fontFamily:"'Georgia',serif"}} onMouseDown={e=>{e.preventDefault();setChartType(type);}}>{label}</button>
              ))}
              <button onMouseDown={e=>{e.preventDefault();insertChart();}} style={{width:"100%",padding:"8px 0",background:P.darkest,color:P.offwhite,border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2}}>Insert</button>
            </div>
          )}
        </div>
        {divider}
        <button style={btnStyle()} title="Undo" onMouseDown={e=>{e.preventDefault();exec("undo");}}>↺</button>
        <button style={btnStyle()} title="Redo" onMouseDown={e=>{e.preventDefault();exec("redo");}}>↻</button>
        <button style={btnStyle()} title="Clear Formatting" onMouseDown={e=>{e.preventDefault();exec("removeFormat");}}>
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><text x="9" y="13" fontSize="7" fill="currentColor" fontFamily="Georgia">A</text></svg>
        </button>
      </div>
    </div>
  );
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value;
      isInitialized.current = true;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <Toolbar editorRef={editorRef} onUpdate={handleInput} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          flex:1, minHeight:220, padding:"14px 16px",
          border:`1px solid ${P.border}`, borderTop:"none",
          borderRadius:"0 0 8px 8px",
          fontSize:13, lineHeight:1.8,
          fontFamily:"'Georgia', serif", color:P.dark,
          background:P.cream, outline:"none",
          overflowY:"auto", cursor:"text",
        }}
        data-placeholder="Paste or type your academic text here…"
      />
      <style>{`
        [contenteditable]:empty:before { content:attr(data-placeholder); color:#999; pointer-events:none; }
        [contenteditable] table { border-collapse:collapse; width:100%; margin:12px 0; }
        [contenteditable] h1 { font-size:22px; color:#0D2318; margin:12px 0 6px; }
        [contenteditable] h2 { font-size:18px; color:#1C3A2A; margin:10px 0 5px; }
        [contenteditable] h3 { font-size:15px; color:#2E5C40; margin:8px 0 4px; }
      `}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const DEFAULT_HTML = `<p>The evolution of collaborative digital frameworks has introduced unprecedented variables into the study of cognitive adaptation. This paper examines how real-time synchronization in scholarly environments facilitates a higher degree of semantic cohesion between geographically disparate researchers. By utilizing conflict-free replicated data types, we observe a reduction in cognitive load during multi-author synthesis. Preliminary findings suggest that the integration of machine-learning citation heuristics allows for a 40% increase in bibliographic accuracy during the drafting phase.</p>`;

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState("plagiarism");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [loading, setLoading] = useState(false);
  const [plagResults, setPlagResults] = useState([]);
  const [mindTree, setMindTree] = useState(null);
  const [citationData, setCitationData] = useState(null);
  const [citationFormat, setCitationFormat] = useState("ieee");
  const [error, setError] = useState("");

  const getPlainText = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.innerText || tmp.textContent || "";
  };

  // Client-side reformat — no API call needed
  const handleReformat = useCallback((newFormat) => {
    setCitationFormat(newFormat);
    if (!citationData) return;
    setCitationData({
      ...citationData,
      citations: citationData.citations.map((c, i) => ({
        ...c,
        formatted: formatCitation(c.raw, newFormat, i + 1),
        inTextCitation: buildInText(c.raw, newFormat, i + 1),
      })),
      bibliography: citationData.citations.map((c, i) =>
        formatCitation(c.raw, newFormat, i + 1)
      ),
    });
  }, [citationData]);

  const runAnalysis = useCallback(async () => {
    const plainText = getPlainText(htmlContent);
    if (!plainText.trim()) return;
    setLoading(true); setError("");
    setPlagResults([]); setMindTree(null); setCitationData(null);
    try {
      if (activeTab === "plagiarism" || activeTab === "heatmap") {
        setPlagResults(await runPlagiarismCheck(plainText));
      } else if (activeTab === "mindmap") {
        setMindTree(await runMindmap(plainText));
      } else if (activeTab === "citations") {
        setCitationData(await runCitationExtraction(plainText, citationFormat));
      }
    } catch {
      setError("Analysis failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [htmlContent, activeTab, citationFormat]);

  const tabs = [
    { id: "plagiarism", label: "Plagiarism Checker", icon: "🔍", desc: "Sentence-level similarity scores" },
    { id: "heatmap",   label: "Visual Heatmap",     icon: "🌡️", desc: "Colour-coded inline overlay"     },
    { id: "mindmap",   label: "Mind Map",            icon: "🧠", desc: "Hierarchical concept graph"       },
    { id: "citations", label: "Citation Generator",  icon: "📖", desc: "IEEE · APA · ACM · Chicago · MLA" },
  ];

  const hasResults = plagResults.length > 0 || mindTree || citationData;

  return (
    <div style={{ minHeight:"100vh", background:P.cream, fontFamily:"'Georgia', serif", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <header style={{ background:P.darkest, color:P.offwhite, padding:"0 40px", height:58, display:"flex", alignItems:"center", gap:16, boxShadow:"0 2px 16px rgba(13,35,24,0.40)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ width:34, height:34, background:P.offwhite, color:P.darkest, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15 }}>U</div>
        <span style={{ fontSize:17, fontWeight:700, letterSpacing:"0.06em" }}>UnderRoot</span>
        <span style={{ width:1, height:20, background:P.mid, margin:"0 4px" }} />
        <span style={{ fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:P.gold }}>Analysis Tools</span>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:10, letterSpacing:"0.10em", textTransform:"uppercase", color:P.muted }}>Scriptorium</span>
      </header>

      {/* Page title strip */}
      <div style={{ padding:"32px 40px 18px", borderBottom:`1px solid ${P.border}` }}>
        <p style={{ margin:0, fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", color:P.gold, fontWeight:400 }}>AI-Powered Research Tools</p>
        <h1 style={{ margin:"6px 0 0", fontSize:24, fontWeight:700, color:P.darkest, letterSpacing:"-0.01em" }}>Manuscript Analysis Suite</h1>
      </div>

      {/* Two-column layout */}
      <div style={{ flex:1, display:"flex", maxWidth:1400, margin:"0 auto", width:"100%", padding:"28px 40px 40px", gap:28 }}>

        {/* Left sidebar */}
        <div style={{ width:340, flexShrink:0 }}>
          <div style={{ background:P.offwhite, borderRadius:14, border:`1px solid ${P.border}`, padding:22, boxShadow:"0 2px 12px rgba(13,35,24,0.06)", position:"sticky", top:78 }}>

            <p style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:P.gold, margin:"0 0 10px", fontWeight:700 }}>Input Manuscript</p>
            <RichEditor value={DEFAULT_HTML} onChange={setHtmlContent} />

            {/* Citation format selector (only for citations tab) */}
            {activeTab === "citations" && (
              <div style={{ marginTop:18 }}>
                <CitationFormatSelector selected={citationFormat} onChange={setCitationFormat} />
              </div>
            )}

            <p style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:P.gold, margin:"18px 0 10px", fontWeight:700 }}>Select Tool</p>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {tabs.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
                    width:"100%", padding:"9px 14px", borderRadius:8,
                    cursor:"pointer", textAlign:"left",
                    display:"flex", alignItems:"center", gap:10,
                    border: active?`1.5px solid ${P.gold}`:`1.5px solid ${P.border}`,
                    background: active?P.darkest:P.cream,
                    color: active?P.offwhite:P.muted,
                    transition:"all 0.18s", fontFamily:"'Georgia', serif",
                  }}>
                    <span style={{ fontSize:16 }}>{t.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:active?700:400 }}>{t.label}</div>
                      <div style={{ fontSize:10, color:active?P.gold:P.border, marginTop:1 }}>{t.desc}</div>
                    </div>
                    {active && <span style={{ color:P.gold, fontSize:10 }}>●</span>}
                  </button>
                );
              })}
            </div>

            <button onClick={runAnalysis} disabled={loading} style={{
              marginTop:16, width:"100%", padding:"13px 0",
              background:loading?P.mid:P.darkest,
              color:loading?P.border:P.offwhite,
              border:"none", borderRadius:8,
              fontSize:10, fontWeight:700, fontFamily:"'Georgia', serif",
              cursor:loading?"not-allowed":"pointer",
              letterSpacing:"0.18em", textTransform:"uppercase",
              transition:"background 0.2s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              boxShadow:loading?"none":"0 2px 8px rgba(13,35,24,0.25)",
            }}>
              {loading ? (
                <>
                  <span style={{ width:12, height:12, border:"2px solid rgba(250,248,243,0.3)", borderTop:`2px solid ${P.gold}`, borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  Analysing…
                </>
              ) : <><span style={{ color:P.gold }}>✦</span> Run Analysis</>}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {error && <p style={{ color:"#9B2C1A", fontSize:11, marginTop:10, lineHeight:1.5 }}>{error}</p>}

            <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(184,150,46,0.07)", border:"1px solid rgba(184,150,46,0.28)", borderRadius:8, fontSize:10, color:P.muted, lineHeight:1.7 }}>
              <span style={{ color:P.gold, fontWeight:700, letterSpacing:"0.06em" }}>TIP — </span>
              {activeTab === "citations"
                ? "Pick a format above, run analysis. Switch formats instantly with the Reformat buttons — no extra API call needed."
                : "Works best with 3–10 sentence academic paragraphs. Use the toolbar to format your text."}
            </div>
          </div>
        </div>

        {/* Right results panel */}
        <div style={{ flex:1 }}>
          <div style={{ background:P.offwhite, borderRadius:14, border:`1px solid ${P.border}`, minHeight:540, padding:32, boxShadow:"0 2px 12px rgba(13,35,24,0.06)" }}>

            {/* Panel header */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, paddingBottom:18, borderBottom:`2px solid ${P.cream}` }}>
              <div style={{ width:40, height:40, background:P.darkest, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 2px 8px rgba(13,35,24,0.20)" }}>
                {tabs.find(t=>t.id===activeTab)?.icon}
              </div>
              <div>
                <h2 style={{ fontSize:19, fontWeight:700, color:P.darkest, margin:0, letterSpacing:"-0.01em" }}>
                  {tabs.find(t=>t.id===activeTab)?.label}
                  {activeTab === "citations" && (
                    <span style={{
                      marginLeft:10, fontSize:11, fontWeight:400,
                      background:CITATION_FORMATS.find(f=>f.id===citationFormat)?.color||P.mid,
                      color:"#FAF8F3", padding:"2px 10px", borderRadius:12,
                      verticalAlign:"middle", letterSpacing:"0.06em",
                    }}>
                      {CITATION_FORMATS.find(f=>f.id===citationFormat)?.label}
                    </span>
                  )}
                </h2>
                <p style={{ fontSize:9, color:P.gold, margin:0, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:2 }}>
                  AI-Powered · UnderRoot Scriptorium
                </p>
              </div>
            </div>

            {/* Empty state */}
            {!loading && !hasResults && (
              <div style={{ textAlign:"center", paddingTop:80 }}>
                <div style={{ fontSize:56, marginBottom:16, opacity:0.4 }}>
                  {tabs.find(t=>t.id===activeTab)?.icon}
                </div>
                <p style={{ fontSize:15, color:P.muted, fontStyle:"italic", lineHeight:1.7 }}>
                  {activeTab === "citations"
                    ? <>Choose a format in the sidebar, then click <strong style={{ color:P.gold, fontStyle:"normal" }}>Run Analysis</strong>.</>
                    : <>Paste your text, format with the toolbar, then click <strong style={{ color:P.gold, fontStyle:"normal" }}>Run Analysis</strong>.</>}
                </p>
                {activeTab === "citations" && (
                  <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:20, flexWrap:"wrap" }}>
                    {CITATION_FORMATS.map(f=>(
                      <span key={f.id} style={{ padding:"4px 14px", borderRadius:20, border:`1.5px solid ${f.color}`, color:f.color, fontSize:11, fontWeight:700, letterSpacing:"0.06em" }}>{f.label}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign:"center", paddingTop:100 }}>
                <div style={{ width:44, height:44, border:`3px solid ${P.border}`, borderTop:`3px solid ${P.gold}`, borderRadius:"50%", animation:"spin 0.75s linear infinite", margin:"0 auto 20px" }} />
                <p style={{ color:P.muted, fontSize:14, fontStyle:"italic" }}>
                  {activeTab === "citations"
                    ? `Generating ${CITATION_FORMATS.find(f=>f.id===citationFormat)?.label || ""} citations…`
                    : "The AI is reviewing your manuscript…"}
                </p>
              </div>
            )}

            {/* Plagiarism list */}
            {!loading && activeTab === "plagiarism" && plagResults.length > 0 && (
              <div>
                <ScoreSummary results={plagResults} />
                <Legend />
                <div style={{ borderTop:`1px solid ${P.border}`, paddingTop:20 }}>
                  <p style={{ fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", color:P.darkest, fontWeight:700, marginBottom:14 }}>Sentence-Level Breakdown</p>
                  {plagResults.map((r,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:10, padding:"12px 16px", borderRadius:8, background:heatBg(r.score), borderLeft:`4px solid ${heatColor(r.score)}` }}>
                      <span style={{ minWidth:42, textAlign:"center", fontWeight:700, fontSize:14, color:heatColor(r.score), fontFamily:"'Georgia', serif" }}>{r.score}%</span>
                      <div>
                        <p style={{ margin:0, fontSize:13, color:P.dark, lineHeight:1.7 }}>{r.sentence}</p>
                        {r.source && <p style={{ margin:"5px 0 0", fontSize:11, color:P.muted, fontStyle:"italic" }}>↳ {r.source}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Heatmap */}
            {!loading && activeTab === "heatmap" && plagResults.length > 0 && (
              <div>
                <ScoreSummary results={plagResults} />
                <Legend />
                <div style={{ borderTop:`1px solid ${P.border}`, paddingTop:20 }}>
                  <PlagiarismHeatmap results={plagResults} />
                </div>
              </div>
            )}

            {/* Mindmap */}
            {!loading && activeTab === "mindmap" && mindTree && (
              <div>
                <p style={{ fontSize:12, color:P.muted, fontStyle:"italic", marginBottom:16 }}>
                  Hierarchical concept map derived from your text. Node colour reflects conceptual depth.
                </p>
                <div style={{ background:P.cream, borderRadius:12, padding:12, border:`1px solid ${P.border}`, overflowX:"auto" }}>
                  <MindMapSVG tree={mindTree} />
                </div>
                <div style={{ marginTop:14, display:"flex", gap:12, flexWrap:"wrap" }}>
                  {[{label:"Root",fill:"#0D2318"},{label:"Branch",fill:"#B8962E"},{label:"Sub-branch",fill:"#2E5C40"},{label:"Concept",fill:"#7A6020"},{label:"Detail",fill:"#3D7A5A"}].map(it=>(
                    <div key={it.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                      <span style={{ width:11, height:11, borderRadius:3, background:it.fill, display:"inline-block" }} />
                      <span style={{ color:P.muted }}>{it.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {!loading && activeTab === "citations" && citationData && (
              <CitationResults
                data={citationData}
                citationFormat={citationFormat}
                onReformat={(newFmt) => {
                  handleReformat(newFmt);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}