import { useEffect, useState, type CSSProperties } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { Effect, getCurrentWindow } from '@tauri-apps/api/window';

const KEY = 'nolithium.blur.v1';
let effectQueue = Promise.resolve();

export function useGlassBlur() {
  const [blur, setBlur] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      const value = stored === null ? 60 : Number(stored);
      return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 60;
    } catch { return 60; }
  });
  const [storageError, setStorageError] = useState(false);
  const [nativeError, setNativeError] = useState(false);
  const frosted = blur > 0;
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    // Serialize native changes so rapid clear/frosted toggles finish in order.
    effectQueue = effectQueue.then(async () => {
      if (disposed) return;
      try {
        await getCurrentWindow().setEffects({ effects: frosted ? [Effect.Acrylic] : [], color: '#090B0E30' });
        if (!disposed) setNativeError(false);
      } catch { if (!disposed) setNativeError(true); }
    });
    return () => { disposed = true; };
  }, [frosted]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(KEY, String(blur)); setStorageError(false); }
      catch { setStorageError(true); }
    }, 150);
    return () => clearTimeout(timer);
  }, [blur]);
  const style = {
    '--glass-blur': `${blur * 1.6}px`,
    '--surface-blur': `${blur * 0.94}px`,
    '--canvas-tint': `${8 + blur * 0.66}%`,
    '--surface-tint': `${12 + blur * 0.76}%`,
    '--editor-tint': `${18 + blur * 0.78}%`,
  } as CSSProperties;
  return { blur, setBlur, style, native: isTauri(), error: nativeError ? 'Window effect could not be applied. Restart the desktop app and try again.' : storageError ? 'Blur applied, but could not be saved.' : '' };
}
