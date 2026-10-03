import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Pin, Plus } from 'lucide-react';
import { reorderSpring } from '../motion';
import type { Note } from '../types';
import { plainPreview } from '../desk';
import { GlassOptics } from './GlassOptics';

interface Props {
  ref?: Ref<HTMLElement>;
  note?: Note;
  slot: number;
  onOpen: (element: HTMLButtonElement) => void;
  onMenu?: (x: number, y: number, element: HTMLElement) => void;
}

const enter = { opacity: 0, scale: 0.94 };
const rest = { opacity: 1, scale: 1 };
const leave = { opacity: 0, scale: 0.94, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } } as const;

/** Hover and press use CSS `translate`/`scale`, so they never fight Framer's layout transform. */
export function GlassTile({ ref, note, slot, onOpen, onMenu }: Props) {
  return <motion.article
    ref={ref}
    layout="position"
    data-note-id={note?.id}
    className={`glass-tile glass-surface ${note ? '' : 'ghost-tile'}`}
    initial={enter} animate={rest} exit={leave}
    transition={{ layout: reorderSpring, default: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
    onContextMenu={event => { if (!note) return; event.preventDefault(); onMenu?.(event.clientX, event.clientY, event.currentTarget); }}
  >
    <GlassOptics />
    <button className="tile-open" aria-label={note ? `Open ${note.title || 'Untitled'}` : `Create note in slot ${slot + 1}`}
      onClick={event => onOpen(event.currentTarget)}
      onKeyDown={event => { if (note && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); onMenu?.(rect.right - 20, rect.top + 32, event.currentTarget); } }}>
      <span className="tile-watermark" aria-hidden="true">{note ? note.symbol : <Plus strokeWidth={1} />}</span>
      {note ? <div className="tile-caption"><h2>{note.title || 'Untitled'}</h2><p>{plainPreview(note.content) || 'Empty note'}</p></div>
        : <span className="ghost-label">New note</span>}
    </button>
    {note && <><span className="tile-pin" aria-hidden="true">{note.isPinned && <Pin size={12} />}</span>
      <button className="tile-options micro-button" aria-label={`Options for ${note.title || 'Untitled'}`} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); onMenu?.(rect.right, rect.bottom + 6, event.currentTarget); }}><MoreHorizontal size={18} /></button></>}
  </motion.article>;
}
