// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { editorExtensions } from './extensions';
import { preserveBlankLines } from './markdown';

function load(markdown: string) {
  return new Editor({ extensions: editorExtensions(), content: preserveBlankLines(markdown), contentType: 'markdown' });
}
function roundTrip(markdown: string) {
  const editor = load(markdown);
  const out = editor.getMarkdown();
  editor.destroy();
  return out;
}
function blocks(markdown: string) {
  const editor = load(markdown);
  const types = (editor.getJSON().content ?? []).map(node => node.type === 'paragraph' && !node.content?.length ? 'empty' : node.type);
  editor.destroy();
  return types;
}

describe('markdown fidelity', () => {
  const lossless: Record<string, string> = {
    'plain multi-line text': 'milk, eggs\nbread\nbutter',
    'paragraphs': 'first paragraph\n\nsecond paragraph',
    'one empty paragraph': 'top\n\n\n\nbottom',
    'checklist': '- [ ] glass morph\n- [x] spring tuning',
    'nested checklist': '- [ ] parent\n  - [ ] child\n  - [x] done child',
    'inline marks': 'some **bold**, *italic*, ~~gone~~, ==marked== and `code`',
    'headings': '# Title\n\n## Section\n\n### Detail',
    'bullet list': '- one\n- two\n  - nested',
    'ordered list': '1. first\n2. second',
    'quote': '> quoted line',
    'divider': 'above\n\n---\n\nbelow',
    'code block with blank lines': '```\nconst x = 1;\n\n\nconsole.log(x);\n```',
    'link': 'see [the docs](https://tiptap.dev) now',
    'turkish text': 'Şu notu ğüşıöç ile yazdım\nikinci satır',
  };
  for (const [name, markdown] of Object.entries(lossless)) {
    it(`keeps ${name} byte-identical`, () => { expect(roundTrip(markdown)).toBe(markdown); });
  }

  it('keeps every blank line of older plain-text notes', () => {
    expect(blocks('top\n\n\nbottom')).toEqual(['paragraph', 'empty', 'paragraph']);
    expect(blocks('top\n\n\n\n\nbottom')).toEqual(['paragraph', 'empty', 'empty', 'empty', 'paragraph']);
    expect(blocks('top\n\n\n\n\n\nbottom')).toEqual(['paragraph', 'empty', 'empty', 'empty', 'empty', 'paragraph']);
  });

  it('settles after the first save and never drifts', () => {
    for (const markdown of ['top\n\n\nbottom', 'a\n\n\n\n\n\nb', 'Groceries\n- [ ] milk\n- [ ] eggs', '\n\n\nleading', 'trailing\n\n\n']) {
      const once = roundTrip(markdown);
      expect(roundTrip(once)).toBe(once);
    }
  });

  it('leaves editor output untouched by the blank-line rewrite', () => {
    for (const markdown of Object.values(lossless)) expect(preserveBlankLines(roundTrip(markdown))).toBe(roundTrip(markdown));
  });
});
