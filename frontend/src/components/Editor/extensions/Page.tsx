import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';

export const Page = Node.create({
  name: 'page',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [{ tag: 'div[data-type="page"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page', class: 'page-container' }), ['div', { class: 'page-content' }, 0]];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(PageView);
  }
});

function PageView() {
  return (
    <NodeViewWrapper className="page-container" style={{
      width: '816px',
      minHeight: '1123px',
      padding: '96px',
      margin: '0 auto 40px auto',
      background: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'visible',
      boxSizing: 'border-box',
      pageBreakAfter: 'always',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    }}>
      <NodeViewContent className="page-content" style={{
        height: '100%',
        width: '100%',
      }} />
    </NodeViewWrapper>
  );
}
