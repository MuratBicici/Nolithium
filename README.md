# Nolithium — Glass Desk

A Tauri v2 desktop notes desk with square Liquid Glass tiles and a plaintext Zen editor. The existing React, TypeScript, Vite, Tailwind, Framer Motion and Rust toolchain is retained.

## Run without installing

```powershell
npm run tauri dev
```

This launches the native app and its development server on port 1420. A separate browser preview for development can run with `npm run dev -- --port 1430`. Restart the Tauri process after changing window configuration; frontend edits reload automatically.

## Native transparency

The exact window configuration in `src-tauri/tauri.conf.json` is:

```json
{
  "label": "main",
  "title": "Nolithium",
  "width": 1000,
  "height": 820,
  "minWidth": 540,
  "minHeight": 440,
  "transparent": true,
  "decorations": false,
  "backgroundColor": "#00000000",
  "theme": "Dark",
  "windowEffects": {
    "effects": ["acrylic"],
    "color": "#090B0E30"
  }
}
```

This object belongs in `app.windows`. The DOM root remains transparent; a 35% obsidian layer and glass surfaces tint the native backdrop. Windows acrylic supplies the desktop blur: CSS backdrop filters alone cannot blur pixels outside the WebView. A browser preview shows the layout but cannot verify native transparency. Acrylic appearance and resize performance depend on Windows/compositor support. See [Tauri window configuration](https://v2.tauri.app/reference/config/#windowconfig).

The native Windows title bar is disabled. Nolithium's header supports dragging and double-click maximize/restore, with native minimize, maximize/restore and close buttons. These buttons only appear in Tauri. Closing through the custom button flushes pending notes first; a storage failure keeps the window open. Restart `npm run tauri dev` after changing decorations or window permissions.

## Interactions

- The 1000 × 820 default content window fits a 4 × 3 desk. Resize adds columns and rows; tiles keep a square aspect ratio. Overflow scrolls within the desk.
- Click a ghost slot or press Ctrl+N to create a note. Click a note to morph it into the writing canvas.
- Right-click a tile, press Shift+F10 while it is focused, or use its options button to rename, select a symbol, pin, or delete. Delete offers Undo.
- The editor is WYSIWYG: headings, bold, italic, strikethrough, highlight, inline code, links, bullet/numbered lists, clickable checklists, quotes, code blocks and dividers render as formatting — no Markdown symbols on screen. There is no permanent toolbar:
  - **Select text** for a glass bubble (marks, link, text style H1–H3, lists). Links are edited inline (Ctrl+K) and open with Ctrl+click.
  - **Type `/`** for the block menu; it filters as you type (English and Turkish keywords), ↑ ↓ Enter, Esc to dismiss.
  - Markdown shortcuts still convert as you type (`# `, `- `, `1. `, `[] `, `> `, `**bold**`…), and pasted Markdown arrives formatted.
  - Shortcuts: Ctrl+B / I / E, Ctrl+Shift+S (strike), Ctrl+Shift+H (highlight), Ctrl+Alt+1–3 / 0 (headings / text), Ctrl+Shift+7 / 8 / 9 (numbered / bullet / checklist), Ctrl+Enter ticks a checklist item, Tab / Shift+Tab nest list items.
  - Esc closes the link field, then the menu or selection, then the editor.
- The Markdown button (Ctrl+Shift+M) shows the raw source in a plain textarea for anyone who wants it. Copy All puts formatted HTML plus marker-free text on the clipboard (raw Markdown in Markdown view).
- In Markdown view, Ctrl+B and Ctrl+I wrap selected text with markers and Enter continues checklist lines.
- Changes autosave after 180 ms of inactivity. Every way of closing the window (button, Alt+F4, taskbar) waits for pending notes to be written; if saving fails the window stays open once, then closes on the next attempt. Storage failures are visible and allow a JSON export from the desk.
- Ctrl+Z / Ctrl+Y undo and redo every edit, formatting included.
- The window reopens at its last size, position and maximized state; a position on a disconnected monitor is ignored.

## Source map

- `src/types.ts`: note contract and available symbols.
- `src/motion.ts`: open/close springs (~200 ms, no overshoot), tile reorder spring and fades.
- `src/components/GlassTile.tsx`: square tiles, watermarks and ghost slots; slides on reorder, CSS hover lift.
- `src/components/ContextMenu.tsx`: metadata editing and actions.
- `src/components/ZenEditor.tsx`: focused plaintext writing and shortcuts. Opening grows the glass surface's real edges from the tile rect (no scaling) and reveals full-size content through a matching clip; desk and editor share one progress value.
- `src/App.tsx`: desk geometry, note state, autosave and overlays.
- `src/index.css`: transparent root and current glass system.
- `src/desk.ts`: migration, validation, geometry and text transformations.
- `src/components/RichEditor.tsx`, `SelectionBubble.tsx`, `SlashMenu.tsx`: the Tiptap editor and its two overlays.
- `src/editor/`: the shared extension list, Markdown fidelity helpers (`markdown.ts`, pinned by `markdown.test.ts`), `/` commands and safe link handling.
- `src/storage.ts`: the `DeskStore` seam — file store for the desktop app, localStorage for the browser preview.
- `src-tauri/src/storage.rs`, `window_state.rs`: atomic file writes with backup, and window bounds.

## Storage

The desktop app keeps notes in `desk.json` in the app data folder (`%APPDATA%\com.nolithium.desktop`). Rust writes it atomically — temporary file, flush, rename — so a crash never leaves a half-written file, and the previous version is kept as `desk.json.bak`, which is used automatically if the main file cannot be read. If neither copy is readable, saving is blocked so nothing is overwritten. Window bounds live in `window.json` beside it.

On the first run with file storage, notes are migrated from the WebView's localStorage (`nolithium.desk.v2`, or the older `nolithium.workspace.v1`, copied verbatim with a default symbol); localStorage is left untouched as a safety copy. The browser preview keeps using localStorage. Appearance settings stay in localStorage per device.

Notes are stored as Markdown. The editor parses it on open and serializes only after a real edit, so opening a note never rewrites it; single newlines stay line breaks and blank lines of older plain-text notes are preserved.

All persistence goes through the `DeskStore` interface in `src/storage.ts`. Notes carry stable ids and an `updatedAt` stamped on every change, which a future cloud store can use to merge.

## Validation

```powershell
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml --offline
```

The unit suite covers migration without data loss, malformed storage, square grid geometry, Markdown selection wrapping, and checklist continuation. Native wallpaper refraction must be checked in the Tauri window; a browser screenshot is not evidence of native compositor behavior.
