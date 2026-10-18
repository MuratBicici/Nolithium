import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { describeFileError, readTextFile, writeTextFile, type LineEnding, type TextEncoding, type TextFile } from './files';
import type { Note } from './types';

export interface FileIssue { kind: 'missing' | 'conflict' | 'error'; message: string }

/** How to write a file back exactly as it came: encoding, line ending, and what is on disk. */
interface FileState { encoding: TextEncoding; lineEnding: LineEnding; modified: number; written: string }

const keyOf = (path: string) => path.toLowerCase();

/**
 * Keeps notes linked to files in sync with them. A linked note's content is
 * written back shortly after each edit; the write is refused (and reported as a
 * conflict) if another program changed the file since Nolithium last read it.
 */
export function useLinkedFiles(notes: Note[], notesRef: MutableRefObject<Note[]>) {
  const states = useRef(new Map<string, FileState>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queue = useRef(new Map<string, Promise<void>>());
  const [issues, setIssues] = useState<Record<string, FileIssue>>({});
  const issuesRef = useRef(issues);
  issuesRef.current = issues;
  // Bumped when a file is reloaded from disk, so an open editor shows the new text.
  const [revisions, setRevisions] = useState<Record<string, number>>({});

  const setIssue = useCallback((key: string, issue: FileIssue | null) => {
    setIssues(current => {
      if (!issue) { if (!(key in current)) return current; const rest = { ...current }; delete rest[key]; return rest; }
      return { ...current, [key]: issue };
    });
  }, []);

  /** Reads the file and remembers how to write it back. Throws for unreadable files. */
  const load = useCallback(async (path: string): Promise<TextFile> => {
    const key = keyOf(path);
    try {
      const file = await readTextFile(path);
      states.current.set(key, { encoding: file.encoding, lineEnding: file.lineEnding, modified: file.modified, written: file.text });
      setIssue(key, null);
      return file;
    } catch (error) {
      setIssue(key, describeFileError(error));
      throw error;
    }
  }, [setIssue]);

  const write = useCallback((path: string, force = false): Promise<void> => {
    const key = keyOf(path);
    const previous = queue.current.get(key) ?? Promise.resolve();
    const run = previous.then(async () => {
      const state = states.current.get(key);
      const note = notesRef.current.find(item => item.file && keyOf(item.file.path) === key);
      if (!state || !note || (!force && note.content === state.written)) return;
      try {
        const saved = await writeTextFile(path, note.content, state.encoding, state.lineEnding, force ? undefined : state.modified);
        Object.assign(state, { modified: saved.modified, encoding: saved.encoding, written: note.content });
        setIssue(key, null);
      } catch (error) { setIssue(key, describeFileError(error)); }
    });
    queue.current.set(key, run);
    return run;
  }, [notesRef, setIssue]);

  // Write back shortly after edits. A file in conflict waits for the user's choice.
  useEffect(() => {
    for (const note of notes) {
      if (!note.file) continue;
      const key = keyOf(note.file.path);
      const state = states.current.get(key);
      if (!state || note.content === state.written || issuesRef.current[key]?.kind === 'conflict') continue;
      clearTimeout(timers.current.get(key));
      const path = note.file.path;
      timers.current.set(key, setTimeout(() => { timers.current.delete(key); void write(path); }, 250));
    }
  }, [notes, write]);

  /** Writes everything pending now and waits for it (window close, update install). */
  const flush = useCallback(async () => {
    for (const [key, timer] of timers.current) {
      clearTimeout(timer); timers.current.delete(key);
      const note = notesRef.current.find(item => item.file && keyOf(item.file.path) === key);
      if (note?.file) void write(note.file.path);
    }
    await Promise.all(queue.current.values());
  }, [notesRef, write]);

  const bumpRevision = useCallback((path: string) => {
    const key = keyOf(path);
    setRevisions(current => ({ ...current, [key]: (current[key] ?? 0) + 1 }));
  }, []);

  return {
    load, flush, bumpRevision,
    issueFor: (path?: string) => (path ? issues[keyOf(path)] : undefined),
    revisionFor: (path?: string) => (path ? revisions[keyOf(path)] ?? 0 : 0),
    /** Conflict: keep this note's text and overwrite the file. */
    keepMine: (path: string) => write(path, true),
  };
}
