export interface Note {
  id: string;
  title: string;
  content: string;
  /** An icon id from `src/symbols.ts` (older notes stored a character; it is mapped on load). */
  symbol: string;
  isPinned: boolean;
  updatedAt: string;
  /** Set when the note was opened from a file ("Open with"); edits are written back to it. */
  file?: { path: string };
}
