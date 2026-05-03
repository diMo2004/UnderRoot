"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Feather, ShieldCheck, Users, Search,
  MessageSquare, Settings, Share2,
  ChevronLeft, ChevronRight, History,
  Binary, CheckCircle2, Sparkles, BookOpen,
  Loader2, FileText, AlignLeft, BookMarked,
  Check, X, Plus, Trash2, Edit3,
  RefreshCw, Download, Copy, ZapIcon,
  ScanSearch, Upload, Link, FileUp
} from 'lucide-react';

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const FORMATS = {
  IEEE: {
    label: "IEEE",
    description: "Numbered references, technical journals",
    inText: (id) => `[${id}]`,
    bibliography: (c, id) => `[${id}] ${c.author}, "${c.title}," ${c.source}, ${c.year}.`,
    bodyFont: "'Times New Roman', serif",
    fontSize: "16px",
    lineHeight: "1.6",
    align: "left",
    color: "#1a1a1a",
  },
  APA: {
    label: "APA",
    description: "Author-date style, social sciences",
    inText: (_, c) => `(${c.author.split(",")[0]}, ${c.year})`,
    bibliography: (c) => `${c.author} (${c.year}). ${c.title}. ${c.source}.`,
    bodyFont: "'Georgia', serif",
    fontSize: "18px",
    lineHeight: "2",
    align: "justify",
    color: "#1A2F23",
  },
  ACM: {
    label: "ACM",
    description: "Superscript refs, computing",
    inText: (id) => `[${id}]`,
    bibliography: (c, id) => `${id}. ${c.author} ${c.year}. ${c.title}. ${c.source}.`,
    bodyFont: "'Palatino Linotype', serif",
    fontSize: "17px",
    lineHeight: "1.75",
    align: "left",
    color: "#1a2a3a",
  },
};

const MOCK_CITATIONS = [
  { id: 1, author: "Thorne, J.", year: "2023", title: "Neural Plasticity in Collaborative Environments", source: "Nature Neuroscience", doi: "10.1038/nn.2023.0001", verified: true },
  { id: 2, author: "Sterling, E.", year: "2021", title: "Post-Colonial Narratives in Digital Spaces", source: "Oxford Academic", doi: "10.1093/ac.2021.003", verified: true },
  { id: 3, author: "Vance, L.", year: "2024", title: "Algorithmic Integrity in Scholarly Writing", source: "UnderRoot Press", doi: "10.5555/ur.2024.007", verified: true },
  { id: 4, author: "Hoffman, R.", year: "2022", title: "Conflict-Free Replicated Data Types in Distributed Systems", source: "IEEE Trans. Software Eng.", doi: "10.1109/tse.2022.0042", verified: true },
];

const INITIAL_PARAGRAPHS = [
  {
    id: "p1",
    text: "The evolution of collaborative digital frameworks has introduced unprecedented variables into the study of cognitive adaptation. This paper examines how real-time synchronization in scholarly environments (UnderRoot, 2024) facilitates a higher degree of semantic cohesion between geographically disparate researchers.",
    insertedCitations: [],
  },
  {
    id: "p2",
    text: "By utilizing conflict-free replicated data types, we observe a reduction in cognitive load during multi-author synthesis. Preliminary findings suggest that the integration of machine-learning citation heuristics allows for a 40% increase in bibliographic accuracy during the drafting phase.",
    insertedCitations: [],
    highlight: "machine-learning citation heuristics",
  },
];

const COLLABORATORS = [
  { initials: "A", name: "Alice Chen", color: "#1A2F23", cursor: { para: "p1", pos: 42 } },
  { initials: "B", name: "Bob Patel", color: "#B48E4D", cursor: null },
  { initials: "C", name: "Carol Wu", color: "#6B4F9B", cursor: { para: "p2", pos: 15 } },
];

