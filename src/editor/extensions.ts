import { Extension, type AnyExtension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { HardBreak } from '@tiptap/extension-hard-break';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { preserveBlankLines } from './markdown';
import { slashCommands, type SlashStore } from './slash';
import { MarkShortcuts } from './marks';

/**
 * Notes were written as plain text, where a single newline is a line break.
 * Parse it that way (`breaks`) and write it back as a bare `\n` rather than
 * Markdown's trailing-two-spaces form, so untouched lines stay byte-identical.
 */
const LineBreak = HardBreak.extend({ renderMarkdown: () => '\n' });

/** Plain text that reads as Markdown (headings, lists, emphasis, fences…). */
const LOOKS_LIKE_MARKDOWN = /^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~|---)|\*\*.+\*\*|==.+==|~~.+~~|\[[^\]]+\]\([^)]+\)/m;

/** Pasting Markdown text (not rich HTML) inserts it formatted instead of showing the markers. */
const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      props: {
        handlePaste: (view, event) => {
          const data = event.clipboardData;
          const text = data?.getData('text/plain');
          if (!text || data?.types.includes('text/html') || !LOOKS_LIKE_MARKDOWN.test(text)) return false;
          if (view.state.selection.$from.parent.type.spec.code) return false;
          return editor.commands.insertContent(preserveBlankLines(text), { contentType: 'markdown' });
        },
      },
    })];
  },
});

/** Ctrl+Enter ticks or unticks the checklist item under the caret. */
const ToggleTask = Extension.create({
  name: 'toggleTask',
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': ({ editor }) => {
        const { $from } = editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name !== 'taskItem') continue;
          const position = $from.before(depth);
          return editor.commands.command(({ tr }) => { tr.setNodeMarkup(position, undefined, { ...node.attrs, checked: !node.attrs.checked }); return true; });
        }
        return false;
      },
    };
  },
});

/** The one extension list shared by the editor and the Markdown tests. */
export function editorExtensions({ placeholder, slash }: { placeholder?: string; slash?: SlashStore } = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      hardBreak: false,
      underline: false, // Markdown has no underline; keep the format lossless.
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https' },
    }),
    LineBreak,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight,
    Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
    MarkdownPaste,
    MarkShortcuts,
    ToggleTask,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ...(slash ? [slashCommands(slash)] : []),
  ];
}
