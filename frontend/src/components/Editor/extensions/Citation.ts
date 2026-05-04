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
        class: 'citation-node',
        style: 'color: inherit; font-weight: 600;',
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
