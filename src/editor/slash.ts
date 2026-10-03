import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion';

export interface SlashItem {
  id: string;
  title: string;
  /** The Markdown shortcut that does the same, shown as a quiet hint. */
  hint: string;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
}

const block = (apply: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) =>
  (editor: Editor, range: Range) => { apply(editor.chain().focus().deleteRange(range)).run(); };

export const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', title: 'Heading 1', hint: '#', keywords: ['title', 'h1', 'başlık'], run: block(chain => chain.setHeading({ level: 1 })) },
  { id: 'h2', title: 'Heading 2', hint: '##', keywords: ['subtitle', 'h2', 'başlık'], run: block(chain => chain.setHeading({ level: 2 })) },
  { id: 'h3', title: 'Heading 3', hint: '###', keywords: ['h3', 'başlık'], run: block(chain => chain.setHeading({ level: 3 })) },
  { id: 'bullet', title: 'Bullet list', hint: '-', keywords: ['list', 'ul', 'liste', 'madde'], run: block(chain => chain.toggleBulletList()) },
  { id: 'ordered', title: 'Numbered list', hint: '1.', keywords: ['ordered', 'ol', 'numara'], run: block(chain => chain.toggleOrderedList()) },
  { id: 'task', title: 'Checklist', hint: '[ ]', keywords: ['todo', 'task', 'check', 'yapılacak'], run: block(chain => chain.toggleTaskList()) },
  { id: 'quote', title: 'Quote', hint: '>', keywords: ['blockquote', 'alıntı'], run: block(chain => chain.toggleBlockquote()) },
  { id: 'code', title: 'Code block', hint: '```', keywords: ['pre', 'snippet', 'kod'], run: block(chain => chain.toggleCodeBlock()) },
  { id: 'divider', title: 'Divider', hint: '---', keywords: ['hr', 'line', 'separator', 'çizgi'], run: block(chain => chain.setHorizontalRule()) },
];

export function filterSlashItems(query: string): SlashItem[] {
  const needle = query.trim().toLocaleLowerCase('tr');
  if (!needle) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(item => item.title.toLocaleLowerCase('tr').includes(needle) || item.keywords.some(keyword => keyword.startsWith(needle)));
}

/** What the open menu needs; null while no `/` command is being typed. */
export interface SlashSession {
  items: SlashItem[];
  query: string;
  clientRect: () => DOMRect | null;
  select: (item: SlashItem) => void;
}

/** A tiny store bridging the ProseMirror plugin and the React menu. */
export function createSlashStore() {
  let session: SlashSession | null = null;
  let keyHandler: ((event: KeyboardEvent) => boolean) | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => session,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set(next: SlashSession | null) { session = next; listeners.forEach(listener => listener()); },
    /** The menu registers how it handles ↑ ↓ Enter while open. */
    handleKeys(handler: ((event: KeyboardEvent) => boolean) | null) { keyHandler = handler; },
    keyDown: (event: KeyboardEvent) => keyHandler?.(event) ?? false,
  };
}
export type SlashStore = ReturnType<typeof createSlashStore>;

const slashKey = new PluginKey('slashCommands');

export function slashCommands(store: SlashStore) {
  return Extension.create({
    name: 'slashCommands',
    addProseMirrorPlugins() {
      const toSession = (props: SuggestionProps<SlashItem>): SlashSession => ({
        items: props.items, query: props.query, clientRect: () => props.clientRect?.() ?? null, select: item => props.command(item),
      });
      return [Suggestion<SlashItem>({
        editor: this.editor,
        pluginKey: slashKey,
        char: '/',
        items: ({ query }) => filterSlashItems(query),
        // Not inside code, where a slash is just a slash.
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: props => store.set(toSession(props)),
          onUpdate: props => store.set(toSession(props)),
          onKeyDown: ({ view, event }) => {
            // Stop here so the editor's window-level Esc (close) never sees it.
            if (event.key === 'Escape') { event.stopPropagation(); exitSuggestion(view, slashKey); store.set(null); return true; }
            return store.keyDown(event);
          },
          onExit: () => store.set(null),
        }),
      })];
    },
  });
}
