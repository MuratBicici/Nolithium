import { describe, expect, it } from 'vitest';
import { dayKey, decodeWorkspace, initialWorkspace, parseTags, selectNotes } from './model';

describe('workspace data', () => {
  it('round trips saved notes without losing content or timestamps', () => {
    const workspace = initialWorkspace();
    expect(decodeWorkspace(JSON.stringify(workspace))).toEqual(workspace);
    expect(decodeWorkspace('{"notes":[],"tasks":[]}').notes).toEqual([]);
  });
  it('rejects malformed records rather than overwriting saved data', () => {
    expect(() => decodeWorkspace('{')).toThrow();
    expect(() => decodeWorkspace('{"notes":[{"title":"lost"}],"tasks":[]}')).toThrow();
    const workspace = initialWorkspace();
    workspace.notes.push(workspace.notes[0]);
    expect(() => decodeWorkspace(JSON.stringify(workspace))).toThrow('Duplicate');
  });
  it('normalizes and deduplicates tags', () => {
    expect(parseTags(' #Ideas, personal, ideas, , #CREATIVE ')).toEqual(['ideas', 'personal', 'creative']);
  });
  it('combines tag, full-text, pinned and sorting filters', () => {
    const { notes } = initialWorkspace();
    expect(selectNotes(notes, 'priorities', 'pinned', 'recent')).toHaveLength(1);
    expect(selectNotes(notes, 'priorities', 'tag:creative', 'recent')).toHaveLength(0);
    expect(selectNotes(notes, '', 'tag:creative', 'title').map(n => n.title)).toEqual(['Design checklist', 'Project ideas']);
    expect(selectNotes(notes, '', 'all', 'recent').slice(0, 2).every(n => n.isPinned)).toBe(true);
  });
  it('uses local calendar dates for daily planning', () => {
    expect(dayKey(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
  });
});
