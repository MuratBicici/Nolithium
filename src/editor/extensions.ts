import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HardBreak } from '@tiptap/extension-hard-break';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';

/**
 * Notes were written as plain text, where a single newline is a line break.
 * Parse it that way (`breaks`) and write it back as a bare `\n` rather than
 * Markdown's trailing-two-spaces form, so untouched lines stay byte-identical.
 */
const LineBreak = HardBreak.extend({ renderMarkdown: () => '\n' });

/** The one extension list shared by the editor and the Markdown tests. */
export function editorExtensions({ placeholder }: { placeholder?: string } = {}): AnyExtension[] {
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
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
