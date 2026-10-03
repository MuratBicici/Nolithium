// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { editorExtensions } from './extensions';
import { preserveBlankLines, serializeMarkdown } from './markdown';
import { createSlashStore, filterSlashItems } from './slash';
import { markCoversSelection } from './marks';

function load(markdown: string) {
  return new Editor({ extensions: editorExtensions(), content: preserveBlankLines(markdown), contentType: 'markdown' });
}
function roundTrip(markdown: string) {
  const editor = load(markdown);
  const out = serializeMarkdown(editor);
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

function type(editor: Editor, text: string) {
  for (const char of text) {
    const { view } = editor;
    const { from, to } = view.state.selection;
    const handled = view.someProp('handleTextInput', input => input(view, from, to, char, () => view.state.tr.insertText(char, from, to)));
    if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
  }
}

describe('editor behaviour', () => {
  it('ticks and unticks the checklist item under the caret with Ctrl+Enter', () => {
    const editor = load('- [ ] milk\n- [ ] eggs');
    editor.commands.setTextSelection(4);
    editor.commands.keyboardShortcut('Mod-Enter');
    expect(serializeMarkdown(editor)).toBe('- [x] milk\n- [ ] eggs');
    editor.commands.keyboardShortcut('Mod-Enter');
    expect(serializeMarkdown(editor)).toBe('- [ ] milk\n- [ ] eggs');
    editor.destroy();
  });

  it('turns typed Markdown shortcuts into formatting', () => {
    const editor = load('');
    type(editor, '# Title');
    expect(serializeMarkdown(editor)).toBe('# Title');
    editor.commands.setContent('', { contentType: 'markdown' });
    type(editor, '[ ] milk');
    expect(serializeMarkdown(editor)).toBe('- [ ] milk');
    editor.commands.setContent('', { contentType: 'markdown' });
    type(editor, 'so **bold** move');
    expect(serializeMarkdown(editor)).toBe('so **bold** move');
    editor.destroy();
  });
});

describe('slash commands', () => {
  it('filters by title and keywords, Turkish ones included', () => {
    expect(filterSlashItems('').length).toBe(9);
    expect(filterSlashItems('che').map(item => item.id)).toEqual(['task']);
    expect(filterSlashItems('head').map(item => item.id)).toEqual(['h1', 'h2', 'h3']);
    expect(filterSlashItems('alıntı').map(item => item.id)).toEqual(['quote']);
    expect(filterSlashItems('zzz')).toEqual([]);
  });

  it('turns "/che" + select into a checklist and removes the typed command', async () => {
    const slash = createSlashStore();
    const editor = new Editor({ extensions: editorExtensions({ slash }), content: 'Groceries', contentType: 'markdown' });
    editor.commands.focus('end');
    editor.commands.enter();
    type(editor, '/che');
    await new Promise(resolve => setTimeout(resolve, 0)); // items resolve asynchronously
    const session = slash.get();
    expect(session?.items.map(item => item.id)).toEqual(['task']);
    session!.select(session!.items[0]);
    expect(serializeMarkdown(editor)).toBe('Groceries\n\n- [ ] ');
    expect(slash.get()).toBeNull();
    editor.destroy();
  });
});

describe('mark state follows what the reader sees', () => {
  // Paragraph content starts at position 1: "boldword" = 1..9, the space = 9..10, "next" = 10..14.
  it('treats bold text as bold even when the selection includes an edge space', () => {
    const editor = load('**boldword** next');
    editor.commands.setTextSelection({ from: 1, to: 10 });
    expect(markCoversSelection(editor, 'bold')).toBe(true);
    expect(editor.isActive('bold')).toBe(false); // the stock check that misled the bubble
    editor.commands.setTextSelection({ from: 1, to: 14 });
    expect(markCoversSelection(editor, 'bold')).toBe(false);
    editor.destroy();
  });

  it('makes Ctrl+B remove bold from such a selection instead of re-applying it', () => {
    const editor = load('**boldword** next');
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.keyboardShortcut('Mod-b');
    expect(serializeMarkdown(editor)).toBe('boldword next');
    editor.commands.setTextSelection({ from: 1, to: 14 });
    editor.commands.keyboardShortcut('Mod-b');
    expect(serializeMarkdown(editor)).toBe('**boldword next**');
    editor.destroy();
  });

  it('keeps Ctrl+B toggling the typing style with no selection', () => {
    const editor = load('plain');
    editor.commands.setTextSelection(6);
    // A real keydown: the keyboardShortcut() command drops stored marks.
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ...(/Mac/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }), bubbles: true, cancelable: true }));
    type(editor, 'X');
    expect(serializeMarkdown(editor)).toBe('plain**X**');
    editor.destroy();
  });
});
