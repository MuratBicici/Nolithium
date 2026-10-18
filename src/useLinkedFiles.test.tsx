// @vitest-environment happy-dom
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Note } from './types';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args), isTauri: () => true }));
vi.mock('@tauri-apps/api/event', () => ({ listen: async () => () => {} }));
const { useLinkedFiles } = await import('./useLinkedFiles');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const PATH = 'C:\\Notes\\todo.md';
const note = (content: string): Note => ({ id: 'n', title: 'todo.md', content, symbol: '✎', isPinned: false, updatedAt: '2026-10-18T10:00:00Z', file: { path: PATH } });

let api: ReturnType<typeof useLinkedFiles>;
function Harness({ notes }: { notes: Note[] }) {
  const ref = useRef(notes);
  ref.current = notes;
  api = useLinkedFiles(notes, ref);
  return null;
}
let root: ReturnType<typeof createRoot>;
const render = (notes: Note[]) => act(() => root.render(<Harness notes={notes} />));
const writes = () => invoke.mock.calls.filter(([command]) => command === 'write_text_file').map(([, args]) => args);

beforeEach(() => {
  root = createRoot(document.createElement('div')); // fresh hook state per test
  vi.useFakeTimers();
  invoke.mockReset();
  invoke.mockImplementation(async (command: string) => {
    if (command === 'read_text_file') return { path: PATH, name: 'todo.md', text: 'disk', encoding: 'utf8-bom', lineEnding: 'crlf', modified: 100 };
    if (command === 'write_text_file') return { modified: 200, encoding: 'utf8-bom' };
  });
});
afterEach(() => { act(() => root.unmount()); vi.useRealTimers(); });

it('writes edits back with the file\'s own encoding, line ending and last-seen time', async () => {
  await render([note('disk')]);
  await act(() => api.load(PATH));
  await render([note('edited')]);
  expect(writes()).toEqual([]); // debounced
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(writes()).toEqual([{ path: PATH, text: 'edited', encoding: 'utf8-bom', lineEnding: 'crlf', expectedModified: 100 }]);
  await render([note('edited again')]);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(writes()[1].expectedModified).toBe(200); // follows its own previous write
});

it('stops on a conflict until the user chooses, then "keep mine" overwrites', async () => {
  await render([note('disk')]);
  await act(() => api.load(PATH));
  invoke.mockImplementation(async (command: string) => { if (command === 'write_text_file') throw 'changed-on-disk'; });
  await render([note('mine')]);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(api.issueFor(PATH)?.kind).toBe('conflict');
  await render([note('mine, more')]);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(writes()).toHaveLength(1); // no retry loop against a conflicted file
  invoke.mockImplementation(async (command: string) => { if (command === 'write_text_file') return { modified: 300, encoding: 'utf8-bom' }; });
  await act(() => api.keepMine(PATH));
  expect(writes()[1]).toMatchObject({ text: 'mine, more', expectedModified: null });
  expect(api.issueFor(PATH)).toBeUndefined();
});

it('flushes a pending write immediately (window close, update install)', async () => {
  await render([note('disk')]);
  await act(() => api.load(PATH));
  await render([note('typed just now')]);
  await act(() => api.flush());
  expect(writes()).toEqual([expect.objectContaining({ text: 'typed just now' })]);
});

it('never writes a note whose file was not read this session', async () => {
  await render([note('cached copy')]);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  await act(() => api.flush());
  expect(writes()).toEqual([]);
});
