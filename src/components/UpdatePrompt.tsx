import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { snappySpring } from '../motion';
import type { UpdateState } from '../useUpdater';

/** First real line of the release notes: headings such as "## What's Changed" are skipped. */
const firstLine = (notes?: string) => notes?.split('\n').filter(line => !line.trim().startsWith('#'))
  .map(line => line.replace(/^[*\-+\s]+/, '').trim()).find(Boolean);

/** A quiet glass card in the corner; it only appears when there is something to decide or watch. */
export function UpdatePrompt({ state, onInstall, onDismiss }: { state: UpdateState; onInstall: () => void; onDismiss: () => void }) {
  const visible = state.phase === 'available' || state.phase === 'downloading' || state.phase === 'installing' || state.phase === 'error';
  return <AnimatePresence>
    {visible && <motion.div className="update-card glass-surface" role="status" aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } }} transition={snappySpring}>
      {state.phase === 'available' && <>
        <div className="update-head"><Download size={14} /><strong>Nolithium {state.update.version} is available</strong></div>
        {firstLine(state.update.body) && <p className="update-notes">{firstLine(state.update.body)}</p>}
        <div className="update-actions">
          <button className="update-secondary" onClick={onDismiss}>Later</button>
          <button className="update-primary" onClick={onInstall}>Update and restart</button>
        </div>
      </>}
      {state.phase === 'downloading' && <>
        <div className="update-head"><Download size={14} /><strong>Downloading {state.update.version}…</strong>
          {state.total ? <span className="update-percent">{Math.round(state.received / state.total * 100)}%</span> : null}</div>
        <div className="update-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.total ? Math.round(state.received / state.total * 100) : undefined}>
          <span style={{ width: state.total ? `${Math.min(100, state.received / state.total * 100)}%` : '35%' }} className={state.total ? '' : 'is-indeterminate'} />
        </div>
      </>}
      {state.phase === 'installing' && <div className="update-head"><Download size={14} /><strong>Installing — Nolithium will restart</strong></div>}
      {state.phase === 'error' && <>
        <div className="update-head is-error"><strong>Update problem</strong><button className="micro-button" aria-label="Dismiss" onClick={onDismiss}><X size={14} /></button></div>
        <p className="update-notes">{state.message}</p>
      </>}
    </motion.div>}
  </AnimatePresence>;
}
