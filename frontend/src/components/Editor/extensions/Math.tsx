import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- Inline Math ---
export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: 'E = mc^2' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-math' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\$([^$]+)\$$/,
        type: this.type,
        getAttributes: (match) => ({ latex: match[1] }),
      }),
    ];
  },
});

// --- Block Math ---
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'inline*',
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '\\int_{a}^{b} f(x) dx = F(b) - F(a)' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\$\$([^$]+)\$\$\s$/,
        type: this.type,
        getAttributes: (match) => ({ latex: match[1] }),
      }),
    ];
  },
});

function MathComponent({ node, updateAttributes, selected }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isBlock = node.type.name === 'mathBlock';

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Adjust height for block math textarea
      if (isBlock) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
      }
    }
  }, [isEditing, isBlock]);

  const handleBlur = () => {
    setIsEditing(false);
    updateAttributes({ latex });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isBlock) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLatex(node.attrs.latex);
      setIsEditing(false);
    }
  };

  // Render KaTeX
  let html = '';
  try {
    html = katex.renderToString(latex || ' ', {
      throwOnError: false,
      displayMode: isBlock,
    });
  } catch (e) {
    html = `<span style="color: red;">Error: ${e}</span>`;
  }

  return (
    <NodeViewWrapper
      className={`math-node ${isBlock ? 'math-block' : 'math-inline'} ${selected ? 'selected' : ''}`}
      style={{
        display: isBlock ? 'block' : 'inline-block',
        margin: isBlock ? '1.5rem 0' : '0 2px',
        verticalAlign: 'middle',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div
        ref={containerRef}
        onClick={() => setIsEditing(true)}
        className="katex-render"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          padding: isBlock ? '12px' : '2px 4px',
          borderRadius: '4px',
          background: selected ? 'rgba(180,142,77,0.1)' : 'transparent',
          border: selected ? '1px solid #B48E4D' : '1px solid transparent',
          textAlign: isBlock ? 'center' : 'left',
          minWidth: '20px',
          minHeight: '20px',
        }}
      />

      {isEditing && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: isBlock ? '50%' : 0,
            transform: isBlock ? 'translateX(-50%)' : 'none',
            zIndex: 1000,
            background: '#fff',
            padding: '8px',
            borderRadius: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            border: '1px solid #ddd',
            width: isBlock ? '400px' : '250px',
            marginTop: '8px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#aaa', marginBottom: '6px', textTransform: 'uppercase' }}>
            LaTeX Editor
          </div>
          <textarea
            ref={inputRef}
            value={latex}
            onChange={(e) => {
              setLatex(e.target.value);
              if (isBlock) {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type LaTeX here..."
            style={{
              width: '100%',
              minHeight: isBlock ? '80px' : '40px',
              border: '1px solid #eee',
              borderRadius: '4px',
              padding: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'none',
              display: 'block',
              background: '#fcfcfc',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '9px', color: '#999' }}>Press Enter to save</span>
            <button 
              onMouseDown={(e) => e.preventDefault()} // Prevent blur
              onClick={handleBlur}
              style={{ padding: '4px 10px', background: '#1A2F23', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
