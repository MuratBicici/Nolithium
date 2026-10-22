import { expect, it } from 'vitest';
import { DEFAULT_SYMBOL, MARKDOWN_FILE_SYMBOL, normalizeSymbol, searchSymbols, SYMBOL_OPTIONS, TEXT_FILE_SYMBOL } from './symbols';
import { decodeDesk } from './desk';

const ids = (query: string) => searchSymbols(query).map(option => option.id);

it('offers a large catalog with unique ids, including the defaults', () => {
  expect(SYMBOL_OPTIONS.length).toBeGreaterThanOrEqual(100);
  expect(new Set(SYMBOL_OPTIONS.map(option => option.id)).size).toBe(SYMBOL_OPTIONS.length);
  for (const id of [DEFAULT_SYMBOL, MARKDOWN_FILE_SYMBOL, TEXT_FILE_SYMBOL]) expect(ids('')).toContain(id);
});

it('maps every symbol from before the icon set to an existing icon', () => {
  for (const legacy of ['✎', '⌘', '</>', '✓', '★', '⚡', '↗', '☷', '◈', '📁']) {
    const id = normalizeSymbol(legacy);
    expect(id).not.toBe(legacy);
    expect(ids('')).toContain(id);
  }
  expect(normalizeSymbol('★')).toBe('star');
  expect(normalizeSymbol('📁')).toBe('folder');
});

it('falls back safely for unknown or malformed symbols', () => {
  expect(normalizeSymbol('🦄')).toBe(DEFAULT_SYMBOL);
  expect(normalizeSymbol(42)).toBe(DEFAULT_SYMBOL);
  expect(normalizeSymbol('music')).toBe('music');
});

it('migrates stored notes on load', () => {
  const note = { id: 'a', title: 'x', content: '', isPinned: false, updatedAt: '2026-10-22T10:00:00Z' };
  const [legacy, current] = decodeDesk(JSON.stringify({ notes: [{ ...note, symbol: '⚡' }, { ...note, id: 'b', symbol: 'guitar' }] }));
  expect(legacy.symbol).toBe('zap');
  expect(current.symbol).toBe('guitar');
});

it('searches in English and Turkish, by word prefix', () => {
  expect(ids('music')).toContain('music');
  expect(ids('müzik')).toContain('music');
  expect(ids('kod')).toContain('code');
  expect(ids('para')).toEqual(expect.arrayContaining(['wallet', 'banknote', 'coins']));
  expect(ids('UÇAK')).toContain('plane'); // Turkish casing: Ç/İ
  expect(ids('doğum günü')).toEqual(expect.arrayContaining(['gift', 'cake']));
  expect(ids('qqqq')).toEqual([]);
});
