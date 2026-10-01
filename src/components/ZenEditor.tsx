import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { animate, motion, useReducedMotion, useTransform, type AnimationPlaybackControls, type MotionValue } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import type { Note } from '../types';
import { closeSpring, openSpring, reducedFade } from '../motion';
import { continueChecklist, wrapSelection } from '../desk';
import { GlassOptics } from './GlassOptics';

export type Rect = { top: number; right: number; bottom: number; left: number };
type Insets = Rect;

interface Props {
  note: Note;
  saveState: 'saved' | 'saving' | 'error';
  isDraft?: boolean;
  /** 0 = resting as its tile, 1 = fully open. Shared with the desk so both move on one timeline. */
  progress: MotionValue<number>;
  /** Viewport rect of the note's tile, as it sits when the desk is at rest. */
  measureTile: (id: string) => Rect | null;
  onChange: (content: string) => void;
  onClosing: () => void;
  onClosed: () => void;
}

const TILE_RADIUS = 17;
const EDITOR_RADIUS = 19;

/**
 * The editor never scales. Its glass surface animates real edges from the tile's
 * rect to the full frame, and the content, laid out once at full size, is revealed
 * through a matching clip. Borders, radii and text stay crisp at every frame.
 */
export function ZenEditor({ note, saveState, isDraft, progress, measureTile, onChange, onClosing, onClosed }: Props) {
  const reduced = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const from = useRef<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [copyState, setCopyState] = useState('Copy all');

  const top = useTransform(progress, p => from.current.top * (1 - p));
  const right = useTransform(progress, p => from.current.right * (1 - p));
  const bottom = useTransform(progress, p => from.current.bottom * (1 - p));
  const left = useTransform(progress, p => from.current.left * (1 - p));
  const radius = useTransform(progress, p => TILE_RADIUS + (EDITOR_RADIUS - TILE_RADIUS) * p);
  const clipPath = useTransform(progress, p => {
    const { top: t, right: r, bottom: b, left: l } = from.current;
    const k = 1 - p;
    return `inset(${t * k}px ${r * k}px ${b * k}px ${l * k}px round ${TILE_RADIUS + (EDITOR_RADIUS - TILE_RADIUS) * p}px)`;
  });
  const surfaceOpacity = useTransform(progress, [0, 0.12], [0, 1]);
  const contentOpacity = useTransform(progress, [0.45, 1], [0, 1]);
  const contentY = useTransform(progress, [0.35, 1], [12, 0]);

  function measure() {
    const frame = frameRef.current;
    const tile = measureTile(note.id);
    if (!frame || reduced) { from.current = { top: 0, right: 0, bottom: 0, left: 0 }; return; }
    const box = frame.getBoundingClientRect();
    from.current = tile
      ? { top: tile.top - box.top, right: box.right - tile.right, bottom: box.bottom - tile.bottom, left: tile.left - box.left }
      : { top: box.height * 0.08, right: box.width * 0.08, bottom: box.height * 0.08, left: box.width * 0.08 };
  }

  useLayoutEffect(() => {
    measure();
    controls.current = animate(progress, 1, reduced ? reducedFade : openSpring);
    return () => controls.current?.stop();
    // Runs once per opened note; geometry is re-measured on close.
  }, []);
  useEffect(() => { textRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (copyState === 'Copy all') return; const timer = setTimeout(() => setCopyState('Copy all'), 2200); return () => clearTimeout(timer); }, [copyState]);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true; setClosing(true);
    measure();
    onClosing();
    // Hand the desk back the moment the editor lands, not when the spring's
    // sub-pixel tail settles, so the board never feels unresponsive.
    let finished = false;
    const finish = () => { if (finished) return; finished = true; stop(); controls.current?.stop(); progress.set(0); onClosed(); };
    const stop = progress.on('change', value => { if (value <= 0.002) finish(); });
    controls.current = animate(progress, 0, { ...(reduced ? reducedFade : closeSpring), onComplete: finish });
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const field = event.currentTarget;
    const key = event.key.toLowerCase();
    let edit: { text: string; start: number; end: number } | null = null;
    if ((event.ctrlKey || event.metaKey) && (key === 'b' || key === 'i')) edit = wrapSelection(note.content, field.selectionStart, field.selectionEnd, key === 'b' ? '**' : '*');
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) edit = continueChecklist(note.content, field.selectionStart, field.selectionEnd);
    if (edit) { event.preventDefault(); onChange(edit.text); requestAnimationFrame(() => field.setSelectionRange(edit.start, edit.end)); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(note.content); setCopyState('Copied'); }
    catch { setCopyState('Select all to copy'); textRef.current?.focus(); textRef.current?.select(); }
  }
  const words = note.content.trim() ? note.content.trim().split(/\s+/u).length : 0;
  return <div className="zen-layer" style={{ pointerEvents: closing ? 'none' : 'auto' }}>
    <button className="zen-outside" tabIndex={-1} aria-label="Close editor" onClick={close} />
    <div ref={frameRef} className="zen-frame" role="dialog" aria-modal="true" aria-label="Note editor"
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } if (event.key === 'Tab') { const elements = frameRef.current!.querySelectorAll<HTMLElement>('button,textarea'); const first = elements[0]; const last = elements[elements.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }}>
      <motion.div className="zen-surface glass-surface" aria-hidden="true" style={{ top, right, bottom, left, borderRadius: radius, opacity: surfaceOpacity }}>
        <GlassOptics interactive={false} />
      </motion.div>
      <motion.div className="zen-content" style={{ clipPath }}>
        <motion.div className="zen-inner" style={{ opacity: contentOpacity, y: contentY }}>
          <div className="zen-actions"><button className="micro-button" onClick={copy} aria-label={copyState} title={copyState}>{copyState === 'Copied' ? <Check size={16} /> : <Copy size={16} />}</button><button className="micro-button" onClick={close} aria-label="Close editor" title="Close · Esc"><X size={19} /></button></div>
          <textarea ref={textRef} className="zen-text" aria-label="Note content" placeholder="Write…" value={note.content} onChange={event => onChange(event.target.value)} onKeyDown={keyDown} spellCheck />
          <footer className="zen-status"><span className={`save-state ${saveState}`} role="status"><span />{isDraft ? 'Draft' : saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Not saved · storage unavailable'}</span><span>{words} {words === 1 ? 'word' : 'words'}<i />{Array.from(note.content).length} characters</span></footer>
        </motion.div>
      </motion.div>
    </div>
  </div>;
}
