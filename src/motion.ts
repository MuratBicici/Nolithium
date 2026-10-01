import type { Transition } from 'framer-motion';

export const snappySpring = {
  type: 'spring', stiffness: 500, damping: 35, mass: 0.7,
} satisfies Transition;

/**
 * Open/close drive a single 0→1 progress value. Slightly under-damped (ζ≈0.9)
 * springs arrive in ~200 ms with no visible creep or overshoot.
 */
export const openSpring = {
  type: 'spring', stiffness: 560, damping: 43, mass: 1, restDelta: 0.001, restSpeed: 0.01,
} satisfies Transition;
export const closeSpring = {
  type: 'spring', stiffness: 680, damping: 47, mass: 1, restDelta: 0.001, restSpeed: 0.01,
} satisfies Transition;
export const reducedFade = { duration: 0.14, ease: 'easeOut' } satisfies Transition;

/** Tiles slide to new slots when pinned, deleted or restored. */
export const reorderSpring = {
  type: 'spring', stiffness: 520, damping: 44, mass: 0.8,
} satisfies Transition;

export const quickFade = { duration: 0.12 } satisfies Transition;
