"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { projectAPI } from '@/lib/api';
import {
  Feather, ShieldCheck, Users, Search,
  MessageSquare, Settings, Share2,
  ChevronLeft, ChevronRight, History,
  Binary, CheckCircle2, Sparkles, BookOpen,
  Loader2, FileText, AlignLeft, BookMarked,
  Check, X, Plus, Trash2, Edit3,
  RefreshCw, Download, Copy, ZapIcon,
  ScanSearch, Bold, Italic, Underline as UnderlineIcon,
  Palette, Image as ImageIcon, Table as TableIcon,
  BarChart3, Type, List, ListOrdered, Quote,
  AlignLeft as AlignLeftIcon, AlignCenter, AlignRight, AlignJustify,
  Library, Link as LinkIcon, Heading1, Heading2,
  TableProperties, PlusSquare, MinusSquare,
  Undo2, Redo2, Eraser, Upload, Globe,
  PanelTop, PanelBottom, Scissors, FilePlus, Sigma
} from 'lucide-react';
import TipTap from '@/components/Editor/TipTap';

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const FORMATS = {
  IEEE: {
    label: "IEEE",
    description: "Numbered references, technical journals",
    inText: (id: any) => `[${id}]`,
    bibliography: (c: any, id: any) => `[${id}] ${c.author}, "${c.title}," ${c.source}, ${c.year}.`,
    bodyFont: "'Times New Roman', serif",
    fontSize: "12px",
    lineHeight: "1.3",
    align: "justify",
    color: "#000",
    columns: 2,
    columnGap: "24px",
  },
  APA: {
    label: "APA",
    description: "Author-date style, social sciences",
    inText: (_: any, c: any) => `(${c.author.split(",")[0]}, ${c.year})`,
    bibliography: (c: any) => `${c.author} (${c.year}). ${c.title}. ${c.source}.`,
    bodyFont: "'Georgia', serif",
    fontSize: "18px",
    lineHeight: "2",
    align: "justify",
    color: "#1A2F23",
  },
  ACM: {
    label: "ACM",
    description: "Superscript refs, computing",
    inText: (id: any) => `[${id}]`,
    bibliography: (c: any, id: any) => `${id}. ${c.author} ${c.year}. ${c.title}. ${c.source}.`,
    bodyFont: "'Palatino Linotype', serif",
    fontSize: "17px",
    lineHeight: "1.75",
    align: "left",
    color: "#1a2a3a",
  },
};

const convertToLaTeX = (json: any) => {
  let latex = "\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\begin{document}\n\n";
  
  const processNodes = (nodes: any[]) => {
    nodes.forEach(node => {
      switch (node.type) {
        case 'heading':
          const level = node.attrs.level;
          const cmd = level === 1 ? 'section' : 'subsection';
          latex += `\\${cmd}{${node.content?.[0]?.text || ''}}\n\n`;
          break;
        case 'paragraph':
          node.content?.forEach((c: any) => {
            if (c.type === 'inlineMath') {
              latex += `$${c.attrs.latex}$`;
            } else if (c.type === 'text') {
              let text = c.text || '';
              if (c.marks?.some((m: any) => m.type === 'bold')) text = `\\textbf{${text}}`;
              if (c.marks?.some((m: any) => m.type === 'italic')) text = `\\textit{${text}}`;
              latex += text;
            }
          });
          latex += "\n\n";
          break;
        case 'mathBlock':
          latex += `\\begin{equation*}\n${node.attrs.latex}\n\\end{equation*}\n\n`;
          break;
        case 'bulletList':
          latex += "\\begin{itemize}\n";
          node.content?.forEach((item: any) => {
            latex += "  \\item ";
            processNodes(item.content);
          });
          latex += "\\end{itemize}\n\n";
          break;
      }
    });
  };

  if (json.content) processNodes(json.content);
  latex += "\\end{document}";
  return latex;
};

const MOCK_CITATIONS: any[] = [];
const COLLABORATORS: any[] = [];

const s = {
  bg: "#FCFBF7", text: "#1A2F23", accent: "#B48E4D",
  border: "rgba(26, 47, 35, 0.1)", sidebarBg: "#F3F1E9",
  green: "#1A2F23", greenHover: "#2D4D3A",
};

