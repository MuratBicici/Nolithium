export const SYMBOLS = ['✎', '⌘', '</>', '✓', '★', '⚡', '↗', '☷', '◈', '📁'] as const;
export type NoteSymbol = typeof SYMBOLS[number];

export interface Note {
  id: string;
  title: string;
  content: string;
  symbol: NoteSymbol;
  isPinned: boolean;
  updatedAt: string;
}
