import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { Logo } from './components/Logo';
import { Appearance } from './components/Appearance';
import { useGlassBlur } from './useGlassBlur';
import { NotesBoard } from './components/NotesBoard';
import { ContextMenu } from './components/ContextMenu';
import { ZenEditor, type Rect } from './components/ZenEditor';
import { dragWindow, WindowControls } from './components/WindowControls';
import { deskGeometry, discardEmptyDrafts } from './desk';
import { deskStore, type LoadResult } from './storage';
import type { Note } from './types';
import { quickFade } from './motion';
import { describeFileError, fileKind, fileName, samePath, watchOpenedFiles } from './files';
import { useLinkedFiles } from './useLinkedFiles';
import { useUpdater } from './useUpdater';
import { ViewSwitch, type DeskView } from './components/ViewSwitch';
import { UpdatePrompt } from './components/UpdatePrompt';
import { isTauri } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

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
  const [loaded, setLoaded] = useState<LoadResult | null>(null);
  useEffect(() => {
    let live = true;
    deskStore.load().then(
      result => { if (live) setLoaded(result); },
      () => { if (live) setLoaded({ notes: [], error: 'Saved notes could not be read. The original data has been left untouched.' }); });
    return () => { live = false; };
  }, []);
  return loaded ? <Desk loaded={loaded} /> : null;
}

