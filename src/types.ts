export const SYMBOLS = ['✎', '⌘', '</>', '✓', '★', '⚡', '↗', '☷', '◈', '📁'] as const;
export type NoteSymbol = typeof SYMBOLS[number];

export interface Note {
  id: string;
  title: string;
  content: string;
  symbol: NoteSymbol;
  isPinned: boolean;
  updatedAt: string;
  /** Set when the note was opened from a file ("Open with"); edits are written back to it. */
  file?: { path: string };
}
