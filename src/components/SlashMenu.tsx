import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { Code2, Heading1, Heading2, Heading3, List, ListChecks, ListOrdered, Minus, Quote, type LucideIcon } from 'lucide-react';
import type { SlashStore } from '../editor/slash';
import { snappySpring } from '../motion';

const ICONS: Record<string, LucideIcon> = {
  h1: Heading1, h2: Heading2, h3: Heading3, bullet: List, ordered: ListOrdered, task: ListChecks, quote: Quote, code: Code2, divider: Minus,
};

/** The `/` block menu: filters as you type, ↑ ↓ to move, Enter to apply, Esc to dismiss. */
export function SlashMenu({ store }: { store: SlashStore }) {
  const session = useSyncExternalStore(store.subscribe, store.get);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const items = session?.items ?? [];
  const query = session?.query;
  useEffect(() => { setActive(0); }, [query]);

  // Keyboard comes from the editor (focus never leaves the text).
  useEffect(() => {
    store.handleKeys(event => {
      if (!session || !items.length) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') { session.select(items[Math.min(active, items.length - 1)]); return true; }
      return false;
    });
    return () => store.handleKeys(null);
  }, [store, session, items, active]);

  useLayoutEffect(() => {
    const element = ref.current;
    const rect = session?.clientRect();
    if (!element || !rect) return;
    void computePosition({ getBoundingClientRect: () => session!.clientRect() ?? rect }, element, {
      placement: 'bottom-start',
      middleware: [
        offset(8), flip({ padding: 12 }),
        // Short windows: shrink to the room available and scroll inside, never off-screen.
        size({ padding: 12, apply: ({ availableHeight, elements }) => { elements.floating.style.maxHeight = `${Math.max(112, Math.min(300, availableHeight))}px`; } }),
        shift({ padding: 12 }),
      ],
    }).then(({ x, y }) => { element.style.left = `${x}px`; element.style.top = `${y}px`; });
  }, [session]);
  useEffect(() => { ref.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!session || !items.length) return null;
  return <motion.div ref={ref} className="slash-menu glass-surface" role="listbox" aria-label="Insert block" aria-activedescendant={`slash-${items[active]?.id}`}
    initial={{ opacity: 0, scale: 0.97, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={snappySpring}
    onMouseDown={event => event.preventDefault()}>
    {items.map((item, index) => {
      const Icon = ICONS[item.id];
      return <div key={item.id} id={`slash-${item.id}`} data-index={index} role="option" aria-selected={index === active}
        className={`slash-item ${index === active ? 'is-active' : ''}`} onMouseEnter={() => setActive(index)} onClick={() => session.select(item)}>
        <span className="slash-icon"><Icon size={15} /></span>
        <span className="slash-title">{item.title}</span>
        <kbd className="slash-hint">{item.hint}</kbd>
      </div>;
    })}
  </motion.div>;
}