function Desk({ loaded }: { loaded: LoadResult }) {
  const glass = useGlassBlur();
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
  // Saves run one at a time, in order, so an older write never lands after a newer one.
  const saving = useRef<Promise<boolean>>(Promise.resolve(true));
  const active = notes.find(note => note.id === activeId);
  const boardNotes = boardSnapshot ?? notes;
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  // A note to open once the editor that is currently open has finished closing.
  const pendingOpen = useRef<string | null>(null);
  const [closeRequest, setCloseRequest] = useState(0);
  const [notice, setNotice] = useState('');
  // Files opened with Nolithium live in their own section; the switch shows only once there are some.
  const [view, setView] = useState<DeskView>('notes');
  const hasFiles = notes.some(note => note.file);
  const shownView: DeskView = hasFiles ? view : 'notes';
  const sectionNotes = useMemo(() => boardNotes.filter(note => !!note.file === (shownView === 'files')), [boardNotes, shownView]);
  const menuNote = notes.find(note => note.id === menu?.id);

  const persist = useCallback((): Promise<boolean> => {
    if (loaded.error) { setSaveState('error'); return Promise.resolve(false); }
    const snapshot = discardEmptyDrafts(notesRef.current, newNoteIds.current);
    dirty.current = false;
    saving.current = saving.current.then(() => deskStore.save(snapshot)).then(
      () => { if (!dirty.current) setSaveState('saved'); return true; },
      () => { dirty.current = true; setSaveState('error'); return false; });
    return saving.current;
  }, [loaded.error]);
  const updateNotes = useCallback((next: Note[]) => {
    notesRef.current = next; dirty.current = true;
    setNotes(next); setSaveState(loaded.error ? 'error' : 'saving');
  }, [loaded.error]);
  const files = useLinkedFiles(notes, notesRef);
  const { load: loadFile, flush: flushFiles, bumpRevision } = files;
  /** Before the window closes: write linked files and pending changes, and wait for saves in flight. */
  const flushForClose = useCallback(async () => {
    await flushFiles();
    return dirty.current ? persist() : saving.current;
  }, [flushFiles, persist]);
  // Installing an update closes the app, so it saves exactly like closing the window.
  const updater = useUpdater(flushForClose);
  const [version, setVersion] = useState('');
  useEffect(() => { if (isTauri()) void getVersion().then(setVersion, () => {}); }, []);
  const update = updater.state;
  const updateLabel = update.phase === 'checking' ? 'Checking…' : update.phase === 'current' ? 'Up to date'
    : update.phase === 'available' ? `${update.update.version} available` : 'Check for updates';
  useEffect(() => {
    const timer = setTimeout(() => { if (dirty.current) void persist(); }, 180);
    return () => clearTimeout(timer);
  }, [notes, persist]);
  useEffect(() => {
    const flush = () => { if (dirty.current) void persist(); };
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
    const queued = pendingOpen.current;
    if (queued) {
      pendingOpen.current = null;
      requestAnimationFrame(() => {
        setView(notesRef.current.find(note => note.id === queued)?.file ? 'files' : 'notes');
        setBoardSnapshot(notesRef.current); setActiveId(queued);
      });
      return;
    }
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
    updateNotes(next); setBoardSnapshot(next); setMenu(null); setView('notes'); setActiveId(note.id);
  }, [updateNotes]);
  /** Opens a note in the editor, first closing another one that is open. */
  const showNote = useCallback((id: string) => {
    if (activeRef.current === id) return;
    if (activeRef.current) { pendingOpen.current = id; setCloseRequest(count => count + 1); return; }
    // Its tile must be on screen for the open animation, so show the section it belongs to.
    setView(notesRef.current.find(note => note.id === id)?.file ? 'files' : 'notes');
    setMenu(null); setBoardSnapshot(notesRef.current); setActiveId(id);
  }, []);
  const replaceContent = useCallback((id: string, content: string) => {
    updateNotes(notesRef.current.map(note => note.id === id && note.content !== content ? { ...note, content, updatedAt: new Date().toISOString() } : note));
  }, [updateNotes]);
  /** A linked note is refreshed from its file each time it opens; the file is the source of truth. */
  const openNote = useCallback((id: string, element: HTMLElement) => {
    focusOrigin.current = element;
    const note = notesRef.current.find(item => item.id === id);
    if (!note?.file) { showNote(id); return; }
    void loadFile(note.file.path).then(file => replaceContent(id, file.text), () => {}).finally(() => showNote(id));
  }, [loadFile, replaceContent, showNote]);
  /** "Open with" / launch arguments: each file becomes (or reopens) a note linked to it. */
  const openFiles = useCallback(async (paths: string[]) => {
    let target: string | null = null;
    for (const path of paths) {
      try {
        const file = await loadFile(path);
        const existing = notesRef.current.find(note => note.file && samePath(note.file.path, file.path));
        if (existing) {
          replaceContent(existing.id, file.text);
          bumpRevision(file.path);
          target = existing.id;
        } else {
          const note: Note = { id: crypto.randomUUID(), title: file.name, content: file.text, symbol: fileKind(file.path) === 'markdown' ? '✎' : '☷',
            isPinned: false, updatedAt: new Date().toISOString(), file: { path: file.path } };
          updateNotes([...notesRef.current, note]);
          target = note.id;
        }
      } catch (error) { setNotice(`Couldn't open ${fileName(path)}: ${describeFileError(error).message}`); }
    }
    if (target) showNote(target);
  }, [bumpRevision, loadFile, replaceContent, showNote, updateNotes]);
  useEffect(() => watchOpenedFiles(paths => { void openFiles(paths); }), [openFiles]);
  const openMenu = useCallback((id: string, x: number, y: number, element: HTMLElement) => {
    focusOrigin.current = element; setMenu({ id, x, y });
  }, []);
  function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'symbol' | 'isPinned'>>) {
    const current = notesRef.current.find(note => note.id === id);
    if (current && (Object.keys(patch) as (keyof typeof patch)[]).every(key => current[key] === patch[key])) return;
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
        <div className="desk-brand"><Logo height={24} weight={20} className="desk-logo" /><span>nolithium</span><span className="desk-divider" />{hasFiles ? <ViewSwitch view={shownView} onChange={setView} disabled={!!activeId} /> : <span className="desk-view">Desk</span>}</div>
        <div className="desk-tools"><motion.div className="desk-tools-fade" style={{ opacity: toolsOpacity }} inert={!!activeId}><span className="note-total">{(() => { const count = notes.filter(note => !!note.file === (shownView === 'files')).length; return `${count} ${shownView === 'files' ? (count === 1 ? 'file' : 'files') : (count === 1 ? 'note' : 'notes')}`; })()}</span><Appearance color={color} onChange={setColor} blur={glass.blur} onBlurChange={glass.setBlur} blurError={glass.error} disabled={!!activeId}
          about={version ? { version, label: updateLabel, busy: update.phase === 'checking' || update.phase === 'downloading' || update.phase === 'installing', onCheck: () => { void updater.check(true); } } : undefined} /></motion.div><WindowControls beforeClose={flushForClose} /></div>
      </header>
    <motion.div ref={deskRef} className="desk-home" style={{ opacity: deskOpacity, scale: deskScale }} inert={!!activeId || !!menu}>
      {saveState === 'error' && <div className="storage-alert" role="alert">{loaded.error || 'Changes could not be saved.'}<button onClick={exportNotes}>Export notes</button></div>}
      {notice && <div className="storage-alert" role="alert">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
      <motion.div layoutScroll className="board-viewport" ref={boardRef}>
        {/* Switching sections crossfades the whole board instead of flying every tile. */}
        <motion.div key={shownView} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
          <NotesBoard notes={sectionNotes} columns={geometry.columns} slots={geometry.slots} onOpen={openNote} onMenu={openMenu} onCreate={createNote}
            showCreate={shownView === 'notes'} label={shownView === 'files' ? 'Opened files' : 'Notes desk'} />
        </motion.div>
      </motion.div>
      <footer className="desk-footer"><span><span className={`status-light ${saveState}`} />{saveState === 'saved' ? 'All changes saved' : saveState === 'saving' ? 'Saving…' : 'Not saved'}</span><span>Right-click to customize<span className="footer-separator">·</span><kbd>Ctrl N</kbd> new note</span></footer>
    </motion.div>
    {active && <ZenEditor key={active.id} note={active} saveState={saveState} isDraft={newNoteIds.current.has(active.id) && !active.content.trim()} progress={progress} measureTile={measureTile} onChange={content => updateNote(active.id, { content })} onClosing={startClose} onClosed={finishClose}
      closeRequest={closeRequest}
      file={active.file && { kind: fileKind(active.file.path), name: fileName(active.file.path), path: active.file.path, issue: files.issueFor(active.file.path), revision: files.revisionFor(active.file.path) }}
      onReloadFile={() => { const path = active.file?.path; if (path) void loadFile(path).then(file => { replaceContent(active.id, file.text); bumpRevision(path); }, () => {}); }}
      onKeepMine={() => { if (active.file) void files.keepMine(active.file.path); }} />}
    <AnimatePresence>{menu && menuNote && <ContextMenu key={menu.id} note={menuNote} x={menu.x} y={menu.y} onUpdate={patch => updateNote(menu.id, patch)} onClose={closeMenu} onDelete={() => {
      const index = notesRef.current.findIndex(note => note.id === menu.id);
      if (index < 0) { setMenu(null); return; } // already removed (e.g. a menu still fading out)
      setDeleted({ note: notesRef.current[index], index });
      updateNotes(notesRef.current.filter(note => note.id !== menu.id)); setMenu(null);
    }} />}</AnimatePresence>
    <UpdatePrompt state={update} onInstall={() => { void updater.install(); }} onDismiss={updater.dismiss} />
    <AnimatePresence>{deleted && <motion.div className="undo-toast glass-surface" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={quickFade}>
      <span>{deleted.note.file ? 'Removed from desk · the file is untouched' : 'Note deleted'}</span><button onClick={() => {
        const next = [...notesRef.current]; next.splice(deleted.index, 0, deleted.note);
        updateNotes(next); setDeleted(null);
      }}><RotateCcw size={13} />Undo</button><button aria-label="Dismiss undo" className="micro-button" onClick={() => setDeleted(null)}><X size={14} /></button>
    </motion.div>}</AnimatePresence>
  </div>;
}
