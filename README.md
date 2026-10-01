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
- The editor has only Copy All, Close, a textarea, and save/word/character status. Escape or the outside margin closes it.
- Ctrl+B and Ctrl+I wrap selected text with Markdown markers. Enter continues indented checklist lines such as `- [ ] item`; Enter on an empty checklist ends the list.
- Changes autosave after 180 ms of inactivity and flush when closing the editor or leaving the page. Storage failures are visible and allow a JSON export from the desk.

## Source map

- `src/types.ts`: note contract and available symbols.
- `src/motion.ts`: open/close springs (~200 ms, no overshoot), tile reorder spring and fades.
- `src/components/GlassTile.tsx`: square tiles, watermarks and ghost slots; slides on reorder, CSS hover lift.
- `src/components/ContextMenu.tsx`: metadata editing and actions.
- `src/components/ZenEditor.tsx`: focused plaintext writing and shortcuts. Opening grows the glass surface's real edges from the tile rect (no scaling) and reveals full-size content through a matching clip; desk and editor share one progress value.
- `src/App.tsx`: desk geometry, note state, autosave and overlays.
- `src/index.css`: transparent root and current glass system.
- `src/desk.ts`: migration, validation, geometry and text transformations.

Notes use `nolithium.desk.v2` in localStorage. On first load, the previous `nolithium.workspace.v1` notes are copied verbatim with a default symbol. The original workspace—including tags, timestamps and plans—remains untouched in its original key. This UI has no planner. No demo notes are inserted into a fresh desk. Browser and native WebView storage remain separate.

The previous `model.ts`, its tests, `styles.css` and `components/liquid.tsx` remain as unused legacy code; the new app does not import their UI or migration behavior.

## Validation

```powershell
npm run build
npm test
cargo check --manifest-path src-tauri/Cargo.toml --offline
```

The unit suite covers migration without data loss, malformed storage, square grid geometry, Markdown selection wrapping, and checklist continuation. Native wallpaper refraction must be checked in the Tauri window; a browser screenshot is not evidence of native compositor behavior.
