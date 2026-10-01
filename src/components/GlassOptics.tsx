import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

/** Optical highlights, not a capture or distortion of the desktop wallpaper. */
export function GlassOptics({ interactive = true }: { interactive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 560, damping: 38, mass: 0.5 });
  const y = useSpring(0, { stiffness: 560, damping: 38, mass: 0.5 });
  useEffect(() => {
    const surface = ref.current?.parentElement;
    if (!surface || !interactive || reduced) return;
    let bounds: DOMRect | null = null;
    const enter = () => { bounds = surface.getBoundingClientRect(); };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !bounds) return;
      const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      x.set(horizontal * 32); y.set(vertical * 24);
    };
    const leave = () => { bounds = null; x.set(0); y.set(0); };
    surface.addEventListener('pointerenter', enter);
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave);
    surface.addEventListener('pointercancel', leave);
    return () => {
      surface.removeEventListener('pointerenter', enter);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerleave', leave);
      surface.removeEventListener('pointercancel', leave);
    };
  }, [interactive, reduced, x, y]);
  return <div ref={ref} className="glass-optics" aria-hidden="true">
    <motion.span className="glass-reflection" style={{ x, y }} />
    <span className="glass-bevel"><motion.span className="glass-edge-light" style={{ x, y }} /></span>
    <span className="glass-caustic" />
  </div>;
}
