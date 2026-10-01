import { memo, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GlassTile } from './GlassTile';
import type { Note } from '../types';

export const NotesBoard = memo(function NotesBoard({ notes, columns, slots, onOpen, onMenu, onCreate }: {
  notes: Note[]; columns: number; slots: number;
  onOpen: (id: string, element: HTMLElement) => void;
  onMenu: (id: string, x: number, y: number, element: HTMLElement) => void;
  onCreate: (element: HTMLElement) => void;
}) {
  const ordered = useMemo(() => [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)), [notes]);
  const slotCount = Math.max(slots, Math.ceil((notes.length + 1) / columns) * columns);
  return <main className="tile-board" aria-label="Notes desk" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    <AnimatePresence initial={false} mode="popLayout">
      {ordered.map((note, index) => <GlassTile key={note.id} note={note} slot={index} onOpen={element => onOpen(note.id, element)} onMenu={(x, y, element) => onMenu(note.id, x, y, element)} />)}
      <GlassTile key="create-note" slot={notes.length} onOpen={onCreate} />
    </AnimatePresence>
    {Array.from({ length: Math.max(0, slotCount - notes.length - 1) }, (_, index) => <div key={`ghost-${index}`} className="glass-tile ghost-tile empty-slot" aria-hidden="true" />)}
  </main>;
});
