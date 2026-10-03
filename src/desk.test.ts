import { describe, expect, it } from 'vitest';
import { continueChecklist, decodeDesk, DESK_KEY, deskGeometry, discardEmptyDrafts, LEGACY_KEY, loadDesk, plainPreview, plainText, textChange, wrapSelection } from './desk';

it('discards empty new drafts but keeps existing notes and single-character drafts', () => {
  const base = { title: 'Untitled', symbol: '✎' as const, isPinned: false, updatedAt: '2026-10-01T10:00:00Z' };
  const notes = [
    { ...base, id: 'old', content: '' },
    { ...base, id: 'empty', content: '' },
    { ...base, id: 'spaces', content: ' \n\t' },
    { ...base, id: 'written', content: 'ş' },
  ];
  expect(discardEmptyDrafts(notes, new Set(['empty', 'spaces', 'written'])).map(note => note.id)).toEqual(['old', 'written']);
  expect(notes).toHaveLength(4);
});

const legacy = { id: 'welcome-0', title: 'My edited title', content: 'User content must survive.', tags: ['work'], isPinned: true, createdAt: '2026-09-22T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z' };

describe('desk migration and validation', () => {
  it('preserves legacy content and pins without changing the original storage', () => {
    const values = new Map([[LEGACY_KEY, JSON.stringify({ notes: [legacy], tasks: [{ text: 'Keep this plan' }] })]]);
    const result = loadDesk({ getItem: key => values.get(key) ?? null });
    expect(result.error).toBe('');
    expect(result.notes[0]).toEqual({ id: legacy.id, title: legacy.title, content: legacy.content, isPinned: true, updatedAt: legacy.updatedAt, symbol: '✎' });
    expect(values.size).toBe(1);
    expect(values.get(LEGACY_KEY)).toContain('Keep this plan');
  });
  it('prefers the current desk, including an intentionally empty desk', () => {
    const values = new Map([[DESK_KEY, '{"notes":[]}'], [LEGACY_KEY, JSON.stringify({ notes: [legacy] })]]);
    expect(loadDesk({ getItem: key => values.get(key) ?? null }).notes).toEqual([]);
  });
  it('rejects corrupted and duplicate records instead of resetting storage', () => {
    expect(() => decodeDesk('{')).toThrow();
    expect(() => decodeDesk(JSON.stringify({ notes: [legacy, legacy] }))).toThrow('Duplicate');
    expect(loadDesk({ getItem: () => '{' }).error).not.toBe('');
  });
});

describe('square board geometry', () => {
  it('fits four by three at the default content dimensions', () => {
    expect(deskGeometry(939, 722)).toEqual({ columns: 4, slots: 12 });
  });
  it('adds columns and rows on larger windows and supports narrow windows', () => {
    expect(deskGeometry(1800, 1050).columns).toBeGreaterThan(4);
    expect(deskGeometry(1800, 1050).slots).toBeGreaterThan(12);
    expect(deskGeometry(320, 600).columns).toBe(1);
  });
});

describe('plaintext editing shortcuts', () => {
  it('wraps and unwraps a selection while keeping it selected', () => {
    const result = wrapSelection('hello world', 6, 11, '**');
    expect(result).toEqual({ text: 'hello **world**', start: 8, end: 13 });
    expect(wrapSelection(result.text, result.start, result.end, '**')).toEqual({ text: 'hello world', start: 6, end: 11 });
    expect(wrapSelection('', 0, 0, '*')).toEqual({ text: '**', start: 1, end: 1 });
  });
  it('continues checklists with matching indentation and resets checked status', () => {
    const value = '  - [x] done';
    expect(continueChecklist(value, value.length, value.length)?.text).toBe('  - [x] done\n  - [ ] ');
    expect(continueChecklist('plain text', 10, 10)).toBeNull();
  });
  it('exits an empty checklist line', () => {
    const value = '- [ ] task\n- [ ] ';
    expect(continueChecklist(value, value.length, value.length)?.text).toBe('- [ ] task\n');
  });
});

it('finds the minimal replacement between two texts', () => {
  const apply = (before: string, after: string) => { const c = textChange(before, after); return before.slice(0, c.start) + c.insert + before.slice(c.end); };
  const cases = [['hello world', 'hello **world**'], ['- [ ] a\n', '- [ ] a\n- [ ] '], ['- [ ] ', ''], ['aaa', 'aaaa'], ['same', 'same'], ['', 'new']];
  for (const [before, after] of cases) expect(apply(before, after)).toBe(after);
  expect(textChange('hello world', 'hello **world**')).toEqual({ start: 6, end: 11, insert: '**world**' });
  expect(textChange('- [ ] a\n- [ ] ', '- [ ] a\n')).toEqual({ start: 8, end: 14, insert: '' });
});

it('previews the first readable line without Markdown markers', () => {
  expect(plainPreview('# Groceries\n- [ ] milk')).toBe('Groceries');
  expect(plainPreview('\n\n---\n- [x] **done** task')).toBe('done task');
  expect(plainPreview('> - [ ] ==quoted== `code` and [link](https://a.b)')).toBe('quoted code and link');
  expect(plainPreview('```\nconst x = 1;\n```')).toBe('const x = 1;');
  expect(plainPreview('snake_case and 2 * 3 * 4 stay')).toBe('snake_case and 2 * 3 * 4 stay');
  expect(plainPreview('&nbsp;\n\n')).toBe('');
});

it('counts words in the readable text only', () => {
  expect(plainText('# Title\n\n- [ ] one *two*\n\n---').split(/\s+/).filter(Boolean)).toEqual(['Title', 'one', 'two']);
});
