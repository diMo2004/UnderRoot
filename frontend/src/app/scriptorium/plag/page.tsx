"use client";

import { useState, useCallback } from "react";

// ── UnderRoot Brand Palette ───────────────────────────────────────────────────
// Cream bg:       #F5F0E8   (page background)
// Very dark green:#0D2318   (header, primary buttons, root nodes)
// Dark green:     #1C3A2A   (body text, card text)
// Mid green:      #2E5C40   (branch nodes, hover)
// Gold accent:    #B8962E   (highlights, borders, accents)
// Off-white:      #FAF8F3   (card backgrounds)
// Muted text:     #6B6450   (secondary text)
// Border:         #DDD5C0   (dividers, card borders)

type Tab = "plagiarism" | "mindmap" | "heatmap";

interface PlagiarismResult {
  sentence: string;
  score: number;
  source?: string;
}

interface MindNode {
  id: string;
  label: string;
  children: MindNode[];
  x?: number;
  y?: number;
  depth?: number;
}

function heatColor(score: number): string {
  if (score >= 80) return "#9B2C1A";
  if (score >= 60) return "#B85C2A";
  if (score >= 40) return "#B8962E";
  if (score >= 20) return "#2E5C40";
  return "#3A6B8A";
}

function heatBg(score: number): string {
  if (score >= 80) return "rgba(155,44,26,0.09)";
  if (score >= 60) return "rgba(184,92,42,0.09)";
  if (score >= 40) return "rgba(184,150,46,0.10)";
  if (score >= 20) return "rgba(46,92,64,0.09)";
  return "rgba(58,107,138,0.07)";
}

