import { expect, it } from 'vitest';
import { decodeStored, serializeDesk } from './storage';

const note = { id: 'a', title: 'Ideas', content: 'x', symbol: 'pencil', isPinned: false, updatedAt: '2026-10-01T10:00:00Z' };

it('treats a missing file as a first run', () => {
  expect(decodeStored({ main: null, backup: null })).toBeNull();
});

it('reads the main file, falling back to the backup when it is unreadable', () => {
  expect(decodeStored({ main: serializeDesk([note]), backup: null })).toEqual({ notes: [note], error: '' });
  expect(decodeStored({ main: '{broken', backup: serializeDesk([note]) })).toEqual({ notes: [note], error: '' });
});

it('blocks saving when no copy can be read, so nothing is overwritten', () => {
  const result = decodeStored({ main: '{broken', backup: '{"notes": 4}' });
  expect(result?.notes).toEqual([]);
  expect(result?.error).not.toBe('');
});
