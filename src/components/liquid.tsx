import { forwardRef, type ComponentProps } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/** Shared desktop motion tokens: crisp feedback without overshoot or drag. */
export const snappyTransition = { type: 'spring' as const, stiffness: 480, damping: 34, mass: 0.8 };
export const instantFade = { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const };
export const microSpring = { type: 'spring' as const, stiffness: 600, damping: 30 };

export function LiquidPanel({ className = '', ...props }: HTMLMotionProps<'div'>) {
  return <motion.div className={`liquid-panel ${className}`} {...props} />;
}

export function LiquidCard({ className = '', ...props }: HTMLMotionProps<'article'>) {
  return <motion.article className={`liquid-card transform-gpu will-change-transform ${className}`} whileHover={{ y: -1, transition: { duration: 0.1 } }} whileTap={{ scale: 0.98, transition: { duration: 0.05 } }} transition={microSpring} {...props} />;
}

export function LiquidButton({ className = '', ...props }: HTMLMotionProps<'button'>) {
  return <motion.button type="button" className={`liquid-button transform-gpu will-change-transform ${className}`} whileHover={{ y: -1, transition: { duration: 0.1 } }} whileTap={{ scale: 0.98, transition: { duration: 0.05 } }} transition={microSpring} {...props} />;
}

export const LiquidInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function LiquidInput({ className = '', ...props }, ref) {
  return <input ref={ref} className={`liquid-input ${className}`} {...props} />;
});

export const LiquidTextarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(function LiquidTextarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`liquid-input liquid-textarea ${className}`} {...props} />;
});
