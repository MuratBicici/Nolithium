import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { editorExtensions } from '../editor/extensions';
import { preserveBlankLines, serializeMarkdown } from '../editor/markdown';
import { openLink } from '../editor/links';
import { SelectionBubble } from './SelectionBubble';
import { SlashMenu } from './SlashMenu';
import { createSlashStore } from '../editor/slash';

interface Props {
  /** Markdown source; read once when the editor mounts. */
  content: string;
  onChange: (markdown: string) => void;
  onReady?: (editor: Editor | null) => void;
}

/**
 * WYSIWYG writing surface. Markdown stays the stored format: it is parsed on
 * mount and serialized only after a real edit, so opening a note never rewrites it.
 */
export function RichEditor({ content, onChange, onReady }: Props) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  // Markdown as of the last save (or as loaded). Structural housekeeping such as
  // the trailing paragraph added on focus serializes identically and is ignored.
  const saved = useRef<string | null>(null);
  const slash = useMemo(createSlashStore, []);
  const extensions = useMemo(() => editorExtensions({ placeholder: 'Write…  ·  type / for blocks', slash }), [slash]);
  const editor = useEditor({
    extensions,
    content: preserveBlankLines(content),
    contentType: 'markdown',
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: 'zen-prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Note content', spellcheck: 'true' },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = serializeMarkdown(current);
      if (markdown === saved.current) return;
      saved.current = markdown;
      change.current(markdown);
    },
  });
  // Captured synchronously on the first render, before any transaction (focus,
  // trailing paragraph) can fire an update.
  if (editor && saved.current === null) saved.current = serializeMarkdown(editor);
  useEffect(() => {
    onReady?.(editor);
    editor?.commands.focus('end', { scrollIntoView: false });
    return () => onReady?.(null);
    // The editor instance is created once per mount.
  }, [editor]);

  // While Ctrl is held, links show a pointer to hint they can be followed.
  useEffect(() => {
    const sync = (event: KeyboardEvent) => scroller?.classList.toggle('links-live', event.ctrlKey || event.metaKey);
    const clear = () => scroller?.classList.remove('links-live');
    window.addEventListener('keydown', sync); window.addEventListener('keyup', sync); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', sync); window.removeEventListener('keyup', sync); window.removeEventListener('blur', clear); };
  }, [scroller]);

  /**
   * Links are opened only here, exactly once. The WebView's own handling of a
   * Ctrl/middle click on an <a> (a new window) is always suppressed — handling it
   * in ProseMirror's mouseup instead let the native click through, opening twice.
   */
  function followLink(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest?.('.zen-prose a[href]');
    if (!anchor) return;
    event.preventDefault();
    if (event.type === 'click' && (event.ctrlKey || event.metaKey)) void openLink(anchor.getAttribute('href')!);
  }

  return <div ref={setScroller} className="zen-scroll" onClickCapture={followLink} onAuxClickCapture={followLink} onMouseDown={event => {
    // Clicks in the margins below the text continue writing at the end.
    if (event.target === event.currentTarget && editor) { event.preventDefault(); editor.commands.focus('end'); }
  }}>
    <EditorContent editor={editor} className="zen-doc" />
    {editor && <SelectionBubble editor={editor} scrollTarget={scroller} />}
    <SlashMenu store={slash} />
  </div>;
}
