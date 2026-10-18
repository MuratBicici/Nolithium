import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type TextEncoding = 'utf8' | 'utf8-bom' | 'utf16-le' | 'utf16-be' | 'ansi';
export type LineEnding = 'lf' | 'crlf';

export interface TextFile {
  path: string;
  name: string;
  /** Always `\n` line endings; `lineEnding` records the file's own. */
  text: string;
  encoding: TextEncoding;
  lineEnding: LineEnding;
  modified: number;
}

/**
 * Markdown files open in the rich editor. Every other text file opens as plain
 * text and is written back exactly: rendering a .json or .ini as Markdown and
 * re-serializing it would escape its characters and corrupt it.
 */
export type FileKind = 'markdown' | 'text';
export const fileKind = (path: string): FileKind => /\.(md|markdown|mdown|mkd|mkdn)$/i.test(path) ? 'markdown' : 'text';
export const fileName = (path: string) => path.split(/[\/]/).pop() || path;
export const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const readTextFile = (path: string) => invoke<TextFile>('read_text_file', { path });
export const writeTextFile = (path: string, text: string, encoding: TextEncoding, lineEnding: LineEnding, expectedModified?: number) =>
  invoke<{ modified: number; encoding: TextEncoding }>('write_text_file', { path, text, encoding, lineEnding, expectedModified: expectedModified ?? null });

/** Files Nolithium was launched with, then any opened while it is running. */
export function watchOpenedFiles(open: (paths: string[]) => void): () => void {
  if (!isTauri()) return () => {};
  let disposed = false;
  let stop: (() => void) | undefined;
  void invoke<string[]>('take_pending_files').then(paths => { if (!disposed && paths.length) open(paths); });
  void listen<string[]>('open-files', event => open(event.payload)).then(unlisten => { if (disposed) unlisten(); else stop = unlisten; });
  return () => { disposed = true; stop?.(); };
}

/** Plain-language reasons for the editor's file status line. */
export function describeFileError(error: unknown): { kind: 'missing' | 'conflict' | 'error'; message: string } {
  const text = String(error);
  if (text === 'changed-on-disk') return { kind: 'conflict', message: 'Changed outside Nolithium' };
  if (text.startsWith('not-found')) return { kind: 'missing', message: 'File not found — edits stay in Nolithium' };
  return { kind: 'error', message: text };
}
