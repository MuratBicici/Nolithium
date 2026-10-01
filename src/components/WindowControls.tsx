import { useEffect, useState, type MouseEvent } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Copy, Minus, Square, X } from 'lucide-react';

export function dragWindow(event: MouseEvent<HTMLElement>) {
  if (!isTauri() || event.button !== 0 || (event.target as HTMLElement).closest('button, input, textarea, a')) return;
  const window = getCurrentWindow();
  const action = event.detail === 2 ? window.toggleMaximize() : window.startDragging();
  void action.catch(error => console.error('Window interaction failed:', error));
}

export function WindowControls({ beforeClose }: { beforeClose: () => boolean }) {
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState('');
  const native = isTauri();

  useEffect(() => {
    if (!native) return;
    const window = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const sync = async () => {
      try { const value = await window.isMaximized(); if (!disposed) setMaximized(value); }
      catch { if (!disposed) setError('Window state unavailable'); }
    };
    void sync();
    void window.onResized(() => { void sync(); }).then(stop => { if (disposed) stop(); else unlisten = stop; }).catch(() => { if (!disposed) setError('Window state unavailable'); });
    return () => { disposed = true; unlisten?.(); };
  }, [native]);

  if (!native) return null;
  async function run(action: 'minimize' | 'maximize' | 'close') {
    try {
      setError('');
      const window = getCurrentWindow();
      if (action === 'minimize') await window.minimize();
      if (action === 'maximize') { await window.toggleMaximize(); setMaximized(await window.isMaximized()); }
      if (action === 'close') {
        if (!beforeClose()) { setError('Notes could not be saved. Close the editor and export them first.'); return; }
        await window.close();
      }
    } catch { setError('Window action failed. Please try again.'); }
  }

  return <div className="window-controls">
    {error && <span className="window-error" role="alert">{error}</span>}
    <button className="window-button" aria-label="Minimize window" title="Minimize" onClick={() => void run('minimize')}><Minus size={15} /></button>
    <button className="window-button" aria-label={maximized ? 'Restore window' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => void run('maximize')}>{maximized ? <Copy size={12} /> : <Square size={12} />}</button>
    <button className="window-button window-close" aria-label="Close window" title="Close" onClick={() => void run('close')}><X size={17} /></button>
  </div>;
}
