import type { KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { snappySpring } from '../motion';

export type DeskView = 'notes' | 'files';
const VIEWS: [DeskView, string][] = [['notes', 'Notes'], ['files', 'Files']];

/** Notes / Files in the header; a glass pill slides to the chosen side. */
export function ViewSwitch({ view, onChange, disabled }: { view: DeskView; onChange: (view: DeskView) => void; disabled?: boolean }) {
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = view === 'notes' ? 'files' : 'notes';
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus();
  }
  return <div className="view-switch" role="tablist" aria-label="Desk section" onKeyDown={keyDown} inert={disabled}>
    {VIEWS.map(([id, label]) => <button key={id} type="button" role="tab" data-view={id} aria-selected={view === id} tabIndex={view === id ? 0 : -1}
      className={view === id ? 'is-on' : ''} onClick={() => onChange(id)}>
      {view === id && <motion.span layoutId="view-switch-pill" className="view-switch-pill" transition={snappySpring} />}
      <span className="view-switch-label">{label}</span>
    </button>)}
  </div>;
}