async function runPlagiarismCheck(text: string): Promise<PlagiarismResult[]> {
  console.log("Starting plagiarism check for text:", text.slice(0, 50) + "...");
  try {
    const baseUrl = typeof window !== "undefined" ? "http://localhost:4000" : "";
    const res = await fetch(`${baseUrl}/api/ai/plagiarism/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    console.log("Plagiarism check response status:", res.status);
    
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Server returned error:", errorText);
      throw new Error(`Server error: ${res.status}`);
    }

    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      console.log("Plagiarism check data received:", data);
      return data.results || data;
    } else {
      const textResult = await res.text();
      console.error("Expected JSON but got:", textResult.slice(0, 500));
      throw new Error("Invalid response format");
    }
  } catch (err) {
    console.error("Plagiarism check error:", err);
    throw err;
  }
}

async function runMindmap(text: string): Promise<MindNode> {
  try {
    const res = await fetch("/api/ai/mindmap/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Mindmap error:", err);
    throw err;
  }
}

function layoutTree(node: MindNode, x: number, y: number, depth: number): MindNode {
  node.x = x; node.y = y; node.depth = depth;
  const spread = 155 - depth * 25;
  const totalH = (node.children.length - 1) * spread;
  node.children.forEach((child, i) =>
    layoutTree(child, x + 215, y - totalH / 2 + i * spread, depth + 1));
  return node;
}

function flatNodes(node: MindNode, arr: MindNode[] = []): MindNode[] {
  arr.push(node);
  node.children.forEach((c) => flatNodes(c, arr));
  return arr;
}

function flatEdges(node: MindNode, edges: { x1: number; y1: number; x2: number; y2: number }[] = []) {
  node.children.forEach((c) => {
    edges.push({ x1: node.x!, y1: node.y!, x2: c.x!, y2: c.y! });
    flatEdges(c, edges);
  });
  return edges;
}

const depthFill   = ["#0D2318", "#B8962E", "#2E5C40", "#7A6020", "#3D7A5A"];
const depthStroke = ["#B8962E", "#0D2318", "#B8962E", "#DDD5C0", "#B8962E"];

function MindMapSVG({ tree }: { tree: MindNode }) {
  const laid = layoutTree(JSON.parse(JSON.stringify(tree)), 110, 320, 0);
  const nodes = flatNodes(laid);
  const edges = flatEdges(laid);
  const maxX = Math.max(...nodes.map((n) => n.x!)) + 130;
  const maxY = Math.max(...nodes.map((n) => n.y!)) + 60;
  const minY = Math.min(...nodes.map((n) => n.y!)) - 60;
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
        const d = Math.min(n.depth!, 4);
        const isRoot = d === 0;
        const w = isRoot ? 130 : 110; const h = isRoot ? 44 : 34;
        const label = n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label;
        return (
          <g key={n.id} transform={`translate(${n.x! - w / 2},${n.y! - h / 2})`}>
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

function PlagiarismHeatmap({ results }: { results: PlagiarismResult[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div style={{ position: "relative" }}>
      <p style={{ fontSize: 12, color: "#6B6450", marginBottom: 14, fontStyle: "italic" }}>
        Hover any sentence to inspect its similarity score and probable source.
      </p>
      <div style={{ fontSize: 15, fontFamily: "'Georgia', serif", lineHeight: 2.2, color: "#1C3A2A" }}>
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
                background: "#0D2318", color: "#FAF8F3", fontSize: 11,
                borderRadius: 6, padding: "7px 12px", whiteSpace: "nowrap",
                zIndex: 99, boxShadow: "0 6px 20px rgba(13,35,24,0.35)",
                pointerEvents: "none", border: "1px solid #B8962E",
              }}>
                <span style={{ color: heatColor(r.score), fontWeight: 700 }}>{r.score}% similarity</span>
                {r.source && <span style={{ color: "#DDD5C0" }}> · {r.source}</span>}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreSummary({ results }: { results: PlagiarismResult[] }) {
  const avg = Math.round(results.reduce((a, b) => a + b.score, 0) / results.length);
  const high = results.filter((r) => r.score >= 60).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Overall Similarity", value: `${avg}%`,          color: heatColor(avg) },
        { label: "High-Risk Sentences", value: String(high),      color: "#9B2C1A"      },
        { label: "Total Sentences",     value: String(results.length), color: "#0D2318"  },
      ].map((s) => (
        <div key={s.label} style={{
          background: "#F5F0E8", border: "1px solid #DDD5C0",
          borderRadius: 10, padding: "14px 16px", textAlign: "center",
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'Georgia', serif" }}>{s.value}</div>
          <div style={{ fontSize: 10, color: "#6B6450", marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
      {[
        { label: "0–19%",   color: "#3A6B8A" },
        { label: "20–39%",  color: "#2E5C40" },
        { label: "40–59%",  color: "#B8962E" },
        { label: "60–79%",  color: "#B85C2A" },
        { label: "80–100%", color: "#9B2C1A" },
      ].map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: it.color, display: "inline-block" }} />
          <span style={{ color: "#6B6450" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("plagiarism");
  const [text, setText] = useState(
    "The evolution of collaborative digital frameworks has introduced unprecedented variables into the study of cognitive adaptation. This paper examines how real-time synchronization in scholarly environments facilitates a higher degree of semantic cohesion between geographically disparate researchers. By utilizing conflict-free replicated data types, we observe a reduction in cognitive load during multi-author synthesis. Preliminary findings suggest that the integration of machine-learning citation heuristics allows for a 40% increase in bibliographic accuracy during the drafting phase."
  );
  const [loading, setLoading] = useState(false);
  const [plagResults, setPlagResults] = useState<PlagiarismResult[]>([]);
  const [mindTree, setMindTree] = useState<MindNode | null>(null);
  const [error, setError] = useState("");

  const runAnalysis = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true); setError(""); setPlagResults([]); setMindTree(null);
    try {
      if (activeTab === "plagiarism" || activeTab === "heatmap") {
        setPlagResults(await runPlagiarismCheck(text));
      } else {
        setMindTree(await runMindmap(text));
      }
    } catch { setError("Analysis failed. Please check your connection and try again."); }
    finally   { setLoading(false); }
  }, [text, activeTab]);

  const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
    { id: "plagiarism", label: "Plagiarism Checker", icon: "🔍", desc: "Sentence-level similarity scores" },
    { id: "heatmap",   label: "Visual Heatmap",     icon: "🌡️", desc: "Colour-coded inline overlay"     },
    { id: "mindmap",   label: "Mind Map",            icon: "🧠", desc: "Hierarchical concept graph"       },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        background: "#0D2318", color: "#FAF8F3",
        padding: "0 40px", height: 58,
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 2px 16px rgba(13,35,24,0.40)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          width: 34, height: 34, background: "#FAF8F3", color: "#0D2318",
          borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 15,
        }}>U</div>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.06em" }}>UnderRoot</span>
        <span style={{ width: 1, height: 20, background: "#2E5C40", margin: "0 4px" }} />
        <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B8962E" }}>
          Analysis Tools
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: "#6B6450" }}>
          Scriptorium
        </span>
      </header>

      {/* Page title strip */}
      <div style={{ padding: "32px 40px 18px", borderBottom: "1px solid #DDD5C0" }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8962E", fontWeight: 400 }}>
          AI-Powered Research Tools
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: "#0D2318", letterSpacing: "-0.01em" }}>
          Manuscript Analysis Suite
        </h1>
      </div>

      {/* Two-column layout */}
      <div style={{
        flex: 1, display: "flex",
        maxWidth: 1320, margin: "0 auto", width: "100%",
        padding: "28px 40px 40px", gap: 28,
      }}>

        {/* Left sidebar */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{
            background: "#FAF8F3", borderRadius: 14, border: "1px solid #DDD5C0",
            padding: 22, boxShadow: "0 2px 12px rgba(13,35,24,0.06)",
            position: "sticky", top: 78,
          }}>
            <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8962E", margin: "0 0 10px", fontWeight: 700 }}>
              Input Text
            </p>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={13}
              placeholder="Paste your academic text here…"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #DDD5C0", borderRadius: 8,
                padding: "12px 14px", fontSize: 13, lineHeight: 1.7,
                fontFamily: "'Georgia', serif", resize: "vertical",
                outline: "none", background: "#F5F0E8", color: "#1C3A2A",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#B8962E")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#DDD5C0")}
            />

            <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8962E", margin: "18px 0 10px", fontWeight: 700 }}>
              Select Tool
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {tabs.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                    width: "100%", padding: "9px 14px", borderRadius: 8,
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                    border: active ? "1.5px solid #B8962E" : "1.5px solid #DDD5C0",
                    background: active ? "#0D2318" : "#F5F0E8",
                    color: active ? "#FAF8F3" : "#6B6450",
                    transition: "all 0.18s",
                  }}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: active ? 700 : 400 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: active ? "#B8962E" : "#DDD5C0", marginTop: 1 }}>{t.desc}</div>
                    </div>
                    {active && <span style={{ color: "#B8962E", fontSize: 10 }}>●</span>}
                  </button>
                );
              })}
            </div>

            <button onClick={runAnalysis} disabled={loading || !text.trim()} style={{
              marginTop: 16, width: "100%", padding: "13px 0",
              background: loading ? "#2E5C40" : "#0D2318",
              color: loading ? "#DDD5C0" : "#FAF8F3",
              border: "none", borderRadius: 8,
              fontSize: 10, fontWeight: 700, fontFamily: "'Georgia', serif",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.18em", textTransform: "uppercase",
              transition: "background 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: loading ? "none" : "0 2px 8px rgba(13,35,24,0.25)",
            }}>
              {loading ? (
                <>
                  <span style={{
                    width: 12, height: 12, border: "2px solid rgba(250,248,243,0.3)",
                    borderTop: "2px solid #B8962E", borderRadius: "50%",
                    display: "inline-block", animation: "spin 0.7s linear infinite",
                  }} />
                  Analysing…
                </>
              ) : <><span style={{ color: "#B8962E" }}>✦</span> Run Analysis</>}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {error && <p style={{ color: "#9B2C1A", fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>{error}</p>}

            <div style={{
              marginTop: 16, padding: "10px 14px",
              background: "rgba(184,150,46,0.07)", border: "1px solid rgba(184,150,46,0.28)",
              borderRadius: 8, fontSize: 10, color: "#6B6450", lineHeight: 1.7,
            }}>
              <span style={{ color: "#B8962E", fontWeight: 700, letterSpacing: "0.06em" }}>TIP — </span>
              Works best with 3–10 sentence academic paragraphs.
            </div>
          </div>
        </div>

        {/* Right results panel */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: "#FAF8F3", borderRadius: 14, border: "1px solid #DDD5C0",
            minHeight: 540, padding: 32, boxShadow: "0 2px 12px rgba(13,35,24,0.06)",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14, marginBottom: 24,
              paddingBottom: 18, borderBottom: "2px solid #F5F0E8",
            }}>
              <div style={{
                width: 40, height: 40, background: "#0D2318", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 2px 8px rgba(13,35,24,0.20)",
              }}>
                {tabs.find((t) => t.id === activeTab)?.icon}
              </div>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0D2318", margin: 0, letterSpacing: "-0.01em" }}>
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p style={{ fontSize: 9, color: "#B8962E", margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
                  AI-Powered · UnderRoot Scriptorium
                </p>
              </div>
            </div>

            {/* Empty state */}
            {!loading && plagResults.length === 0 && !mindTree && (
              <div style={{ textAlign: "center", paddingTop: 100 }}>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>
                  {tabs.find((t) => t.id === activeTab)?.icon}
                </div>
                <p style={{ fontSize: 15, color: "#6B6450", fontStyle: "italic", lineHeight: 1.7 }}>
                  Paste your text and click{" "}
                  <strong style={{ color: "#B8962E", fontStyle: "normal" }}>Run Analysis</strong> to begin.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", paddingTop: 100 }}>
                <div style={{
                  width: 44, height: 44, border: "3px solid #DDD5C0",
                  borderTop: "3px solid #B8962E", borderRadius: "50%",
                  animation: "spin 0.75s linear infinite", margin: "0 auto 20px",
                }} />
                <p style={{ color: "#6B6450", fontSize: 14, fontStyle: "italic" }}>
                  The AI is reviewing your manuscript…
                </p>
              </div>
            )}

            {/* Plagiarism list */}
            {!loading && activeTab === "plagiarism" && plagResults.length > 0 && (
              <div>
                <ScoreSummary results={plagResults} />
                <Legend />
                <div style={{ borderTop: "1px solid #DDD5C0", paddingTop: 20 }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0D2318", fontWeight: 700, marginBottom: 14 }}>
                    Sentence-Level Breakdown
                  </p>
                  {plagResults.map((r, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      marginBottom: 10, padding: "12px 16px", borderRadius: 8,
                      background: heatBg(r.score), borderLeft: `4px solid ${heatColor(r.score)}`,
                    }}>
                      <span style={{ minWidth: 42, textAlign: "center", fontWeight: 700, fontSize: 14, color: heatColor(r.score), fontFamily: "'Georgia', serif" }}>
                        {r.score}%
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "#1C3A2A", lineHeight: 1.7 }}>{r.sentence}</p>
                        {r.source && <p style={{ margin: "5px 0 0", fontSize: 11, color: "#6B6450", fontStyle: "italic" }}>↳ {r.source}</p>}
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
                <div style={{ borderTop: "1px solid #DDD5C0", paddingTop: 20 }}>
                  <PlagiarismHeatmap results={plagResults} />
                </div>
              </div>
            )}

            {/* Mindmap */}
            {!loading && activeTab === "mindmap" && mindTree && (
              <div>
                <p style={{ fontSize: 12, color: "#6B6450", fontStyle: "italic", marginBottom: 16 }}>
                  Hierarchical concept map derived from your text. Node colour reflects conceptual depth.
                </p>
                <div style={{ background: "#F5F0E8", borderRadius: 12, padding: 12, border: "1px solid #DDD5C0", overflowX: "auto" }}>
                  <MindMapSVG tree={mindTree} />
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "Root",       fill: "#0D2318" },
                    { label: "Branch",     fill: "#B8962E" },
                    { label: "Sub-branch", fill: "#2E5C40" },
                    { label: "Concept",    fill: "#7A6020" },
                    { label: "Detail",     fill: "#3D7A5A" },
                  ].map((it) => (
                    <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: it.fill, display: "inline-block" }} />
                      <span style={{ color: "#6B6450" }}>{it.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}