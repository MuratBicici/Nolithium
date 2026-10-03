import { Extension, type Editor } from '@tiptap/core';

/**
 * True when every non-blank character in the selection carries the mark.
 * Selections often include an edge space (Windows double-click selects the
 * trailing one); counting it would show bold text as "not bold".
 */
export function markCoversSelection(editor: Editor, name: string): boolean {
  const { from, to, empty } = editor.state.selection;
  const type = editor.schema.marks[name];
  if (empty || !type) return editor.isActive(name);
  let sawText = false;
  let covered = true;
  editor.state.doc.nodesBetween(from, to, (node, position) => {
    if (!covered) return false;
    if (!node.isText || !node.text) return;
    const text = node.text.slice(Math.max(from, position) - position, Math.min(to, position + node.nodeSize) - position);
    if (!text.trim()) return;
    sawText = true;
    if (!type.isInSet(node.marks)) covered = false;
  });
  return sawText ? covered : editor.isActive(name);
}

/** Toggles a mark the way the bubble shows it: fully covered → remove, otherwise → apply to all. */
export function toggleMark(editor: Editor, name: string) {
  const chain = editor.chain().focus();
  return (markCoversSelection(editor, name) ? chain.unsetMark(name) : chain.setMark(name)).run();
}

/** Keyboard shortcuts that agree with the bubble's state (overrides the stock ones). */
export const MarkShortcuts = Extension.create({
  name: 'markShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    const toggle = (name: string) => () => !this.editor.state.selection.empty && toggleMark(this.editor, name);
    return {
      'Mod-b': toggle('bold'), 'Mod-i': toggle('italic'), 'Mod-Shift-s': toggle('strike'),
      'Mod-e': toggle('code'), 'Mod-Shift-h': toggle('highlight'),
    };
  },
});
