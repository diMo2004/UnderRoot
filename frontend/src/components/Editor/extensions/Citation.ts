import { Node, mergeAttributes } from '@tiptap/core';

export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      citationId: {
        default: null,
      },
      inText: {
        default: '?',
      },
      paperId: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="citation"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'citation',
        class: 'citation-node inline-block bg-gold-100 text-gold-900 px-1 rounded cursor-pointer hover:bg-gold-200 transition-colors',
        style: 'background-color: rgba(184, 150, 46, 0.1); color: #B8962E; padding: 0 4px; border-radius: 3px; font-weight: 600;',
      }),
      HTMLAttributes.inText,
    ];
  },

  addCommands() {
    return {
      setCitation: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },
});
