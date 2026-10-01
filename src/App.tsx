import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { Feather, RotateCcw, X } from 'lucide-react';
import { Appearance } from './components/Appearance';
import { useGlassBlur } from './useGlassBlur';
import { NotesBoard } from './components/NotesBoard';
import { ContextMenu } from './components/ContextMenu';
import { ZenEditor, type Rect } from './components/ZenEditor';
import { dragWindow, WindowControls } from './components/WindowControls';
import { DESK_KEY, deskGeometry, discardEmptyDrafts, loadDesk } from './desk';
import type { Note } from './types';
import { quickFade } from './motion';

type MenuState = { id: string; x: number; y: number };

/**
 * Return focus to where the user was without highlighting it. The ring and tile
 * glow come back as soon as they navigate again (focus leaves this element).
 */
function focusQuietly(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.setAttribute('data-quiet-focus', '');
  element.addEventListener('blur', () => element.removeAttribute('data-quiet-focus'), { once: true });
  element.focus({ preventScroll: true });
  if (document.activeElement !== element) element.removeAttribute('data-quiet-focus');
}

export default function App() {
  const glass = useGlassBlur();
  const [loaded] = useState(() => {
    try { return loadDesk(localStorage); }
    catch { return { notes: [], error: 'Local storage is unavailable.' }; }
  });
  const [notes, setNotes] = useState(loaded.notes);
  const [color, setColor] = useState(() => { try { const value = localStorage.getItem('nolithium.appearance.v1'); return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#121717'; } catch { return '#121717'; } });
  const newNoteIds = useRef(new Set<string>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  // One timeline for the whole open/close: 0 = desk, 1 = editor.
  const progress = useMotionValue(0);
  const deskOpacity = useTransform(progress, [0, 0.7], [1, 0]);
  const deskScale = useTransform(progress, [0, 1], [1, 0.975]);
  const toolsOpacity = useTransform(progress, [0, 0.4], [1, 0]);
  const deskRef = useRef<HTMLDivElement>(null);
  const [boardSnapshot, setBoardSnapshot] = useState<Note[] | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [deleted, setDeleted] = useState<{ note: Note; index: number } | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>(loaded.error ? 'error' : 'saved');
  const [geometry, setGeometry] = useState({ columns: 4, slots: 12 });
  const boardRef = useRef<HTMLDivElement>(null);
  const focusOrigin = useRef<HTMLElement | null>(null);
  const notesRef = useRef(notes);
  const dirty = useRef(false);
  const active = notes.find(note => note.id === activeId);
  const menuNote = notes.find(note => note.id === menu?.id);

  const persist = useCallback(() => {
    if (loaded.error) { setSaveState('error'); return false; }
    try {
      localStorage.setItem(DESK_KEY, JSON.stringify({ version: 2, notes: discardEmptyDrafts(notesRef.current, newNoteIds.current) }));
      dirty.current = false; setSaveState('saved');
      return true;
    } catch { setSaveState('error'); return false; }
  }, [loaded.error]);

  const updateNotes = useCallback((next: Note[]) => {
    notesRef.current = next; dirty.current = true;
    setNotes(next); setSaveState(loaded.error ? 'error' : 'saving');
  }, [loaded.error]);
  useEffect(() => {
    const timer = setTimeout(persist, 180);
    return () => clearTimeout(timer);
  }, [notes, persist]);
  useEffect(() => {
    const flush = () => { if (dirty.current) persist(); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      flush();
      if (dirty.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      flush(); window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [persist]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = deskGeometry(entry.contentRect.width, entry.contentRect.height);
      setGeometry(previous => previous.columns === next.columns && previous.slots === next.slots ? previous : next);
    });
    observer.observe(boardRef.current!); return () => observer.disconnect();
  }, []);

  /** Tile rect as it sits with the desk at rest, undoing the desk's recede scale. */
  const measureTile = useCallback((id: string): Rect | null => {
    const tile = boardRef.current?.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(id)}"]`);
    const desk = deskRef.current;
    if (!tile || !desk) return null;
    tile.scrollIntoView({ block: 'nearest' });
    const rect = tile.getBoundingClientRect();
    const box = desk.getBoundingClientRect();
    const scale = deskScale.get();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    return { left: cx + (rect.left - cx) / scale, right: cx + (rect.right - cx) / scale, top: cy + (rect.top - cy) / scale, bottom: cy + (rect.bottom - cy) / scale };
  }, [deskScale]);
  // Closing starts: show the board as it will be (edited previews, empty drafts
  // gone) so the editor lands on the final tile. Data is committed once settled.
  const startClose = useCallback(() => {
    setIsClosing(true);
    setBoardSnapshot(discardEmptyDrafts(notesRef.current, newNoteIds.current));
  }, []);
  const finishClose = useCallback(() => {
    const next = discardEmptyDrafts(notesRef.current, newNoteIds.current);
    if (next.length !== notesRef.current.length) { notesRef.current = next; setNotes(next); }
    newNoteIds.current.clear();
    setActiveId(null); setIsClosing(false); setBoardSnapshot(null);
    requestAnimationFrame(() => {
      const origin = focusOrigin.current;
      focusQuietly(origin?.isConnected ? origin : boardRef.current?.querySelector<HTMLButtonElement>('button'));
    });
  }, []);
  function closeMenu() {
    setMenu(null);
    requestAnimationFrame(() => focusQuietly(focusOrigin.current));
  }
  const createNote = useCallback((element?: HTMLElement) => {
    focusOrigin.current = element ?? document.activeElement as HTMLElement;
    const note: Note = { id: crypto.randomUUID(), title: 'Untitled', content: '', symbol: '✎', isPinned: false, updatedAt: new Date().toISOString() };
    newNoteIds.current.add(note.id);
    const next = [...notesRef.current, note];
    updateNotes(next); setBoardSnapshot(next); setMenu(null); setActiveId(note.id);
  }, [updateNotes]);
  const openNote = useCallback((id: string, element: HTMLElement) => {
    focusOrigin.current = element; setBoardSnapshot(notesRef.current); setActiveId(id);
  }, []);
  const openMenu = useCallback((id: string, x: number, y: number, element: HTMLElement) => {
    focusOrigin.current = element; setMenu({ id, x, y });
  }, []);
  function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'symbol' | 'isPinned'>>) {
    updateNotes(notesRef.current.map(note => note.id === id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note));
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && !activeId && !isClosing && !menu && !document.querySelector('dialog[open], [data-appearance-open]')) {
        event.preventDefault(); createNote();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [activeId, isClosing, menu, createNote]);

  function exportNotes() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, notes }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'nolithium-notes.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={`desk-shell bg-transparent ${glass.native ? 'native-window' : ''}`} style={{ ...glass.style, '--glass-tint': color } as CSSProperties}>
    <div className="desk-underlay" aria-hidden="true" />
      <header className="desk-header" onMouseDown={dragWindow}>
        <div className="desk-brand"><Feather size={16} strokeWidth={1.5} /><span>nolithium</span><span className="desk-divider" /><span className="desk-view">Desk</span></div>
        <div className="desk-tools"><motion.div className="desk-tools-fade" style={{ opacity: toolsOpacity }} inert={!!activeId}><span className="note-total">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span><Appearance color={color} onChange={setColor} blur={glass.blur} onBlurChange={glass.setBlur} blurError={glass.error} disabled={!!activeId} /></motion.div><WindowControls beforeClose={() => !dirty.current || persist()} /></div>
      </header>
    <motion.div ref={deskRef} className="desk-home" style={{ opacity: deskOpacity, scale: deskScale }} inert={!!activeId || !!menu}>
      {saveState === 'error' && <div className="storage-alert" role="alert">{loaded.error || 'Changes are not saved. Local storage is unavailable.'}<button onClick={exportNotes}>Export notes</button></div>}
      <motion.div layoutScroll className="board-viewport" ref={boardRef}><NotesBoard notes={boardSnapshot ?? notes} columns={geometry.columns} slots={geometry.slots} onOpen={openNote} onMenu={openMenu} onCreate={createNote} /></motion.div>
      <footer className="desk-footer"><span><span className={`status-light ${saveState}`} />{saveState === 'saved' ? 'All changes saved' : saveState === 'saving' ? 'Saving…' : 'Not saved'}</span><span>Right-click to customize<span className="footer-separator">·</span><kbd>Ctrl N</kbd> new note</span></footer>
    </motion.div>
    {active && <ZenEditor key={active.id} note={active} saveState={saveState} isDraft={newNoteIds.current.has(active.id) && !active.content.trim()} progress={progress} measureTile={measureTile} onChange={content => updateNote(active.id, { content })} onClosing={startClose} onClosed={finishClose} />}
    <AnimatePresence>{menu && menuNote && <ContextMenu key={menu.id} note={menuNote} x={menu.x} y={menu.y} onUpdate={patch => updateNote(menu.id, patch)} onClose={closeMenu} onDelete={() => {
      const index = notesRef.current.findIndex(note => note.id === menu.id);
      setDeleted({ note: notesRef.current[index], index });
      updateNotes(notesRef.current.filter(note => note.id !== menu.id)); setMenu(null);
    }} />}</AnimatePresence>
    <AnimatePresence>{deleted && <motion.div className="undo-toast glass-surface" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={quickFade}>
      <span>Note deleted</span><button onClick={() => {
        const next = [...notesRef.current]; next.splice(deleted.index, 0, deleted.note);
        updateNotes(next); setDeleted(null);
      }}><RotateCcw size={13} />Undo</button><button aria-label="Dismiss undo" className="micro-button" onClick={() => setDeleted(null)}><X size={14} /></button>
    </motion.div>}</AnimatePresence>
  </div>;
}
