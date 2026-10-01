import { invoke, isTauri } from '@tauri-apps/api/core';
import { decodeDesk, DESK_KEY, loadDesk } from './desk';
import type { Note } from './types';

export interface LoadResult {
  notes: Note[];
  /** Non-empty when saved data exists but could not be read; saving is then blocked so nothing is overwritten. */
  error: string;
}

/**
 * The single seam for persistence. The desk only talks to this interface, so a
 * cloud-backed store can later wrap or replace the local one without UI changes.
 */
export interface DeskStore {
  load(): Promise<LoadResult>;
  save(notes: Note[]): Promise<void>;
}

const UNREADABLE = 'Saved notes could not be read. The original data has been left untouched.';

export function serializeDesk(notes: Note[]) {
  return JSON.stringify({ version: 2, notes });
}

/** Picks the first readable copy: the main file, then its backup. */
export function decodeStored(stored: { main: string | null; backup: string | null }): LoadResult | null {
  for (const raw of [stored.main, stored.backup]) {
    if (raw === null) continue;
    try { return { notes: decodeDesk(raw), error: '' }; }
    catch { /* try the next copy */ }
  }
  return stored.main === null && stored.backup === null ? null : { notes: [], error: UNREADABLE };
}

/** Browser preview: the WebView's localStorage. */
export const browserStore: DeskStore = {
  async load() {
    try { return loadDesk(localStorage); }
    catch { return { notes: [], error: 'Local storage is unavailable.' }; }
  },
  async save(notes) { localStorage.setItem(DESK_KEY, serializeDesk(notes)); },
};

/** Desktop app: `desk.json` in the app data folder, written atomically by Rust. */
export const fileStore: DeskStore = {
  async load() {
    const stored = decodeStored(await invoke<{ main: string | null; backup: string | null }>('load_desk'));
    if (stored) return stored;
    // First run with file storage: bring over notes kept in the WebView so far.
    // localStorage is left as it was, as a safety copy.
    const migrated = await browserStore.load();
    if (!migrated.error && migrated.notes.length) await fileStore.save(migrated.notes);
    return migrated;
  },
  async save(notes) { await invoke('save_desk', { contents: serializeDesk(notes) }); },
};

export const deskStore: DeskStore = isTauri() ? fileStore : browserStore;
