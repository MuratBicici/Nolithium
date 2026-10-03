import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import { Bold, Check, ChevronDown, Code, Highlighter, Italic, Link2, List, ListChecks, Strikethrough, Unlink } from 'lucide-react';
import { snappySpring } from '../motion';
import { normalizeUrl } from '../editor/links';
import { markCoversSelection, toggleMark } from '../editor/marks';

const PLUGIN_KEY = 'selectionBubble';
const BLOCKS = [['Text', 0], ['Heading 1', 1], ['Heading 2', 2], ['Heading 3', 3]] as const;

function Tool({ label, shortcut, active, onClick, children }: { label: string; shortcut?: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`bubble-button ${active ? 'is-on' : ''}`} aria-label={label} aria-pressed={active} title={shortcut ? `${label} · ${shortcut}` : label} onClick={onClick}>{children}</button>;
}

/** Floating glass toolbar over a text selection; the desk stays clutter-free otherwise. */
export function SelectionBubble({ editor, scrollTarget }: { editor: Editor; scrollTarget?: HTMLElement | null }) {
  const [entrance, setEntrance] = useState(0);
  const [linking, setLinking] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState(false);
  const linkField = useRef<HTMLInputElement>(null);
  const linkingRef = useRef(linking);
  linkingRef.current = linking;
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      // Edge spaces in a selection don't count, so pasted or double-clicked bold text reads as bold.
      bold: markCoversSelection(e, 'bold'), italic: markCoversSelection(e, 'italic'), strike: markCoversSelection(e, 'strike'),
      code: markCoversSelection(e, 'code'), highlight: markCoversSelection(e, 'highlight'), link: markCoversSelection(e, 'link'), href: (e.getAttributes('link').href as string | undefined) ?? '',
      level: ([1, 2, 3] as const).find(level => e.isActive('heading', { level })) ?? 0,
      bullet: e.isActive('bulletList'), task: e.isActive('taskList'),
    }),
  });

  const reposition = () => editor.view.dispatch(editor.state.tr.setMeta(PLUGIN_KEY, 'updatePosition'));
  function startLink() {
    if (editor.state.selection.empty) {
      if (!editor.isActive('link')) return;
      editor.chain().extendMarkRange('link').run();
    }
    setUrl(editor.getAttributes('link').href ?? ''); setInvalid(false); setTypesOpen(false); setLinking(true);
  }
  function finishLink(apply: boolean) {
    if (apply) {
      const href = normalizeUrl(url);
      if (url.trim() && !href) { setInvalid(true); return; }
      const chain = editor.chain().focus().extendMarkRange('link');
      (href ? chain.setLink({ href }) : chain.unsetLink()).run();
    } else editor.commands.focus();
    setLinking(false);
  }

  // Ctrl+K opens the link field for the selection, or for the link under the caret.
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'k') { event.preventDefault(); startLink(); }
    };
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  });
  useEffect(() => { if (linking) linkField.current?.focus({ preventScroll: true }); reposition(); }, [linking, typesOpen]);

  // Stable identities: new ones would make BubbleMenu push an options update on every render.
  const shouldShow = useCallback<NonNullable<BubbleMenuProps['shouldShow']>>(({ editor: e, state: s, from, to }) =>
    linkingRef.current || (from !== to && e.isEditable && !(s.selection instanceof NodeSelection) && e.view.hasFocus()), []);
  const options = useMemo<BubbleMenuProps['options']>(() => ({
    placement: 'top-start', offset: 10, flip: { padding: 16 }, shift: { padding: 16 }, scrollTarget: scrollTarget ?? undefined,
    onShow: () => setEntrance(count => count + 1), onHide: () => { setLinking(false); setTypesOpen(false); },
  }), [scrollTarget]);

  const blockLabel = state.level ? `H${state.level}` : 'Text';
  return <BubbleMenu editor={editor} pluginKey={PLUGIN_KEY} className="bubble-anchor"
    shouldShow={shouldShow} options={options}>
    <motion.div key={entrance} className="selection-bubble glass-surface" role="toolbar" aria-label="Formatting"
      initial={{ opacity: 0, scale: 0.96, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={snappySpring}
      // Keep the text selection while clicking tools (the link field still takes focus).
      onMouseDown={event => { if (!(event.target instanceof HTMLInputElement)) event.preventDefault(); }}
      onKeyDown={event => { if (event.key === 'Escape' && (linking || typesOpen)) { event.preventDefault(); event.stopPropagation(); if (linking) finishLink(false); setTypesOpen(false); } }}>
      {linking
        ? <form className="bubble-link" onSubmit={event => { event.preventDefault(); finishLink(true); }}>
            <Link2 size={14} aria-hidden="true" />
            <input ref={linkField} value={url} placeholder="Paste or type a link" aria-label="Link address" aria-invalid={invalid} spellCheck={false}
              onChange={event => { setUrl(event.target.value); setInvalid(false); }} />
            {state.link && <Tool label="Remove link" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setLinking(false); }}><Unlink size={14} /></Tool>}
            <button type="submit" className="bubble-button" aria-label="Apply link" title="Apply · Enter"><Check size={15} /></button>
          </form>
        : <>
            <Tool label="Bold" shortcut="Ctrl+B" active={state.bold} onClick={() => toggleMark(editor, 'bold')}><Bold size={15} /></Tool>
            <Tool label="Italic" shortcut="Ctrl+I" active={state.italic} onClick={() => toggleMark(editor, 'italic')}><Italic size={15} /></Tool>
            <Tool label="Strikethrough" shortcut="Ctrl+Shift+S" active={state.strike} onClick={() => toggleMark(editor, 'strike')}><Strikethrough size={15} /></Tool>
            <Tool label="Code" shortcut="Ctrl+E" active={state.code} onClick={() => toggleMark(editor, 'code')}><Code size={15} /></Tool>
            <Tool label="Highlight" shortcut="Ctrl+Shift+H" active={state.highlight} onClick={() => toggleMark(editor, 'highlight')}><Highlighter size={15} /></Tool>
            <Tool label="Link" shortcut="Ctrl+K" active={state.link} onClick={startLink}><Link2 size={15} /></Tool>
            <span className="bubble-divider" />
            <div className="bubble-types">
              <button type="button" className={`bubble-button bubble-type ${typesOpen ? 'is-on' : ''}`} aria-haspopup="menu" aria-expanded={typesOpen} aria-label={`Text style: ${blockLabel}`} title="Text style" onClick={() => setTypesOpen(open => !open)}>{blockLabel}<ChevronDown size={12} /></button>
              {typesOpen && <div className="bubble-type-list glass-surface" role="menu">
                {BLOCKS.map(([label, level]) => <button key={label} type="button" role="menuitemradio" aria-checked={state.level === level} className={state.level === level ? 'is-on' : ''}
                  onClick={() => { const chain = editor.chain().focus(); (level ? chain.setHeading({ level }) : chain.setParagraph()).run(); setTypesOpen(false); }}>
                  <span className={`type-sample type-h${level}`}>{label}</span>{state.level === level && <Check size={13} />}
                </button>)}
              </div>}
            </div>
            <Tool label="Bullet list" shortcut="Ctrl+Shift+8" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Tool>
            <Tool label="Checklist" shortcut="Ctrl+Shift+9" active={state.task} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={15} /></Tool>
          </>}
    </motion.div>
  </BubbleMenu>;
}
