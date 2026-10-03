import { isTauri } from '@tauri-apps/api/core';

const SAFE_PROTOCOL = /^(https?:\/\/|mailto:)/i;

/**
 * Turns what was typed into the link field into a safe href, or null when it
 * is empty or not a web/mail address (e.g. `javascript:`), so it is never stored.
 */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (SAFE_PROTOCOL.test(value)) return value;
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(value)) return `mailto:${value}`;
  if (/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?([/?#]\S*)?$/i.test(value)) return `https://${value}`;
  return null;
}

/** Opens a link in the default browser (desktop) or a new tab (browser preview). */
export async function openLink(href: string) {
  if (!SAFE_PROTOCOL.test(href)) return;
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(href);
  } else window.open(href, '_blank', 'noopener,noreferrer');
}