// Global styles for TipTap
const GLOBAL_STYLES = `
  .ProseMirror img.ProseMirror-selectednode {
    outline: 3px solid #B48E4D !important;
    box-shadow: 0 0 10px rgba(180, 142, 77, 0.5);
  }
  .ProseMirror .tableWrapper {
    margin: 1rem 0;
    overflow-x: auto;
  }
  .ProseMirror table.ProseMirror-selectednode {
    outline: 2px solid #B48E4D;
  }
  
  /* IEEE Formatting Overrides */
  .format-IEEE h1 {
    column-span: all !important;
    text-align: center !important;
    font-size: 24px !important;
    margin-bottom: 24px !important;
    font-family: 'Times New Roman', serif !important;
  }
  .format-IEEE h2 {
    text-align: center;
    font-variant: small-caps;
    text-transform: lowercase;
    font-size: 12px;
    margin-top: 16px;
    margin-bottom: 8px;
  }
  .format-IEEE p {
    text-indent: 14px;
    margin-bottom: 0;
  }
`;

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: s.accent,
          animation: `bounce 0.9s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </span>
  );
}

function CitationCard({ cite, format, onInsert, hovered, onHover }: any) {
  const fmt = (FORMATS as any)[format];
  const bib = fmt.bibliography(cite, cite.id);
  return (
    <div
      onMouseEnter={() => onHover(cite.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: 16, background: '#fff', borderRadius: 2, cursor: 'pointer',
        border: `1px solid ${hovered ? s.accent : 'rgba(26,47,35,0.07)'}`,
        transition: 'border-color 0.2s', marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cite.source}</div>
        {cite.verified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#166534', fontWeight: 700 }}>
            <CheckCircle2 size={10} /> DOI Verified
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{cite.title}</div>
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 8 }}>{cite.author} ({cite.year})</div>
      <div style={{ fontSize: 9, fontFamily: 'monospace', background: '#F3F1E9', padding: '4px 8px', borderRadius: 2, opacity: 0.7, marginBottom: 10 }}>
        {bib.length > 70 ? bib.slice(0, 68) + '…' : bib}
      </div>
      <button
        onClick={() => onInsert(cite)}
        style={{
          width: '100%', padding: '7px 0',
          border: `1px solid rgba(26,47,35,0.1)`,
          fontSize: 8, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
          background: hovered ? s.green : 'transparent',
          color: hovered ? '#fff' : s.text,
          transition: 'all 0.2s', borderRadius: 1,
        }}
      >+ Insert {format} Citation</button>
    </div>
  );
}

function AICitationPanel({ editor, insertedCitations, format, onInsert, projectId }: any) {
  const [query, setQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [docSuggestions, setDocSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCite, setHoveredCite] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('suggested');

  const searchCitations = useCallback(async (isDocSearch = false) => {
    const textToSearch = isDocSearch ? editor?.getText() : query;
    if (!textToSearch?.trim()) return;
    setLoading(true);
    setError(null);
    if (!isDocSearch) setAiSuggestions([]);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const axios = (await import('axios')).default;
      const res = await axios.post(`${backendUrl}/api/citations/suggest`, {
        text: textToSearch,
        projectId,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('underroot_token')}` }
      });
      const data = res.data;
      const citations = data?.citations || [];
      const mapped = citations.map((c: any, i: number) => ({
        id: (isDocSearch ? 200 : 100) + i,
        author: (c.authors || []).join(', ') || 'Unknown',
        year: c.year || 2024,
        title: c.title || 'Untitled',
        source: c.venue || c.provider || 'Academic Source',
        doi: c.doi || '',
        paper_id: c.paper_id || c.paperId || `ai-${i}`,
        verified: !!c.doi,
      }));
      if (isDocSearch) setDocSuggestions(mapped);
      else setAiSuggestions(mapped);
    } catch (e) {
      console.error('Citation search error:', e);
      setError('Could not fetch AI suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, editor, projectId]);

  const allCites = activeTab === 'suggested' ? docSuggestions : aiSuggestions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          {['suggested', 'ai-search'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px 4px', fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              border: 'none', cursor: 'pointer', background: 'transparent',
              color: s.text, opacity: activeTab === tab ? 1 : 0.4,
              borderBottom: activeTab === tab ? `2px solid ${s.accent}` : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.2s',
            }}>
              {tab === 'suggested' ? 'Suggested' : 'AI Search'}
            </button>
          ))}
        </div>

        {activeTab === 'ai-search' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchCitations(false)}
                placeholder="e.g. machine learning in neuroscience"
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 11,
                  border: `1px solid ${s.border}`, borderRadius: 2,
                  background: '#fff', color: s.text, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => searchCitations(false)}
                disabled={loading || !query.trim()}
                style={{
                  padding: '8px 12px', background: s.green, color: '#fff',
                  border: 'none', borderRadius: 2, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                  opacity: (!query.trim() || loading) ? 0.5 : 1,
                }}
              >
                {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                Search
              </button>
            </div>
            {error && <p style={{ fontSize: 10, color: '#dc2626', marginTop: 6 }}>{error}</p>}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={11} />
        {loading ? 'Analyzing Manuscript…' : `${allCites.length} Results`}
        {loading && <LoadingDots />}
      </div>

      {activeTab === 'suggested' && docSuggestions.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Sparkles size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ fontSize: 11, fontStyle: 'italic', opacity: 0.6, marginBottom: 16 }}>
            Scan your manuscript to generate contextual citation recommendations.
          </p>
          <button 
            onClick={() => searchCitations(true)}
            style={{
              padding: '8px 16px', background: s.green, color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto'
            }}
          >
            <Search size={12} /> Scan Document
          </button>
        </div>
      )}

      {allCites.length === 0 && !loading && activeTab === 'ai-search' && (
        <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4 }}>
          <Sparkles size={24} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 11, fontStyle: 'italic' }}>Enter a topic to find AI-suggested citations</p>
        </div>
      )}

      {allCites.map(cite => (
        <CitationCard
          key={cite.id}
          cite={cite}
          format={format}
          onInsert={onInsert}
          hovered={hoveredCite === cite.id}
          onHover={setHoveredCite}
        />
      ))}

      {insertedCitations.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${s.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 10 }}>Inserted Bibliography</div>
          {insertedCitations.map((c: any, i: number) => (
            <div key={c.citationId || i} style={{ fontSize: 10, padding: '6px 0', borderBottom: `1px solid ${s.border}`, lineHeight: 1.5, opacity: 0.7 }}>
              {(FORMATS as any)[format].bibliography(c, i + 1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormattingPanel({ format, setFormat, editor, showNotif }: any) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const applyFormat = async (fmt: any) => {
    setApplying(true);
    setApplied(false);
    await new Promise(r => setTimeout(r, 800));
    setFormat(fmt);
    setApplying(false);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
    // Trigger pagination after format change
    requestAnimationFrame(() => (editor as any)?.__triggerPagination?.('format'));
  };

  const proofreadWithAI = async () => {
    setApplying(true);
    try {
      const { from, to } = editor.state.selection;
      const isSelection = from !== to;
      const textToProcess = isSelection 
        ? editor.state.doc.textBetween(from, to, ' ') 
        : editor.getText();

      const axiosRes = await (await import('axios')).default.post(
        "/api/ai/reformat/proofread",
        {
          text: textToProcess
        }
      );
      
      const rewrittenText = axiosRes.data?.rewrittenText;
      console.log("AI Proofread Response:", rewrittenText);
      if (rewrittenText && editor) {
        const currentDocLength = editor.state.doc.content.size;
        if (isSelection) {
          // Check if selection is still valid
          const safeFrom = Math.min(from, currentDocLength);
          const safeTo = Math.min(to, currentDocLength);
          editor.chain().focus().insertContentAt({ from: safeFrom, to: safeTo }, rewrittenText).run();
        } else {
          editor.commands.setContent(rewrittenText);
        }
        showNotif("Text proofread and cleaned");
        // Trigger pagination after AI cleanup
        requestAnimationFrame(() => (editor as any)?.__triggerPagination?.('cleanup'));
      } else if (!rewrittenText) {
        showNotif("AI returned empty result", "error");
      }
    } catch (e: any) {
      console.error("AI Proofread failed:", e);
      const status = e.response?.status;
      if (status === 429) {
        showNotif("AI Rate limit reached. Try again in a minute.", "error");
      } else {
        showNotif(`Proofread failed: ${e.message}`, "error");
      }
    }
    setApplying(false);
  };

  const reformatWithAI = async () => {
    setApplying(true);
    try {
      const { from, to } = editor.state.selection;
      const isSelection = from !== to;
      const textToProcess = isSelection 
        ? editor.state.doc.textBetween(from, to, ' ') 
        : editor.getText();

      const axiosRes = await (await import('axios')).default.post(
        "/api/ai/reformat/rewrite",
        {
          text: textToProcess,
          format: format
        }
      );
      
      const rewrittenText = axiosRes.data?.rewrittenText;
      console.log("AI Reformat Response:", rewrittenText);
      if (rewrittenText && editor) {
        const currentDocLength = editor.state.doc.content.size;
        if (isSelection) {
          const safeFrom = Math.min(from, currentDocLength);
          const safeTo = Math.min(to, currentDocLength);
          editor.chain().focus().insertContentAt({ from: safeFrom, to: safeTo }, rewrittenText).run();
        } else {
          editor.commands.setContent(rewrittenText);
        }
        showNotif(`Text reformatted for ${format} style`);
        // Trigger pagination after AI reformat
        requestAnimationFrame(() => (editor as any)?.__triggerPagination?.('cleanup'));
      } else if (!rewrittenText) {
        showNotif("AI returned empty result", "error");
      }
    } catch (e: any) {
      console.error("AI Reformat failed:", e);
      const status = e.response?.status;
      if (status === 429) {
        showNotif("AI Rate limit reached. Try again in a minute.", "error");
      } else {
        showNotif(`Reformat failed: ${e.message}`, "error");
      }
    }
    setApplying(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 4 }}>Active Style</div>
      {Object.entries(FORMATS).map(([key, val]) => (
        <button
          key={key}
          onClick={() => applyFormat(key)}
          style={{
            padding: '14px 16px', borderRadius: 2, textAlign: 'left', cursor: 'pointer',
            background: format === key ? s.green : '#fff',
            color: format === key ? '#fff' : s.text,
            border: `1px solid ${format === key ? s.green : 'rgba(26,47,35,0.1)'}`,
            transition: 'all 0.25s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{val.label}</span>
            {format === key && <Check size={14} />}
          </div>
          <div style={{ fontSize: 10, opacity: format === key ? 0.7 : 0.5, marginTop: 2 }}>{val.description}</div>
          {format === key && (
            <div style={{ marginTop: 8, fontSize: 9, fontFamily: 'monospace', opacity: 0.6, lineHeight: 1.4 }}>
              Font: {val.bodyFont.split(',')[0].replace(/'/g, '')} · {val.fontSize} · {val.lineHeight} leading
            </div>
          )}
        </button>
      ))}



      <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${s.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 12 }}>AI Manuscript Prep</div>
        <p style={{ fontSize: 11, opacity: 0.6, marginBottom: 12, lineHeight: 1.6 }}>
          Fix copy-paste artifacts, broken line breaks, and refine academic flow.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={proofreadWithAI}
            disabled={applying}
            style={{
              width: '100%', padding: '10px 0', border: `1px solid ${s.accent}`,
              background: 'rgba(180, 142, 77, 0.05)', color: s.text, fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: applying ? 0.5 : 1, borderRadius: 2
            }}
          >
            {applying
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Cleaning…</>
              : <><Scissors size={12} /> Proofread & Clean</>
            }
          </button>

          <button
            onClick={reformatWithAI}
            disabled={applying}
            style={{
              width: '100%', padding: '10px 0', border: `1px solid ${s.border}`,
              background: 'transparent', color: s.text, fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: applying ? 0.5 : 1, borderRadius: 2
            }}
          >
            {applying
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reformatting…</>
              : <><ZapIcon size={12} /> Reformat for Style</>
            }
          </button>
        </div>
      </div>

      {(applying || applied) && (
        <div style={{
          padding: '10px 14px', background: applied ? '#f0fdf4' : '#fffbeb',
          color: applied ? '#166534' : '#92400e',
          borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 700,
        }}>
          {applied ? <CheckCircle2 size={14} /> : <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {applied ? `${format} style applied` : 'Applying format…'}
        </div>
      )}
    </div>
  );
}

function CollaborationPanel({ collaborators, editor }: any) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteSent, setInviteSent] = useState(false);

  const sendInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    setPendingInvites(prev => [{ email: inviteEmail, role: inviteRole, sent: 'just now' }, ...prev]);
    setInviteEmail('');
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2500);
  };

  const removeInvite = (email: string) => setPendingInvites(prev => prev.filter((i: any) => i.email !== email));

  const addComment = () => {
    if (!comment.trim()) return;
    setComments(prev => [{
      id: Date.now(), user: 'You', color: s.accent,
      text: comment, time: 'just now', para: 'p1',
    }, ...prev]);
    setComment('');
  };

  const getAiSuggestion = async () => {
    setAiAssisting(true);
    setAiSuggestion(null);
    try {
      const docText = editor?.getText() || "";
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const axios = (await import('axios')).default;
      const res = await axios.post(`${backendUrl}/api/ai/summary/generate`, {
        text: docText,
      });
      const data = res.data;
      // Use the abstract draft as the AI suggestion
      setAiSuggestion(data?.abstractDraft || data?.abstract_draft || 'No suggestion available for the current text.');
    } catch (e) {
      console.error('AI suggestion error:', e);
      setAiSuggestion('Could not generate suggestion. Please try again.');
    }
    setAiAssisting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5 }}>Active Collaborators</div>
          <button
            onClick={() => setShowInvite(v => !v)}
            style={{
              padding: '4px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', cursor: 'pointer', borderRadius: 2,
              background: showInvite ? s.green : 'transparent',
              color: showInvite ? '#fff' : s.text,
              border: `1px solid ${showInvite ? s.green : 'rgba(26,47,35,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
            }}
          >
            <Users size={11} /> Invite
          </button>
        </div>

        {collaborators.map((col: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${s.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{col.initials}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{col.name}</div>
              <div style={{ fontSize: 9, opacity: 0.5 }}>{col.cursor ? `Editing paragraph ${col.cursor.para === 'p1' ? '1' : '2'}` : 'Viewing'}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>editor</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            </div>
          </div>
        ))}

        {showInvite && (
          <div style={{ marginTop: 12, padding: 14, background: '#fff', borderRadius: 4, border: `1px solid ${s.border}`, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={11} /> Invite to Document
            </div>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="colleague@university.edu"
              type="email"
              style={{
                width: '100%', padding: '8px 10px', fontSize: 11, marginBottom: 8,
                border: `1px solid ${s.border}`, borderRadius: 2,
                background: '#FCFBF7', color: s.text, fontFamily: 'inherit',
                outline: 'none', caretColor: s.accent,
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['editor', 'commenter', 'viewer'].map(role => (
                <button key={role} onClick={() => setInviteRole(role)} style={{
                  flex: 1, padding: '6px 0', fontSize: 8.5, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  borderRadius: 2, border: `1px solid ${inviteRole === role ? s.green : 'rgba(26,47,35,0.15)'}`,
                  background: inviteRole === role ? s.green : 'transparent',
                  color: inviteRole === role ? '#fff' : s.text, transition: 'all 0.15s',
                }}>{role}</button>
              ))}
            </div>
            <button
              onClick={sendInvite}
              style={{
                width: '100%', padding: '9px', background: s.green, color: '#fff',
                border: 'none', borderRadius: 2, cursor: 'pointer',
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {inviteSent ? <><CheckCircle2 size={12} /> Invite Sent!</> : <><Share2 size={12} /> Send Invite</>}
            </button>

            {pendingInvites.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.4, marginBottom: 6 }}>Pending Invites</div>
                {pendingInvites.map((inv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${s.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{inv.email}</div>
                      <div style={{ fontSize: 8, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{inv.role} · {inv.sent}</div>
                    </div>
                    <button onClick={() => removeInvite(inv.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, opacity: 0.3, padding: 2 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 12 }}>Discussion Threads</div>
        {comments.map(c => (
          <div key={c.id} style={{ padding: '10px 12px', background: '#fff', borderRadius: 2, marginBottom: 8, border: `1px solid rgba(26,47,35,0.07)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: c.color }}>{c.user}</span>
              <span style={{ fontSize: 9, opacity: 0.4 }}>{c.time}</span>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.8 }}>{c.text}</p>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addComment()}
            placeholder="Add a comment…"
            style={{ flex: 1, padding: '8px 10px', fontSize: 11, border: `1px solid ${s.border}`, borderRadius: 2, background: '#fff', color: s.text, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={addComment} style={{ padding: '8px 10px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 8, borderTop: `1px solid ${s.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 10 }}>AI Co-Pilot</div>
        <button
          onClick={getAiSuggestion}
          disabled={aiAssisting}
          style={{
            width: '100%', padding: '10px', background: 'transparent',
            border: `1px solid ${s.border}`, borderRadius: 2, cursor: 'pointer',
            color: s.text, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: aiAssisting ? 0.5 : 1,
          }}
        >
          {aiAssisting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</> : <><Sparkles size={12} /> Synthesize Feedback</>}
        </button>

        {aiSuggestion && (
          <div style={{ marginTop: 10, padding: '12px 14px', background: '#fff', borderRadius: 2, border: `1px solid ${s.accent}`, borderLeft: `3px solid ${s.accent}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: s.accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} /> AI Suggestion</div>
            <p style={{ fontSize: 11, lineHeight: 1.6, opacity: 0.85 }}>{aiSuggestion}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrityPanel({ editor }: { editor: any }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [done, setDone] = useState(true);

  const runScan = async () => {
    setScanning(true);
    setDone(false);
    setResult(null);
    try {
      const docText = editor?.getText() || "";
      if (!docText.trim()) {
        setResult({ score: 100, details: [], matches: [], structuralIssues: [] });
        setScanning(false);
        setDone(true);
        return;
      }
      
      const sentences = docText.match(/[^.!?]+[.!?]+/g) || [docText];
      const validSentences = sentences.map((s: string) => s.trim()).filter((s: string) => s.length > 20);
      
      // Structural checks
      const structuralIssues = [];
      if (docText.includes('-\n') || docText.includes('- ')) structuralIssues.push({ label: "Hyphenation Artifacts", icon: <Scissors size={12} /> });
      if (/\w\n\w/.test(docText)) structuralIssues.push({ label: "Broken Line Breaks", icon: <AlignLeft size={12} /> });
      if (/\s{2,}/.test(docText)) structuralIssues.push({ label: "Irregular Spacing", icon: <Type size={12} /> });

      const axiosRes = await (await import('axios')).default.post(
        (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000") + "/api/ai/plagiarism/check",
        {
          text: docText
        }
      );
      
      const matches = axiosRes.data || [];
      
      // Calculate overall score based on matches
      let totalMatch = 0;
      let totalSentences = validSentences.length || 1;
      let strongMatches = 0;
      
      matches.forEach((m: any) => {
        if (m.score > 30) totalMatch += (m.score / 100);
        if (m.score > 70) strongMatches++;
      });
      
      let originality = 100;
      if (totalSentences > 0) {
        originality = Math.max(0, Math.round(100 - ((totalMatch / totalSentences) * 100)));
      }
      
      let details = [];
      if (strongMatches === 0) {
        details.push({ label: 'Structural Originality', status: 'pass', note: 'No significant matching patterns detected.' });
      } else {
        details.push({ label: 'Text Matching', status: 'warning', note: `${strongMatches} highly similar sentences found.` });
      }

      if (structuralIssues.length > 0) {
        details.push({ label: 'Manuscript Integrity', status: 'info', note: `${structuralIssues.length} formatting inconsistencies found.` });
      }

      setResult({ 
        score: originality, 
        details,
        structuralIssues,
        matches: matches.filter((m: any) => m.score > 40).sort((a: any, b: any) => b.score - a.score)
      });
      
    } catch (e) {
      console.error(e);
      setResult({ score: 0, details: [{ label: 'Error', status: 'warning', note: 'Failed to contact AI service.' }], matches: [], structuralIssues: [] });
    }
    setScanning(false);
    setDone(true);
  };

  const applyStructuralFix = async () => {
    if (!editor) return;
    setScanning(true);
    try {
      const docText = editor.getText();
      const axiosRes = await (await import('axios')).default.post(
        "/api/ai/reformat/proofread",
        { text: docText }
      );
      const cleaned = axiosRes.data?.rewrittenText;
      if (cleaned && editor) {
        editor.commands.setContent(cleaned);
        // Trigger pagination after structural fix
        requestAnimationFrame(() => (editor as any)?.__triggerPagination?.('cleanup'));
        // Re-scan
        setTimeout(runScan, 500);
      }
    } catch (e) {
      console.error(e);
    }
    setScanning(false);
  };

  const statusColor = (s: string) => s === 'pass' ? '#166534' : s === 'warning' ? '#92400e' : '#1e40af';
  const statusBg = (s: string) => s === 'pass' ? '#f0fdf4' : s === 'warning' ? '#fffbeb' : '#eff6ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, textAlign: 'center' }}>
      {scanning ? (
        <>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${s.green}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Veritas Protocol Active…</h4>
          <p style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic' }}>Analyzing structural integrity & originality.</p>
        </>
      ) : result ? (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.green }}>{result.score}%</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5 }}>Originality Score</div>
          </div>
          
          <div style={{ width: '100%', height: 12, background: '#eee', borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 24, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
            {result.score < 100 ? (
              <>
                <div style={{ width: `${result.score}%`, background: s.green, height: '100%' }} />
                <div style={{ flex: 1, background: '#ef4444', height: '100%', opacity: 0.8 }} />
              </>
            ) : (
              <div style={{ width: '100%', background: s.green, height: '100%' }} />
            )}
          </div>

          {result.details?.map((d: any, i: number) => (
            <div key={i} style={{ padding: '10px 14px', background: statusBg(d.status), color: statusColor(d.status), borderRadius: 2, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>{d.note}</div>
              </div>
            </div>
          ))}

          {result.structuralIssues?.length > 0 && (
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(180,142,77,0.05)', borderRadius: 4, border: '1px solid rgba(180,142,77,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ZapIcon size={14} color="#B48E4D" />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B48E4D' }}>AI Structural Cleanup</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {result.structuralIssues.map((issue: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, opacity: 0.7 }}>
                    {issue.icon}
                    {issue.label}
                  </div>
                ))}
              </div>
              <button 
                onClick={applyStructuralFix}
                style={{ width: '100%', padding: '10px', background: '#B48E4D', color: '#fff', border: 'none', borderRadius: 2, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(180,142,77,0.2)' }}
              >
                <Sparkles size={11} /> Apply AI Structural Fix
              </button>
            </div>
          )}

          {result.matches && result.matches.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, opacity: 0.6 }}>Detected Similarities</div>
              {result.matches.slice(0, 5).map((m: any, i: number) => {
                const color = m.score > 80 ? '#dc2626' : m.score > 60 ? '#ea580c' : '#ca8a04';
                return (
                  <div key={i} style={{ padding: '12px', background: '#fff', borderRadius: 4, marginBottom: 8, borderLeft: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{m.score}% Match</span>
                      <span style={{ fontSize: 9, opacity: 0.5, fontStyle: 'italic', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.source}</span>
                    </div>
                    <p style={{ fontSize: 10, lineHeight: 1.5, opacity: 0.8 }}>"{m.sentence}"</p>
                  </div>
                );
              })}
            </div>
          )}
          
          <button onClick={runScan} style={{ marginTop: 16, width: '100%', padding: '9px', background: 'transparent', border: `1px solid ${s.border}`, borderRadius: 2, cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: s.text }}>
            <RefreshCw size={11} /> Re-scan Manuscript
          </button>
        </div>
      ) : (
        <>
          <ShieldCheck size={32} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic', marginBottom: 20 }}>Run the Veritas protocol to analyze your document's structural integrity.</p>
          <button onClick={runScan} style={{ padding: '10px 24px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={13} /> Run Veritas Scan
          </button>
        </>
      )}
    </div>
  );
}

function RichTool({ icon, label, onClick, active = false }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        background: active ? 'rgba(26,47,35,0.1)' : hovered ? 'rgba(26,47,35,0.05)' : 'none',
        border: active ? `1px solid ${s.green}` : '1px solid transparent',
        cursor: 'pointer',
        color: s.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 4,
        opacity: active ? 1 : 0.6,
        transition: 'all 0.1s',
      }}
    >
      {icon}
    </button>
  );
}

// ── Tooltip wrapper ───────────────────────────────────────────────────────────
function ToolbarBtn({ icon, label, onClick, highlight = false }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={label}
        style={{
          background: highlight
            ? hovered ? '#2D4D3A' : s.green
            : hovered ? 'rgba(26,47,35,0.08)' : 'none',
          border: highlight ? 'none' : 'none',
          cursor: 'pointer',
          color: highlight ? '#fff' : s.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: highlight ? 6 : 4,
          opacity: highlight ? 1 : hovered ? 0.9 : 0.5,
          transition: 'all 0.18s',
          boxShadow: highlight && hovered ? '0 2px 8px rgba(26,47,35,0.25)' : 'none',
        }}
      >
        {icon}
      </button>
      {hovered && (
        <div style={{
          position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)',
          background: s.green, color: '#fff', fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '4px 10px', borderRadius: 3, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>{label}</div>
      )}
    </div>
  );
}

export default function ScriptoriumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  
  const [activeSidebar, setActiveSidebar] = useState('citations');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [format, setFormat] = useState('APA');
  const [projectTitle, setProjectTitle] = useState("Loading Manuscript...");
  const [insertedCitations, setInsertedCitations] = useState([]);
  const [notification, setNotification] = useState<any>(null);
  const [collaborators] = useState(COLLABORATORS);
  const [editor, setEditor] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'link' | 'image' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showChartOptions, setShowChartOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [, setUpdateTick] = useState(0);

  // Force re-render when editor state changes
  useEffect(() => {
    if (!editor) return;
    const handler = () => setUpdateTick(tick => tick + 1);
    editor.on('transaction', handler);
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('transaction', handler);
      editor.off('selectionUpdate', handler);
    };
  }, [editor]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await projectAPI.get(projectId!);
      if (res.data) {
        setProjectTitle(res.data.title);
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
    }
  };

  const showNotif = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInsertCitation = async (cite: any) => {
    if (!editor) return;
    
    try {
      // Add citation to backend first to get formatted strings
      const res = await projectAPI.addCitation(projectId!, cite, format);
      const { inText, citationId } = res.data;

      editor.commands.setCitation({
        citationId,
        inText,
        paperId: cite.paperId,
        title: cite.title
      });

      setInsertedCitations(res.data.bibliography);
      showNotif(`Citation inserted: ${cite.title.slice(0, 20)}...`);
    } catch (err) {
      console.error("Failed to insert citation:", err);
      showNotif("Failed to insert citation", "error");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          editor.commands.setContent(JSON.parse(content));
        } else {
          // TipTap handles plain text/markdown string decently via setContent
          editor.commands.setContent(content);
        }
        showNotif(`Successfully imported ${file.name}`);
        // Refresh pagination after import
        setTimeout(() => (editor as any)?.__triggerPagination?.('load'), 500);
      } catch (err) {
        console.error("Import failed:", err);
        showNotif("Failed to parse file. Ensure it's a valid text or JSON file.", "error");
      }
    };
    reader.readAsText(file);
    // Reset input for same-file re-imports
    e.target.value = '';
  };

  useEffect(() => {
    if (editor && format && projectId) {
      updateCitationStyles();
    }
  }, [format, editor, projectId]);

  const updateCitationStyles = async () => {
    if (!projectId || !editor) return;
    try {
      const res = await projectAPI.getBibliography(projectId, format);
      const { bibliography } = res.data || {};
      if (!bibliography) return;
      setInsertedCitations(bibliography);

      // Update TipTap nodes
      editor.commands.command(({ tr }: any) => {
        let changed = false;
        const currentSize = tr.doc.content.size;
        tr.doc.descendants((node: any, pos: number) => {
          if (node.type.name === 'citation' && pos < currentSize) {
            const bibEntry = bibliography.find((b: any) => b.citationId === node.attrs.citationId);
            if (bibEntry) {
              const newInText = format === 'IEEE' ? `[${bibEntry.ieeeIndex}]` : node.attrs.inText;
              if (newInText !== node.attrs.inText) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, inText: newInText });
                changed = true;
              }
            }
          }
        });
        return changed;
      });
    } catch (err: any) {
      // Silently ignore 429 rate limit and 404 errors — these are expected
      if (err?.response?.status !== 429 && err?.response?.status !== 404) {
        console.error("Failed to update citation styles:", err);
      }
    }
  };

  const fmt = (FORMATS as any)[format];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', background: s.bg, color: s.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(26,47,35,0.15); border-radius: 2px; }
        .tiptap-container { 
          flex: 1; 
          overflow-y: auto; 
          background: #d7dade; 
          padding: 20px 0; 
        }
        .tiptap-editor { 
          width: 816px; 
          margin: 0 auto;
          background: transparent;
          position: relative;
        }
        ${GLOBAL_STYLES}
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: s.green, color: '#fff', padding: '10px 20px', borderRadius: 4,
          fontSize: 11, fontWeight: 600, zIndex: 1000, animation: 'slideUp 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <CheckCircle2 size={14} /> {notification.msg}
        </div>
      )}

      {/* LEFT TOOLBAR */}
      <aside style={{
        width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 0', borderRight: `1px solid ${s.border}`,
        background: s.bg, flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, background: s.green, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: "'Playfair Display', serif",
          fontSize: 20, fontWeight: 700, marginBottom: 32,
        }}>U</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <ToolbarBtn icon={<Feather size={20} />} label="Editor" onClick={() => {}} />
          <ToolbarBtn icon={<Users size={20} />} label="Collaborators" onClick={() => {}} />
          <ToolbarBtn icon={<History size={20} />} label="History" onClick={() => {}} />
          <div style={{ width: 28, height: 1, background: s.text, opacity: 0.12, margin: '4px 0' }} />
          <ToolbarBtn icon={<ScanSearch size={20} />} label="Veritas Scan" highlight onClick={() => router.push('/scriptorium/plag')} />
          <div style={{ width: 28, height: 1, background: s.text, opacity: 0.12, margin: '4px 0' }} />
          <ToolbarBtn icon={<Settings size={20} />} label="Settings" onClick={() => {}} />
        </div>
      </aside>

      {/* MAIN WRITING AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 56, background: '#fff', borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button 
              onClick={() => router.push('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                padding: '6px 12px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s',
                color: s.text, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,47,35,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Library size={14} /> Library
            </button>
            <div style={{ width: 1, height: 24, background: s.border }} />
            <button 
              onClick={async () => {
                if (!editor) return;
                showNotif("AI is refining your manuscript...", "info");
                try {
                  const docText = editor.getText();
                  const axiosRes = await (await import('axios')).default.post(
                    (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000") + "/api/ai/reformat/proofread",
                    { text: docText }
                  );
                  const cleaned = axiosRes.data?.rewrittenText;
                  if (cleaned) {
                    editor.commands.setContent(cleaned);
                    showNotif("Manuscript auto-refined");
                  }
                } catch (e) {
                  showNotif("AI refinement failed", "error");
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                borderRadius: 4, background: 'rgba(26,47,35,0.05)', border: 'none',
                cursor: 'pointer', fontSize: 10, fontWeight: 700, color: s.text,
                textTransform: 'uppercase', letterSpacing: '0.12em'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,47,35,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,47,35,0.05)'}
            >
              <Sparkles size={13} color={s.accent} /> AI
            </button>
            <div style={{ width: 1, height: 24, background: s.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.4 }}>Draft</span>
              <input
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                onBlur={async () => {
                  if (projectId) {
                    try {
                      await projectAPI.update(projectId, { title: projectTitle });
                      showNotif("Title updated");
                    } catch (e) {
                      console.error("Failed to update title:", e);
                    }
                  }
                }}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  width: 'auto',
                  minWidth: 100,
                  color: s.text,
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,47,35,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              />
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(180,142,77,0.12)', color: s.accent, borderRadius: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{format}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {collaborators.map((col: any, i: number) => (
                <div key={i} title={col.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700, marginLeft: i > 0 ? -8 : 0, zIndex: collaborators.length - i }}>
                  {col.initials}
                </div>
              ))}
            </div>
            <button 
              onClick={() => (document.getElementById('import-input') as any).click()}
              style={{ padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid ${s.green}`, background: 'transparent', color: s.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={11} /> Import
            </button>
            <input 
              id="import-input"
              type="file" 
              accept=".txt,.md,.json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />

            <button onClick={() => showNotif('Link copied!')} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid ${s.green}`, background: 'transparent', color: s.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Share2 size={11} /> Share
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowExportOptions(!showExportOptions)}
                style={{
                  padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, 
                  textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', 
                  background: s.green, color: '#fff', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <Download size={11} /> Export
              </button>
              {showExportOptions && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 10,
                  background: '#fff', borderRadius: 4, padding: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: `1px solid ${s.border}`,
                  display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1000,
                  width: 180, animation: 'slideUp 0.2s'
                }}>
                  {[
                    { id: 'pdf', label: 'PDF Document', icon: <FileText size={14} />, color: '#e11d48' },
                    { id: 'latex', label: 'LaTeX Source', icon: <Binary size={14} />, color: '#1a2f23' },
                    { id: 'json', label: 'JSON State', icon: <History size={14} />, color: s.accent }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (opt.id === 'pdf') {
                          window.print();
                        } else if (opt.id === 'json') {
                          const data = JSON.stringify(editor?.getJSON(), null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${projectTitle}.json`;
                          a.click();
                        } else if (opt.id === 'latex') {
                          const latex = convertToLaTeX(editor?.getJSON());
                          const blob = new Blob([latex], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${projectTitle}.tex`;
                          a.click();
                        }
                        setShowExportOptions(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        border: 'none', background: 'transparent', borderRadius: 4,
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s', color: '#333'
                      }}
                      onMouseEnter={(e: any) => {
                        e.currentTarget.style.background = '#f8f9fa';
                        e.currentTarget.style.color = opt.color;
                      }}
                      onMouseLeave={(e: any) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#333';
                      }}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* RICH EDITOR TOOLBAR */}
        <div style={{ 
          height: 52, background: '#fff', borderBottom: `1px solid ${s.border}`, 
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6, flexShrink: 0,
          overflowX: 'auto', scrollbarWidth: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          {/* History */}
          <RichTool icon={<Undo2 size={14} />} label="Undo" onClick={() => editor?.chain().focus().undo().run()} />
          <RichTool icon={<Redo2 size={14} />} label="Redo" onClick={() => editor?.chain().focus().redo().run()} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Text Style */}
          <RichTool icon={<Heading1 size={14} />} label="Heading 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} />
          <RichTool icon={<Heading2 size={14} />} label="Heading 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} />
          <RichTool icon={<Type size={14} />} label="Paragraph" onClick={() => editor?.chain().focus().setParagraph().run()} active={editor?.isActive('paragraph')} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Formatting */}
          <RichTool icon={<Bold size={14} />} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} />
          <RichTool icon={<Italic size={14} />} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} />
          <RichTool icon={<UnderlineIcon size={14} />} label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RichTool icon={<Palette size={14} />} label="Text Color" onClick={() => (document.getElementById('colorPicker') as any)?.click()} />
            <input 
              id="colorPicker" type="color" 
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} 
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} 
            />
          </div>
          <RichTool icon={<Eraser size={14} />} label="Clear Formatting" onClick={() => editor?.chain().focus().unsetAllMarks().run()} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Alignment */}
          <RichTool 
            icon={<AlignLeftIcon size={14} />} 
            label="Align Left" 
            onClick={() => editor?.chain().focus().setTextAlign('left').run()} 
            active={editor?.isActive({ textAlign: 'left' }) || (fmt.align === 'left' && !editor?.isActive({ textAlign: 'center' }) && !editor?.isActive({ textAlign: 'right' }) && !editor?.isActive({ textAlign: 'justify' }))} 
          />
          <RichTool 
            icon={<AlignCenter size={14} />} 
            label="Align Center" 
            onClick={() => editor?.chain().focus().setTextAlign('center').run()} 
            active={editor?.isActive({ textAlign: 'center' })} 
          />
          <RichTool 
            icon={<AlignRight size={14} />} 
            label="Align Right" 
            onClick={() => editor?.chain().focus().setTextAlign('right').run()} 
            active={editor?.isActive({ textAlign: 'right' })} 
          />
          <RichTool 
            icon={<AlignJustify size={14} />} 
            label="Justify" 
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()} 
            active={editor?.isActive({ textAlign: 'justify' }) || (fmt.align === 'justify' && !editor?.isActive({ textAlign: 'center' }) && !editor?.isActive({ textAlign: 'right' }) && !editor?.isActive({ textAlign: 'left' }))} 
          />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Lists & Quotes */}
          <RichTool icon={<List size={14} />} label="Bullet List" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} />
          <RichTool icon={<ListOrdered size={14} />} label="Ordered List" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} />
          <RichTool icon={<Quote size={14} />} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Layout Sections */}
          <RichTool icon={<PanelTop size={14} />} label="Insert Header" onClick={() => {
            editor?.chain().focus().insertContentAt(0, {
              type: 'paragraph',
              attrs: { textAlign: 'center' },
              content: [{ type: 'text', text: '[ HEADER SECTION ]', marks: [{ type: 'bold' }, { type: 'italic' }] }]
            }).run();
          }} />
          <RichTool icon={<PanelBottom size={14} />} label="Insert Footer" onClick={() => {
            editor?.chain().focus().insertContentAt(editor.state.doc.content.size, {
              type: 'paragraph',
              attrs: { textAlign: 'center' },
              content: [{ type: 'text', text: '[ FOOTER SECTION ]', marks: [{ type: 'bold' }, { type: 'italic' }] }]
            }).run();
          }} />
          <RichTool icon={<FilePlus size={14} />} label="Add Page" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Math */}
          <RichTool icon={<Sigma size={14} />} label="Inline Equation" onClick={() => editor?.chain().focus().insertContent({ type: 'inlineMath' }).run()} active={editor?.isActive('inlineMath')} />
          <RichTool icon={<Sigma size={18} />} label="Block Equation" onClick={() => editor?.chain().focus().insertContent({ type: 'mathBlock' }).run()} active={editor?.isActive('mathBlock')} />
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Insert Media */}
          <RichTool icon={<LinkIcon size={14} />} label="Link" onClick={() => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, ' ');
            setLinkText(text);
            setModalInput(editor?.getAttributes('link').href || '');
            setActiveModal('link');
          }} active={editor?.isActive('link')} />
          <RichTool icon={<ImageIcon size={14} />} label="Image" onClick={() => setActiveModal('image')} />
          <div style={{ position: 'relative' }}>
            <RichTool 
              icon={<BarChart3 size={14} />} 
              label="Charts" 
              onClick={() => setShowChartOptions(!showChartOptions)} 
              active={showChartOptions}
            />
            {showChartOptions && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 8,
                background: '#fff', borderRadius: 8, padding: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: `1px solid ${s.border}`,
                display: 'flex', flexDirection: 'column', gap: 4, zIndex: 100,
                width: 140, animation: 'slideUp 0.2s'
              }}>
                {[
                  { type: 'bar', label: 'Bar Chart', icon: <BarChart3 size={12} /> },
                  { type: 'line', label: 'Line Chart', icon: <Binary size={12} /> },
                  { type: 'pie', label: 'Pie Chart', icon: <Sparkles size={12} /> }
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      editor?.chain().focus().insertContent({ type: 'chart', attrs: { type: opt.type } }).run();
                      setShowChartOptions(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      border: 'none', background: 'transparent', borderRadius: 4,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e: any) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={(e: any) => e.currentTarget.style.background = 'transparent'}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ width: 1, height: 24, background: s.border, margin: '0 6px' }} />

          {/* Tables */}
          <RichTool icon={<TableIcon size={14} />} label="Insert Table" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
          {editor?.isActive('table') && (
            <>
              <RichTool icon={<PlusSquare size={14} />} label="Add Row Below" onClick={() => editor?.chain().focus().addRowAfter().run()} />
              <RichTool icon={<MinusSquare size={14} />} label="Delete Row" onClick={() => editor?.chain().focus().deleteRow().run()} />
              <RichTool icon={<TableProperties size={14} />} label="Delete Table" onClick={() => editor?.chain().focus().deleteTable().run()} />
            </>
          )}
        </div>


        <div className="tiptap-container">
          <div className={`tiptap-editor format-${format}`} style={{
            fontFamily: fmt.bodyFont,
            fontSize: fmt.fontSize,
            lineHeight: fmt.lineHeight,
            textAlign: fmt.align as any,
            color: fmt.color,
          }}>
            <TipTap 
              projectId={projectId || 'demo'} 
              userId="user-1" 
              userName="Julian Thorne" 
              userColor="#B48E4D" 
              onReady={setEditor}
              columns={(fmt as any).columns || 1}
              columnGap={(fmt as any).columnGap}
            />
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside style={{ width: isSidebarOpen ? 320 : 0, borderLeft: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.sidebarBg, transition: 'all 0.3s ease', overflow: 'hidden', flexShrink: 0 }}>
        {isSidebarOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 320 }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${s.border}` }}>
              {[
                { key: 'citations', icon: <Binary size={20} />, label: 'Citations' },
                { key: 'format', icon: <BookOpen size={20} />, label: 'Format' },
                { key: 'integrity', icon: <ShieldCheck size={20} />, label: 'Veritas' },
                { key: 'comments', icon: <MessageSquare size={20} />, label: 'Collab' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveSidebar(tab.key)} style={{ flex: 1, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer', background: activeSidebar === tab.key ? '#fff' : 'transparent', opacity: activeSidebar === tab.key ? 1 : 0.45, color: s.text, transition: 'all 0.2s', borderBottom: activeSidebar === tab.key ? `2px solid ${s.green}` : '2px solid transparent' }}>
                  {tab.icon}
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{tab.label}</span>
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {activeSidebar === 'citations' && (
                <AICitationPanel 
                  editor={editor} 
                  insertedCitations={insertedCitations} 
                  format={format} 
                  onInsert={handleInsertCitation} 
                  projectId={projectId}
                />
              )}
              {activeSidebar === 'format' && (
                <FormattingPanel 
                  format={format} 
                  setFormat={setFormat} 
                  editor={editor}
                  showNotif={showNotif}
                />
              )}
              {activeSidebar === 'integrity' && (
                <IntegrityPanel editor={editor} />
              )}
              {activeSidebar === 'comments' && (
                <CollaborationPanel 
                  collaborators={collaborators} 
                  editor={editor}
                />
              )}
            </div>
          </div>
        )}
      </aside>

      <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', background: s.green, color: '#fff', border: 'none', padding: '6px 4px', borderRadius: '4px 0 0 4px', cursor: 'pointer', zIndex: 50 }}>
        {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* MODAL OVERLAYS */}
      {activeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,47,35,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s'
        }}>
          <div style={{
            background: '#fff', width: 400, borderRadius: 12, padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: `1px solid ${s.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {activeModal === 'link' ? 'Insert / Edit Link' : 'Insert Image'}
              </h3>
              <button onClick={() => { setActiveModal(null); setModalInput(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={18} /></button>
            </div>

            {activeModal === 'link' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>Display Text</div>
                <input 
                  placeholder="Text to display"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 6, border: `1px solid ${s.border}`,
                    fontSize: 13, marginBottom: 12, outline: 'none'
                  }}
                />
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>Destination URL</div>
                <input 
                  autoFocus
                  placeholder="https://example.com"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && editor?.chain().focus().extendMarkRange('link').setLink({ href: modalInput }).run() && setActiveModal(null)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 6, border: `1px solid ${s.border}`,
                    fontSize: 13, marginBottom: 20, outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => {
                      if (modalInput) {
                        if (linkText && !editor.state.selection.empty) {
                          editor?.chain().focus().extendMarkRange('link').setLink({ href: modalInput }).run();
                        } else if (linkText) {
                          editor?.chain().focus().insertContent(`<a href="${modalInput}">${linkText}</a> `).run();
                        } else {
                          editor?.chain().focus().extendMarkRange('link').setLink({ href: modalInput }).run();
                        }
                      } else {
                        editor?.chain().focus().unsetLink().run();
                      }
                      setActiveModal(null);
                      setModalInput('');
                      setLinkText('');
                    }}
                    style={{ flex: 1, padding: '12px', background: s.green, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Apply Link
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div 
                  onClick={() => (document.getElementById('fileUpload') as any)?.click()}
                  style={{
                    border: `2px dashed ${s.border}`, borderRadius: 8, padding: '24px', textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e: any) => e.currentTarget.style.borderColor = s.green}
                  onMouseLeave={(e: any) => e.currentTarget.style.borderColor = s.border}
                >
                  <Upload size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Upload from computer</div>
                  <div style={{ fontSize: 11, opacity: 0.4 }}>JPEG, PNG, GIF up to 5MB</div>
                  <input 
                    id="fileUpload" type="file" accept="image/*" hidden 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                          const base64 = re.target?.result as string;
                          editor?.chain().focus().setImage({ src: base64 }).run();
                          setActiveModal(null);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: s.border, zIndex: 0 }}></div>
                  <span style={{ position: 'relative', background: '#fff', padding: '0 10px', fontSize: 10, color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>OR</span>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>Image URL</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      placeholder="https://images.unsplash.com/..."
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 6, border: `1px solid ${s.border}`,
                        fontSize: 12, outline: 'none'
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (modalInput) editor?.chain().focus().setImage({ src: modalInput }).run();
                        setActiveModal(null);
                        setModalInput('');
                      }}
                      style={{ padding: '0 16px', background: s.green, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}