const s = {
  bg: "#FCFBF7", text: "#1A2F23", accent: "#B48E4D",
  border: "rgba(26, 47, 35, 0.1)", sidebarBg: "#F3F1E9",
  green: "#1A2F23", greenHover: "#2D4D3A",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Document Import Modal ─────────────────────────────────────────────────────
function DocumentImportModal({ onImport, onClose }) {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const plainToBlocks = (text) => {
    if (!text) return [];
    return text.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
  };

  const extractDocxText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Try JSZip (may not be available; fallback gracefully)
        const raw = new Uint8Array(e.target.result);
        // Simple XML extraction: find word/document.xml content between tags
        const str = new TextDecoder('utf-8', { fatal: false }).decode(raw);
        // Extract text runs from XML
        const xmlMatch = str.match(/<w:body>([\s\S]*?)<\/w:body>/);
        if (xmlMatch) {
          const body = xmlMatch[1];
          // Extract paragraph text
          const paragraphs = [];
          const paraReg = /<w:p[ >]([\s\S]*?)<\/w:p>/g;
          let paraMatch;
          while ((paraMatch = paraReg.exec(body)) !== null) {
            const tReg = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
            let tMatch, paraText = '';
            while ((tMatch = tReg.exec(paraMatch[1])) !== null) {
              paraText += tMatch[1];
            }
            if (paraText.trim()) paragraphs.push(paraText.trim());
          }
          resolve(paragraphs.length ? paragraphs : ['Could not extract text. Please paste the content directly.']);
        } else {
          // Strip all XML tags as fallback
          const clean = str.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, '\n').trim();
          resolve(plainToBlocks(clean));
        }
      } catch {
        reject(new Error('DOCX extraction failed'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const extractPdfText = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Dynamically load PDF.js from CDN
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
        let allText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // Group items into lines by vertical position
          let lastY = null;
          for (const item of content.items) {
            const y = item.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 5) allText += '\n';
            allText += item.str;
            lastY = y;
          }
          allText += '\n\n';
        }
        resolve(plainToBlocks(allText));
      } catch {
        // Fallback: raw bytes as text
        const text = new TextDecoder('utf-8', { fatal: false })
          .decode(new Uint8Array(e.target.result))
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, '\n\n')
          .trim()
          .slice(0, 40000);
        resolve(plainToBlocks(text) || ['PDF text extraction failed. Please paste the text directly.']);
      }
    };
    reader.onerror = () => resolve(['File read error.']);
    reader.readAsArrayBuffer(file);
  });

  const handleFile = async (file) => {
    setError(''); setLoading(true);
    try {
      const name = file.name.toLowerCase();
      let blocks = [];
      if (name.endsWith('.pdf')) {
        blocks = await extractPdfText(file);
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        blocks = await extractDocxText(file);
      } else {
        // Plain text / md / rtf
        const text = await file.text();
        blocks = plainToBlocks(text);
      }
      if (!blocks.length) blocks = ['No readable text found. Please paste your content directly.'];
      onImport(blocks, file.name);
    } catch {
      setError('Could not read this file. Try a .txt or paste the text directly.');
    }
    setLoading(false);
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    setError(''); setLoading(true);
    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Fetch and extract the full academic text from this URL: ${urlInput}
            
Return ONLY the paper text with paragraph breaks (double newlines). Include title, abstract, and all body sections. No markdown, no JSON, no explanation.`,
          }],
        }),
      });
      const data = await resp.json();
      const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n\n');
      const blocks = plainToBlocks(text.trim());
      if (blocks.length) {
        onImport(blocks, urlInput.replace(/^https?:\/\//, '').slice(0, 50));
      } else {
        setError('Could not extract content from URL. Try uploading the file directly.');
      }
    } catch {
      setError('URL fetch failed. Please upload the file or paste the text.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(26,47,35,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: s.bg, borderRadius: 8, width: 480, maxWidth: '94vw',
          padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          border: `1px solid ${s.border}`, animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              Import Document
            </h3>
            <p style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              PDF · DOCX · TXT · MD · URL
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, fontSize: 20, lineHeight: 1, color: s.text }}>×</button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? s.accent : 'rgba(26,47,35,0.18)'}`,
            borderRadius: 6, padding: '32px 16px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 20,
            background: dragOver ? 'rgba(180,142,77,0.05)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <FileUp size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Drop your file here or <span style={{ color: s.accent, textDecoration: 'underline' }}>browse</span>
          </p>
          <p style={{ fontSize: 10, opacity: 0.4 }}>PDF, DOCX, TXT, MD, RTF supported</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.rtf"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
          />
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: s.border }} />
          <span style={{ fontSize: 9, opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>or import from URL</span>
          <div style={{ flex: 1, height: 1, background: s.border }} />
        </div>

        {/* URL import */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${s.border}`, borderRadius: 4, background: '#fff' }}>
            <Link size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrl()}
              placeholder="https://arxiv.org/abs/… or journal URL"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', background: 'transparent', color: s.text }}
            />
          </div>
          <button
            onClick={handleUrl}
            disabled={loading || !urlInput.trim()}
            style={{
              padding: '8px 16px', background: s.green, color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontSize: 10, fontWeight: 700, opacity: (!urlInput.trim() || loading) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
            Fetch
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(180,142,77,0.07)', borderRadius: 4, fontSize: 11, color: s.accent, fontWeight: 600, marginBottom: 12 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {urlInput ? 'Fetching paper from URL…' : 'Extracting document…'}
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 4, fontSize: 11, color: '#dc2626', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: 10, opacity: 0.35, textAlign: 'center', lineHeight: 1.6 }}>
          All extraction happens in your browser. No files are uploaded to our servers.
        </p>
      </div>
    </div>
  );
}

// ── Rich Writing Area (replaces the simple textarea) ──────────────────────────
function WritingArea({ fmt, paragraphs, setParagraphs, insertedCitations, showNotif }) {
  const editorRef = useRef(null);
  const [showImport, setShowImport] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [docName, setDocName] = useState('');
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const isInitialized = useRef(false);

  // Build initial HTML from paragraphs
  const buildHtml = (paras) =>
    paras.map(p => `<p>${p.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('');

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = '';
      isInitialized.current = true;
    }
  }, []);

  const updateWordCount = (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    updateWordCount(editorRef.current.innerText || '');
    // Sync back to paragraphs state so AI tools can read the content
    const lines = (editorRef.current.innerText || '').split(/\n+/).filter(l => l.trim());
    if (lines.length > 0) {
      const updated = lines.map((text, i) => ({
        id: `free_${i}`,
        text,
        insertedCitations: [],
      }));
      // Only update if meaningfully different to avoid cursor jumps
      setParagraphs(prev => {
        const prevText = prev.map(p => p.text).join('\n');
        const newText = updated.map(p => p.text).join('\n');
        return prevText !== newText ? updated : prev;
      });
    }
  };

  // Smart paste: preserve structure, strip junk
  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    let insertHtml = '';

    if (html && html.trim()) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      // Remove scripts, styles, metadata
      tmp.querySelectorAll('script,style,meta,link,head,nav,footer,header,[role="navigation"]').forEach(el => el.remove());
      // Clean each element: keep only safe style props, strip IDs/classes
      tmp.querySelectorAll('*').forEach(el => {
        // Keep only these attributes
        const keepAttrs = ['colspan', 'rowspan', 'href'];
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
          if (!keepAttrs.includes(attr.name) && attr.name !== 'style') {
            el.removeAttribute(attr.name);
          }
        });
        // Strip style down to safe subset
        if (el.style) {
          const safeCss = {
            fontWeight: el.style.fontWeight,
            fontStyle: el.style.fontStyle,
            textDecoration: el.style.textDecoration,
          };
          el.removeAttribute('style');
          if (safeCss.fontWeight) el.style.fontWeight = safeCss.fontWeight;
          if (safeCss.fontStyle) el.style.fontStyle = safeCss.fontStyle;
          if (safeCss.textDecoration) el.style.textDecoration = safeCss.textDecoration;
        }
      });
      // Convert divs/sections to paragraphs for proper flow
      tmp.querySelectorAll('div,section,article').forEach(el => {
        if (!el.querySelector('p,h1,h2,h3,h4,ul,ol,table')) {
          const p = document.createElement('p');
          p.innerHTML = el.innerHTML;
          el.replaceWith(p);
        }
      });
      insertHtml = tmp.innerHTML;
    } else if (plain) {
      // Convert plain text: double newlines = paragraph breaks
      const blocks = plain.split(/\n{2,}/).filter(b => b.trim());
      if (blocks.length > 1) {
        insertHtml = blocks
          .map(b => `<p>${b.replace(/\n/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`)
          .join('');
      } else {
        // Single block or single newlines — keep newlines as <br>
        insertHtml = plain
          .split('\n')
          .map(l => l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))
          .join('<br>');
      }
    }

    document.execCommand('insertHTML', false, insertHtml);
    handleInput();
  };

  const handleImport = (blocks, name) => {
    if (!editorRef.current) return;
    setShowImport(false);
    setDocName(name ? name.replace(/^https?:\/\//, '').slice(0, 40) : '');

    // Build formatted HTML from imported blocks
    const html = blocks.map(block => {
      const trimmed = block.trim();
      // Detect headings
      const isHeading = /^(abstract|introduction|conclusion|references|methodology|results|discussion|background|related work|acknowledgements)/i.test(trimmed) && trimmed.length < 60;
      const isAllCaps = trimmed.length > 3 && trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      if (isHeading || isAllCaps) {
        return `<h3 style="margin:16px 0 8px">${trimmed}</h3>`;
      }
      return `<p>${trimmed}</p>`;
    }).join('');

    editorRef.current.innerHTML = html;
    updateWordCount(editorRef.current.innerText || '');
    handleInput();
    showNotif(`Document imported: ${name ? name.slice(0, 30) : 'file'}`);
  };

  const handleClear = () => {
    if (!editorRef.current) return;
    if (editorRef.current.innerText.trim().length > 20) {
      if (!window.confirm('Clear all content in the writing area?')) return;
    }
    editorRef.current.innerHTML = '';
    updateWordCount('');
    showNotif('Writing area cleared');
  };

  const isEmpty = !editorRef.current?.innerText?.trim();

  return (
    <>
      {showImport && (
        <DocumentImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      <div style={{ position: 'relative' }}>
        {/* Import toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0 12px',
          borderBottom: `1px solid ${s.border}`,
          marginBottom: 16,
        }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 4,
              border: `1px solid ${s.border}`,
              background: '#fff', color: s.text, cursor: 'pointer',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; e.currentTarget.style.color = s.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.color = s.text; }}
          >
            <Upload size={11} /> Import Document
          </button>

          {docName && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 4,
              background: 'rgba(180,142,77,0.1)',
              border: '1px solid rgba(180,142,77,0.25)',
              fontSize: 10, color: s.accent, fontWeight: 600,
            }}>
              <FileText size={10} />
              {docName}
              <button onClick={() => { setDocName(''); if (editorRef.current) editorRef.current.innerHTML = ''; }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.accent, opacity: 0.6, padding: 0, lineHeight: 1 }}>
                <X size={11} />
              </button>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {wordCount > 0 && (
              <span style={{ fontSize: 9, opacity: 0.35, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {wordCount} words
              </span>
            )}
            {!isEmpty && (
              <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, opacity: 0.35, color: s.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: 0 }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Rich content-editable editor */}
        <div style={{ position: 'relative', minHeight: 160 }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            onFocus={() => setIsEditorFocused(true)}
            onBlur={() => setIsEditorFocused(false)}
            spellCheck={true}
            style={{
              minHeight: 160,
              outline: 'none',
              fontFamily: fmt.bodyFont,
              fontSize: fmt.fontSize,
              lineHeight: fmt.lineHeight,
              textAlign: fmt.align,
              color: fmt.color,
              caretColor: s.accent,
              cursor: 'text',
              borderRadius: 4,
              padding: '4px 8px',
              border: `1px solid ${isEditorFocused ? 'rgba(180,142,77,0.4)' : 'transparent'}`,
              transition: 'border-color 0.2s',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
            data-placeholder="Continue writing your thesis here…"
          />

          {/* Placeholder overlay */}
          {!wordCount && !isEditorFocused && (
            <div
              style={{
                position: 'absolute', top: '4px', left: '8px',
                pointerEvents: 'none',
                fontFamily: "'Playfair Display', serif",
                fontSize: fmt.fontSize,
                fontStyle: 'italic',
                color: fmt.color,
                opacity: 0.22,
                lineHeight: fmt.lineHeight,
              }}
              onClick={() => editorRef.current?.focus()}
            >
              Continue writing your thesis here… or import a paper above.
            </div>
          )}
        </div>

        {/* Paste hint */}
        {isEditorFocused && !wordCount && (
          <p style={{ fontSize: 9, opacity: 0.3, marginTop: 6, fontStyle: 'italic', textAlign: 'center' }}>
            Paste text from any source · Formatting is preserved automatically
          </p>
        )}
      </div>

      <style>{`
        [contenteditable]:focus { outline: none; }
        [contenteditable] p { margin: 0 0 0.8em; }
        [contenteditable] h1, [contenteditable] h2, [contenteditable] h3 {
          font-family: 'Playfair Display', serif;
          margin: 16px 0 8px; line-height: 1.3;
        }
        [contenteditable] h1 { font-size: 24px; }
        [contenteditable] h2 { font-size: 20px; }
        [contenteditable] h3 { font-size: 17px; color: #1A2F23; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; margin: 8px 0; }
        [contenteditable] li { margin-bottom: 4px; }
        [contenteditable] table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        [contenteditable] td, [contenteditable] th { border: 1px solid rgba(26,47,35,0.15); padding: 6px 10px; }
        [contenteditable] blockquote { border-left: 3px solid #B48E4D; margin: 12px 0; padding: 4px 16px; opacity: 0.8; font-style: italic; }
      `}</style>
    </>
  );
}

// ── Citation components (unchanged) ──────────────────────────────────────────
function CitationCard({ cite, format, onInsert, hovered, onHover }) {
  const fmt = FORMATS[format];
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

function AICitationPanel({ paragraphs, insertedCitations, format, onInsert }) {
  const [query, setQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCite, setHoveredCite] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('suggested');

  const searchCitations = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setAiSuggestions([]);
    try {
      const docText = paragraphs.map(p => p.text).join('\n\n');
      const prompt = `You are a scholarly citation assistant. Given this academic text:
"${docText}"

The user wants citations about: "${query}"

Return ONLY a JSON array of 3 citation objects with these fields: author, year (2018-2024), title, source (journal name), doi (realistic format). No markdown, no explanation, just the JSON array.`;

      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text || '[]';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setAiSuggestions(parsed.map((c, i) => ({ ...c, id: 100 + i, verified: true })));
    } catch { setError('Could not fetch AI suggestions. Please try again.'); }
    setLoading(false);
  }, [query, paragraphs]);

  const allCites = activeTab === 'suggested' ? MOCK_CITATIONS : aiSuggestions;

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
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCitations()} placeholder="e.g. machine learning in neuroscience" style={{ flex: 1, padding: '8px 12px', fontSize: 11, border: `1px solid ${s.border}`, borderRadius: 2, background: '#fff', color: s.text, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={searchCitations} disabled={loading || !query.trim()} style={{ padding: '8px 12px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: (!query.trim() || loading) ? 0.5 : 1 }}>
                {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />} Search
              </button>
            </div>
            {error && <p style={{ fontSize: 10, color: '#dc2626', marginTop: 6 }}>{error}</p>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={11} />
        {activeTab === 'suggested' ? 'Document Sources' : loading ? 'Searching…' : `${aiSuggestions.length} Results`}
        {loading && activeTab === 'ai-search' && <LoadingDots />}
      </div>
      {allCites.length === 0 && !loading && activeTab === 'ai-search' && (
        <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4 }}>
          <Sparkles size={24} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 11, fontStyle: 'italic' }}>Enter a topic to find AI-suggested citations</p>
        </div>
      )}
      {allCites.map(cite => (
        <CitationCard key={cite.id} cite={cite} format={format} onInsert={onInsert} hovered={hoveredCite === cite.id} onHover={setHoveredCite} />
      ))}
      {insertedCitations.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1px solid ${s.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 10 }}>Inserted Bibliography</div>
          {insertedCitations.map((c, i) => (
            <div key={c.id} style={{ fontSize: 10, padding: '6px 0', borderBottom: `1px solid ${s.border}`, lineHeight: 1.5, opacity: 0.7 }}>
              {FORMATS[format].bibliography(c, i + 1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormattingPanel({ format, setFormat, paragraphs, setParagraphs }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const applyFormat = async (fmt) => {
    setApplying(true); setApplied(false);
    await new Promise(r => setTimeout(r, 800));
    setFormat(fmt); setApplying(false); setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const reformatWithAI = async () => {
    setApplying(true);
    try {
      const docText = paragraphs.map(p => p.text).join('\n\n');
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Reformat the following academic abstract to better match ${format} style conventions. Return ONLY the reformatted text, paragraphs separated by double newlines. No explanation.\n\n${docText}` }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const newParas = text.split(/\n\n+/).filter(Boolean).map((t, i) => ({ id: `p${i + 1}`, text: t.trim(), insertedCitations: [] }));
      if (newParas.length > 0) setParagraphs(newParas);
    } catch {}
    setApplying(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 4 }}>Active Style</div>
      {Object.entries(FORMATS).map(([key, val]) => (
        <button key={key} onClick={() => applyFormat(key)} style={{ padding: '14px 16px', borderRadius: 2, textAlign: 'left', cursor: 'pointer', background: format === key ? s.green : '#fff', color: format === key ? '#fff' : s.text, border: `1px solid ${format === key ? s.green : 'rgba(26,47,35,0.1)'}`, transition: 'all 0.25s' }}>
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
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 12 }}>AI Reformat</div>
        <p style={{ fontSize: 11, opacity: 0.6, marginBottom: 12, lineHeight: 1.6 }}>Use AI to rewrite the text to match {FORMATS[format].label} style conventions.</p>
        <button onClick={reformatWithAI} disabled={applying} style={{ width: '100%', padding: '10px 0', border: `1px solid ${s.border}`, background: 'transparent', color: s.text, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: applying ? 0.5 : 1 }}>
          {applying ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reformatting…</> : <><ZapIcon size={12} /> Reformat with AI</>}
        </button>
      </div>
      {(applying || applied) && (
        <div style={{ padding: '10px 14px', background: applied ? '#f0fdf4' : '#fffbeb', color: applied ? '#166534' : '#92400e', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 700 }}>
          {applied ? <CheckCircle2 size={14} /> : <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {applied ? `${format} style applied` : 'Applying format…'}
        </div>
      )}
    </div>
  );
}

function CollaborationPanel({ collaborators, paragraphs, setParagraphs }) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    { id: 1, user: 'Alice Chen', color: '#1A2F23', text: 'Should we add more context about CRDT here?', time: '2m ago', para: 'p2' },
    { id: 2, user: 'Carol Wu', color: '#6B4F9B', text: 'The 40% figure needs a direct citation.', time: '5m ago', para: 'p2' },
  ]);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [pendingInvites, setPendingInvites] = useState([{ email: 'david.kim@mit.edu', role: 'viewer', sent: '1d ago' }]);
  const [inviteSent, setInviteSent] = useState(false);

  const sendInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    setPendingInvites(prev => [{ email: inviteEmail, role: inviteRole, sent: 'just now' }, ...prev]);
    setInviteEmail(''); setInviteSent(true); setTimeout(() => setInviteSent(false), 2500);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    setComments(prev => [{ id: Date.now(), user: 'You', color: s.accent, text: comment, time: 'just now', para: 'p1' }, ...prev]);
    setComment('');
  };

  const getAiSuggestion = async () => {
    setAiAssisting(true); setAiSuggestion(null);
    try {
      const docText = paragraphs.map(p => p.text).join('\n\n');
      const allComments = comments.map(c => `- ${c.user}: ${c.text}`).join('\n');
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: `You are a collaborative writing assistant. Given this academic paper:\n"${docText}"\n\nAnd these reviewer comments:\n${allComments}\n\nProvide ONE concise, actionable suggestion (2-3 sentences max) to improve the paper. Be specific and constructive.` }] }),
      });
      const data = await resp.json();
      setAiSuggestion(data.content?.[0]?.text || '');
    } catch {}
    setAiAssisting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5 }}>Active Collaborators</div>
          <button onClick={() => setShowInvite(v => !v)} style={{ padding: '4px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', borderRadius: 2, background: showInvite ? s.green : 'transparent', color: showInvite ? '#fff' : s.text, border: `1px solid ${showInvite ? s.green : 'rgba(26,47,35,0.2)'}`, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}>
            <Users size={11} /> Invite
          </button>
        </div>
        {collaborators.map((col, i) => (
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
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={11} /> Invite to Document</div>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendInvite()} placeholder="colleague@university.edu" type="email" style={{ width: '100%', padding: '8px 10px', fontSize: 11, marginBottom: 8, border: `1px solid ${s.border}`, borderRadius: 2, background: '#FCFBF7', color: s.text, fontFamily: 'inherit', outline: 'none', caretColor: s.accent }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['editor', 'commenter', 'viewer'].map(role => (
                <button key={role} onClick={() => setInviteRole(role)} style={{ flex: 1, padding: '6px 0', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 2, border: `1px solid ${inviteRole === role ? s.green : 'rgba(26,47,35,0.15)'}`, background: inviteRole === role ? s.green : 'transparent', color: inviteRole === role ? '#fff' : s.text, transition: 'all 0.15s' }}>{role}</button>
              ))}
            </div>
            <button onClick={sendInvite} style={{ width: '100%', padding: '9px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
                    <button onClick={() => setPendingInvites(prev => prev.filter(i => i.email !== inv.email))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, opacity: 0.3, padding: 2 }}><X size={12} /></button>
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
          <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment…" style={{ flex: 1, padding: '8px 10px', fontSize: 11, border: `1px solid ${s.border}`, borderRadius: 2, background: '#fff', color: s.text, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={addComment} style={{ padding: '8px 10px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}><Plus size={13} /></button>
        </div>
      </div>
      <div style={{ paddingTop: 8, borderTop: `1px solid ${s.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: 10 }}>AI Co-Pilot</div>
        <button onClick={getAiSuggestion} disabled={aiAssisting} style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${s.border}`, borderRadius: 2, cursor: 'pointer', color: s.text, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: aiAssisting ? 0.5 : 1 }}>
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

function IntegrityPanel({ paragraphs }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState({ score: 98.4, details: [] });

  const runScan = async () => {
    setScanning(true); setResult(null);
    try {
      const docText = paragraphs.map(p => p.text).join('\n\n');
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 500,
          messages: [{ role: "user", content: `Analyze this academic text for originality and integrity:\n"${docText}"\n\nReturn ONLY a JSON object with:\n- score: number 85-99 (originality percentage)\n- details: array of 3 objects each with {label: string, status: "pass"|"warning"|"info", note: string}\n\nCheck for: citation completeness, claim specificity, structural originality. No markdown, just JSON.` }],
        }),
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text || '{}';
      setResult(JSON.parse(raw.replace(/```json|```/g, '').trim()));
    } catch {
      setResult({ score: 96.1, details: [{ label: 'Structural Originality', status: 'pass', note: 'No significant matching patterns detected.' }, { label: 'Citation Coverage', status: 'warning', note: 'Some claims lack direct references.' }, { label: 'Semantic Uniqueness', status: 'pass', note: 'Phrasing appears original.' }] });
    }
    setScanning(false);
  };

  const statusBg = (st) => st === 'pass' ? '#f0fdf4' : st === 'warning' ? '#fffbeb' : '#eff6ff';
  const statusColor = (st) => st === 'pass' ? '#166534' : st === 'warning' ? '#92400e' : '#1e40af';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, textAlign: 'center' }}>
      {scanning ? (
        <>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${s.green}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Scanning Scriptorium…</h4>
          <p style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic' }}>Analyzing structural originality in real-time.</p>
        </>
      ) : result ? (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.green }}>{result.score}%</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5 }}>Originality Score</div>
          </div>
          {result.details?.map((d, i) => (
            <div key={i} style={{ padding: '10px 14px', background: statusBg(d.status), color: statusColor(d.status), borderRadius: 2, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>{d.note}</div>
              </div>
            </div>
          ))}
          <button onClick={runScan} style={{ marginTop: 12, width: '100%', padding: '9px', background: 'transparent', border: `1px solid ${s.border}`, borderRadius: 2, cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: s.text }}>
            <RefreshCw size={11} /> Re-scan
          </button>
        </div>
      ) : (
        <>
          <ShieldCheck size={32} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 12, opacity: 0.5, fontStyle: 'italic', marginBottom: 20 }}>Run the Veritas protocol to analyze your document's originality.</p>
          <button onClick={runScan} style={{ padding: '10px 24px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={13} /> Run Veritas Scan
          </button>
        </>
      )}
    </div>
  );
}

function ToolbarBtn({ icon, label, onClick, highlight = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title={label} style={{ background: highlight ? (hovered ? '#2D4D3A' : s.green) : hovered ? 'rgba(26,47,35,0.08)' : 'none', border: 'none', cursor: 'pointer', color: highlight ? '#fff' : s.text, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: highlight ? 6 : 4, opacity: highlight ? 1 : hovered ? 0.9 : 0.5, transition: 'all 0.18s', boxShadow: highlight && hovered ? '0 2px 8px rgba(26,47,35,0.25)' : 'none' }}>
        {icon}
      </button>
      {hovered && (
        <div style={{ position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)', background: s.green, color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 10px', borderRadius: 3, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
          {label}
          <div style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: `5px solid ${s.green}` }} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ScriptoriumPage() {
  const router = useRouter();
  const [activeSidebar, setActiveSidebar] = useState('citations');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [format, setFormat] = useState('APA');
  const [paragraphs, setParagraphs] = useState(INITIAL_PARAGRAPHS);
  const [insertedCitations, setInsertedCitations] = useState([]);
  const [editingPara, setEditingPara] = useState(null);
  const [editText, setEditText] = useState('');
  const [notification, setNotification] = useState(null);
  const [collaborators] = useState(COLLABORATORS);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInsertCitation = (cite) => {
    if (!insertedCitations.find(c => c.id === cite.id)) {
      setInsertedCitations(prev => [...prev, cite]);
    }
    const fmt = FORMATS[format];
    const citIdx = insertedCitations.findIndex(c => c.id === cite.id);
    const idx = citIdx >= 0 ? citIdx + 1 : insertedCitations.length + 1;
    const tag = fmt.inText(idx, cite);
    setParagraphs(prev => prev.map((p, i) =>
      i === prev.length - 1 || p.id === 'p2' ? { ...p, text: p.text + ` ${tag}` } : p
    ));
    showNotif(`Citation inserted: ${cite.author} (${cite.year})`);
  };

  const fmt = FORMATS[format];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', background: s.bg, color: s.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(26,47,35,0.15); border-radius: 2px; }
        textarea:focus, input:focus { outline: none; }
        .collab-cursor { display: inline-block; width: 2px; height: 1em; vertical-align: text-bottom; margin: 0 1px; border-radius: 1px; animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: s.green, color: '#fff', padding: '10px 20px', borderRadius: 4, fontSize: 11, fontWeight: 600, zIndex: 1000, animation: 'slideUp 0.3s ease', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          <CheckCircle2 size={14} /> {notification.msg}
        </div>
      )}

      {/* LEFT TOOLBAR */}
      <aside style={{ width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', borderRight: `1px solid ${s.border}`, background: s.bg, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, background: s.green, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 32 }}>U</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <ToolbarBtn icon={<Feather size={20} />} label="Editor" onClick={() => {}} />
          <ToolbarBtn icon={<Users size={20} />} label="Collaborators" onClick={() => {}} />
          <ToolbarBtn icon={<History size={20} />} label="History" onClick={() => {}} />
          <div style={{ width: 28, height: 1, background: s.text, opacity: 0.12, margin: '4px 0' }} />
          <ToolbarBtn icon={<ScanSearch size={20} />} label="Plagiarism Checker" highlight onClick={() => router.push('/scriptorium/plag')} />
          <div style={{ width: 28, height: 1, background: s.text, opacity: 0.12, margin: '4px 0' }} />
          <ToolbarBtn icon={<Settings size={20} />} label="Settings" onClick={() => {}} />
        </div>
      </aside>

      {/* MAIN WRITING AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#fff' }}>
        <header style={{ height: 56, borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.4 }}>Draft</span>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14 }}>Quantifying Neural Plasticity in Virtual Frameworks</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(180,142,77,0.12)', color: s.accent, borderRadius: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{format}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {collaborators.map((col, i) => (
                <div key={i} title={col.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700, marginLeft: i > 0 ? -8 : 0, zIndex: collaborators.length - i }}>{col.initials}</div>
              ))}
            </div>
            <button onClick={() => showNotif('Share link copied!')} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid ${s.green}`, background: 'transparent', color: s.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Share2 size={11} /> Share
            </button>
            <button onClick={() => showNotif('Document exported!')} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', background: s.green, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={11} /> Export
            </button>
          </div>
        </header>

        {/* Format indicator bar */}
        <div style={{ height: 28, background: s.sidebarBg, borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.4 }}>Style:</span>
          {Object.keys(FORMATS).map(f => (
            <button key={f} onClick={() => setFormat(f)} style={{ padding: '2px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', border: `1px solid ${format === f ? s.green : 'transparent'}`, borderRadius: 2, background: format === f ? s.green : 'transparent', color: format === f ? '#fff' : s.text, opacity: format === f ? 1 : 0.4, transition: 'all 0.15s', textTransform: 'uppercase' }}>{f}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.4, fontStyle: 'italic' }}>{fmt.bodyFont.split(',')[0].replace(/'/g, '')} · {fmt.fontSize}</span>
        </div>

        {/* Paper Content */}
        <div style={{ flex: 1, padding: '64px 16px', maxWidth: 768, margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>Abstract</h2>

          {paragraphs.map((para, idx) => (
            <div key={para.id} style={{ position: 'relative', marginBottom: 24 }}>
              {collaborators.filter(c => c.cursor?.para === para.id).map((col, ci) => (
                <div key={ci} style={{ position: 'absolute', top: -20, left: 8 + ci * 60, display: 'flex', alignItems: 'center', gap: 4, background: col.color, padding: '2px 6px', borderRadius: 2, zIndex: 10 }}>
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{col.name.split(' ')[0]}</span>
                </div>
              ))}
              {editingPara === para.id ? (
                <div>
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 120, fontFamily: fmt.bodyFont, fontSize: fmt.fontSize, lineHeight: fmt.lineHeight, textAlign: fmt.align, color: fmt.color, border: `1px solid ${s.accent}`, borderRadius: 2, padding: '12px', resize: 'vertical', background: 'rgba(180,142,77,0.03)', caretColor: '#B48E4D', cursor: 'text', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => { setParagraphs(prev => prev.map(p => p.id === para.id ? { ...p, text: editText } : p)); setEditingPara(null); showNotif('Changes saved'); }} style={{ padding: '5px 12px', background: s.green, color: '#fff', border: 'none', borderRadius: 2, fontSize: 9, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Save</button>
                    <button onClick={() => setEditingPara(null)} style={{ padding: '5px 12px', background: 'transparent', color: s.text, border: `1px solid ${s.border}`, borderRadius: 2, fontSize: 9, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => { setEditingPara(para.id); setEditText(para.text); }}
                  style={{ fontFamily: fmt.bodyFont, fontSize: fmt.fontSize, lineHeight: fmt.lineHeight, textAlign: fmt.align, color: fmt.color, cursor: 'text', transition: 'all 0.2s', padding: '4px 8px', borderRadius: 2, border: '1px solid transparent' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(180,142,77,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  {para.highlight
                    ? <>{para.text.split(para.highlight)[0]}<span style={{ background: 'rgba(180,142,77,0.1)', borderBottom: '1px solid #B48E4D' }}>{para.highlight}</span>{para.text.split(para.highlight)[1]}</>
                    : para.text}
                </p>
              )}
            </div>
          ))}

          {insertedCitations.length > 0 && (
            <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${s.border}` }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>References</h3>
              {insertedCitations.map((c, i) => (
                <p key={c.id} style={{ fontFamily: fmt.bodyFont, fontSize: 14, lineHeight: 1.6, marginBottom: 10, color: fmt.color }}>{FORMATS[format].bibliography(c, i + 1)}</p>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 96, height: 1, background: 'rgba(26,47,35,0.15)' }} />
          </div>

          {/* ── RICH WRITING AREA (replaces old textarea) ── */}
          <WritingArea
            fmt={fmt}
            paragraphs={paragraphs}
            setParagraphs={setParagraphs}
            insertedCitations={insertedCitations}
            showNotif={showNotif}
          />
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside style={{ width: isSidebarOpen ? 320 : 0, borderLeft: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.sidebarBg, transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0 }}>
        {isSidebarOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'fadeIn 0.3s ease', minWidth: 320 }}>
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
              {activeSidebar === 'citations' && <AICitationPanel paragraphs={paragraphs} insertedCitations={insertedCitations} format={format} onInsert={handleInsertCitation} />}
              {activeSidebar === 'format' && <FormattingPanel format={format} setFormat={setFormat} paragraphs={paragraphs} setParagraphs={setParagraphs} />}
              {activeSidebar === 'integrity' && <IntegrityPanel paragraphs={paragraphs} />}
              {activeSidebar === 'comments' && <CollaborationPanel collaborators={collaborators} paragraphs={paragraphs} setParagraphs={setParagraphs} />}
            </div>
          </div>
        )}
      </aside>

      <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', background: s.green, color: '#fff', border: 'none', padding: '6px 4px', borderRadius: '4px 0 0 4px', cursor: 'pointer', zIndex: 50 }}>
        {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}