import { SYMBOLS, type Note } from './types';

export const DESK_KEY = 'nolithium.desk.v2';
export const LEGACY_KEY = 'nolithium.workspace.v1';

export function discardEmptyDrafts(notes: Note[], draftIds: ReadonlySet<string>): Note[] {
  return notes.filter(note => !draftIds.has(note.id) || note.content.trim().length > 0);
}

function readNote(value: unknown): Note {
  if (!value || typeof value !== 'object') throw new Error('Invalid note');
  const note = value as Record<string, unknown>;
  if (typeof note.id !== 'string' || !note.id || typeof note.title !== 'string' || typeof note.content !== 'string'
    || typeof note.isPinned !== 'boolean' || typeof note.updatedAt !== 'string' || !Number.isFinite(Date.parse(note.updatedAt))) throw new Error('Invalid note');
  const file = note.file as { path?: unknown } | undefined;
  return { id: note.id, title: note.title, content: note.content, isPinned: note.isPinned, updatedAt: note.updatedAt,
    symbol: SYMBOLS.includes(note.symbol as Note['symbol']) ? note.symbol as Note['symbol'] : '✎',
    ...(file && typeof file.path === 'string' && file.path ? { file: { path: file.path } } : {}) };
}

export function decodeDesk(raw: string): Note[] {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('notes' in data) || !Array.isArray(data.notes)) throw new Error('Invalid workspace');
  const notes = data.notes.map(readNote);
  if (new Set(notes.map(note => note.id)).size !== notes.length) throw new Error('Duplicate notes');
  return notes;
}

export function loadDesk(storage: Pick<Storage, 'getItem'>): { notes: Note[]; error: string } {
  try {
    const raw = storage.getItem(DESK_KEY) ?? storage.getItem(LEGACY_KEY);
    // Legacy content is copied verbatim; the original workspace and plans remain in v1.
    return { notes: raw === null ? [] : decodeDesk(raw), error: '' };
  } catch { return { notes: [], error: 'Saved notes could not be read. The original data has been left untouched.' }; }
}

export function deskGeometry(width: number, height: number) {
  const gap = 16;
  const columns = Math.max(1, Math.floor((width + gap) / 216));
  const size = (width - gap * (columns - 1)) / columns;
  const rows = Math.max(1, Math.floor((height + gap) / (size + gap)));
  return { columns, slots: Math.max(columns, columns * rows) };
}

/** Pure selection edits keep keyboard behavior testable without a browser. */
export function wrapSelection(text: string, start: number, end: number, marker: string) {
  if (start >= marker.length && text.slice(start - marker.length, start) === marker && text.slice(end, end + marker.length) === marker) {
    return { text: text.slice(0, start - marker.length) + text.slice(start, end) + text.slice(end + marker.length), start: start - marker.length, end: end - marker.length };
  }
  return { text: text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end), start: start + marker.length, end: end + marker.length };
}

export function continueChecklist(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const line = text.slice(lineStart, start);
  const match = /^(\s*)- \[[ xX]\] (.*)$/.exec(line);
  if (!match) return null;
  if (!match[2].trim()) {
    return { text: text.slice(0, lineStart) + text.slice(end), start: lineStart, end: lineStart };
  }
  const prefix = `\n${match[1]}- [ ] `;
  return { text: text.slice(0, start) + prefix + text.slice(end), start: start + prefix.length, end: start + prefix.length };
}

/** The smallest single replacement turning `before` into `after`: replace [start, end) with `insert`. */
export function textChange(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let tail = 0;
  while (tail < before.length - start && tail < after.length - start && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
  return { start, end: before.length - tail, insert: after.slice(start, after.length - tail) };
}

const BLOCK_PREFIX = /^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;

/** One Markdown line as a reader sees it: block prefixes and inline markers removed. */
export function plainLine(line: string): string {
  let text = line;
  while (BLOCK_PREFIX.test(text)) text = text.replace(BLOCK_PREFIX, '');
  if (/^\s*(?:[-*_]\s*){3,}$|^\s*(?:```|~~~)/.test(text)) return '';
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|==)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|\W)_(?!\s)(.+?)_(?!\w)/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** The note as plain text, for word and character counts. */
export function plainText(markdown: string): string {
  return markdown.split('\n').map(plainLine).join('\n').trim();
}

/** First meaningful line, shown on the desk tile. */
export function plainPreview(markdown: string): string {
  for (const line of markdown.split('\n')) {
    const text = plainLine(line);
    if (text) return text;
  }
  return '';
}
