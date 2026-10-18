import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useIsPresent } from 'framer-motion';
import { Check, Pin, Trash2, X } from 'lucide-react';
import { SYMBOLS, type Note } from '../types';
import { snappySpring, quickFade } from '../motion';

interface Props { note: Note; x: number; y: number; onUpdate: (patch: Partial<Note>) => void; onDelete: () => void; onClose: () => void }

export function ContextMenu({ note, x, y, onUpdate, onDelete, onClose }: Props) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(note.title);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const place = () => { const element = ref.current!; setPosition({ left: Math.max(12, Math.min(x, window.innerWidth - element.offsetWidth - 12)), top: Math.max(12, Math.min(y, window.innerHeight - element.offsetHeight - 12)) }); };
    place(); window.addEventListener('resize', place); return () => window.removeEventListener('resize', place);
  }, [x, y]);
  const rename = () => onUpdate({ title: title.trim() || 'Untitled' });
  return <motion.div className="context-layer" style={{ pointerEvents: isPresent ? 'auto' : 'none' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={quickFade}>
    <button className="context-dismiss" aria-label="Dismiss note options" onClick={onClose} onContextMenu={event => { event.preventDefault(); onClose(); }} />
    <motion.div ref={ref} className="context-menu glass-surface" style={position} role="dialog" aria-modal="true" aria-label="Note options"
      initial={{ scale: 0.96, y: -4 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={snappySpring}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } if (event.key === 'Tab') { const items = ref.current!.querySelectorAll<HTMLElement>('button,input'); const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }}>
      <div className="context-heading"><span>Note options</span><button className="micro-button" aria-label="Close note options" onClick={onClose}><X size={14} /></button></div>
      <label htmlFor="rename-note">Title</label>
      <form className="rename-form" onSubmit={event => { event.preventDefault(); rename(); onClose(); }}><input id="rename-note" autoFocus value={title} onChange={event => setTitle(event.target.value)} onBlur={rename} maxLength={200} /><button className="micro-button" aria-label="Rename note"><Check size={15} /></button></form>
      <p className="context-label">Symbol</p><div className="symbol-palette">{SYMBOLS.map(symbol => <motion.button key={symbol} aria-label={`Use symbol ${symbol}`} aria-pressed={symbol === note.symbol} className={symbol === note.symbol ? 'selected' : ''} whileTap={{ scale: 0.92 }} transition={snappySpring} onClick={() => onUpdate({ symbol })}>{symbol}</motion.button>)}</div>
      <div className="context-divider" /><button className="context-action" onClick={() => { onUpdate({ isPinned: !note.isPinned }); onClose(); }}><Pin size={14} />{note.isPinned ? 'Unpin note' : 'Pin note'}{note.isPinned && <Check size={13} />}</button>
      <button className="context-action destructive" onClick={onDelete}><Trash2 size={14} />{note.file ? 'Remove from desk' : 'Delete note'}</button>
    </motion.div>
  </motion.div>;
}
