import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import type { Update } from '@tauri-apps/plugin-updater';

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'current' }
  | { phase: 'available'; update: Update }
  | { phase: 'downloading'; update: Update; received: number; total?: number }
  | { phase: 'installing'; update: Update }
  | { phase: 'error'; message: string };

/**
 * Releases are served from the repository's GitHub Releases. While no release
 * is published there (or the repository is private) the feed answers 404,
 * which simply means "nothing to install" — never an error for the user.
 */
async function findUpdate(): Promise<Update | null> {
  const { check } = await import('@tauri-apps/plugin-updater');
  try { return await check(); }
  catch (error) {
    if (/404|not found|valid release json/i.test(String(error))) return null;
    throw error;
  }
}

/**
 * Ask first, then download: a found update is only offered; nothing is
 * downloaded until the user accepts. `beforeInstall` saves notes and linked
 * files, because installing closes the app.
 */
export function useUpdater(beforeInstall: () => Promise<unknown>) {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const busy = useRef(false);

  const check = useCallback(async (manual: boolean) => {
    if (!isTauri() || busy.current) return;
    busy.current = true;
    if (manual) setState({ phase: 'checking' });
    try {
      const update = await findUpdate();
      setState(update ? { phase: 'available', update } : manual ? { phase: 'current' } : { phase: 'idle' });
    } catch (error) {
      // A failed background check stays quiet; a manual one says why.
      setState(manual ? { phase: 'error', message: `Couldn't check for updates: ${String(error)}` } : { phase: 'idle' });
    } finally { busy.current = false; }
  }, []);

  const install = useCallback(async () => {
    if (state.phase !== 'available' || busy.current) return;
    const { update } = state;
    busy.current = true;
    try {
      await beforeInstall();
      let received = 0;
      let total: number | undefined;
      setState({ phase: 'downloading', update, received });
      await update.downloadAndInstall(event => {
        if (event.event === 'Started') total = event.data.contentLength;
        if (event.event === 'Progress') { received += event.data.chunkLength; setState({ phase: 'downloading', update, received, total }); }
        if (event.event === 'Finished') setState({ phase: 'installing', update });
      });
      // Windows closes the app to run the installer; elsewhere restart into the new version.
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (error) {
      setState({ phase: 'error', message: `The update could not be installed: ${String(error)}` });
    } finally { busy.current = false; }
  }, [beforeInstall, state]);

  const dismiss = useCallback(() => setState({ phase: 'idle' }), []);

  // Quietly look once shortly after launch (not in development builds).
  useEffect(() => {
    if (!isTauri() || import.meta.env.DEV) return;
    const timer = setTimeout(() => { void check(false); }, 4000);
    return () => clearTimeout(timer);
  }, [check]);

  return { state, check, install, dismiss };
}
