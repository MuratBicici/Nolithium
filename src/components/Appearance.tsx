import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Palette, Pipette, RotateCcw } from 'lucide-react';
import { quickFade, snappySpring } from '../motion';
import { ColorPicker } from './ColorPicker';

const DEFAULT_COLOR = '#121717';
const DEFAULT_BLUR = 60;
const PRESETS = [
  ['Obsidian', '#121717'], ['Graphite', '#1c1f26'], ['Ocean', '#12304b'], ['Indigo', '#24264d'], ['Teal', '#10393a'],
  ['Forest', '#183b2b'], ['Plum', '#39233f'], ['Rose', '#44202b'], ['Amber', '#44311d'],
] as const;
const WIDTH = 272;
const MARGIN = 12;

/** Version line and update check; desktop app only. */
export interface About { version: string; label: string; busy: boolean; onCheck: () => void }

interface Props { color: string; onChange: (color: string) => void; blur: number; onBlurChange: (value: number) => void; blurError: string; disabled?: boolean; about?: About }

/** Non-modal popover: the desk stays visible so every change previews live. */
export function Appearance({ color, onChange, blur, onBlurChange, blurError, disabled, about }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // A fresh key per opening, so reopening mid-exit mounts (and focuses) a new popover.
  const [session, setSession] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  function change(value: string) {
    onChange(value);
    try { localStorage.setItem('nolithium.appearance.v1', value); setError(false); }
    catch { setError(true); }
  }
  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus({ preventScroll: true });
  }

  return <>
    <button ref={trigger} className={`micro-button ${open ? 'is-active' : ''}`} title="Appearance" aria-label="Appearance" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { if (!open) setSession(value => value + 1); setOpen(!open); }}><Palette size={17} /></button>
    <AnimatePresence>
      {open && <Popover key={session} trigger={trigger} color={color} blur={blur} onColor={change} onBlur={onBlurChange} onClose={close} about={about}
        error={blurError || (error ? 'Color applied, but could not be saved.' : '')} />}
    </AnimatePresence>
  </>;
}

function Popover({ trigger, color, blur, onColor, onBlur, onClose, error, about }: {
  trigger: RefObject<HTMLButtonElement | null>; color: string; blur: number; error: string; about?: About;
  onColor: (value: string) => void; onBlur: (value: number) => void; onClose: (returnFocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0, maxHeight: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const preset = PRESETS.find(([, value]) => value === color.toLowerCase());
  // A custom colour opens straight into the picker so it can be fine-tuned.
  const [picking, setPicking] = useState(() => !preset);
  const isDefault = color.toLowerCase() === DEFAULT_COLOR && blur === DEFAULT_BLUR;

  useLayoutEffect(() => {
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const right = Math.max(MARGIN, Math.min(window.innerWidth - rect.right, window.innerWidth - WIDTH - MARGIN));
      setPosition({ top: rect.bottom + 8, right, maxHeight: window.innerHeight - rect.bottom - 8 - MARGIN });
    };
    place(); window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [trigger]);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !trigger.current?.contains(target)) onClose(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(true); } };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
    // Mount-only: focus once; listeners live for the popover's lifetime.
  }, []);

  function arrows(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const radios = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const index = radios.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1 : step ? (index + step + radios.length) % radios.length : -1;
    if (next < 0) return;
    // Arrows select presets; landing on Custom only focuses it (Enter opens the picker).
    event.preventDefault(); radios[next].focus();
    if (!radios[next].classList.contains('swatch-custom')) radios[next].click();
  }

  const name = hovered ?? (preset ? preset[0] : `Custom · ${color.toUpperCase()}`);
  return <motion.div ref={ref} className="appearance-popover glass-surface" role="dialog" aria-label="Appearance" data-appearance-open=""
    style={position} initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0, transition: snappySpring }} exit={{ opacity: 0, scale: 0.97, y: -4, transition: quickFade }}
    onMouseDown={event => event.stopPropagation()}
    onBlur={event => { const next = event.relatedTarget as Node | null; if (next && !ref.current?.contains(next) && !trigger.current?.contains(next)) onClose(false); }}>
    <div className="appearance-head">
      <h2>Appearance</h2>
      <button className="micro-button" aria-label="Reset appearance" title="Reset" disabled={isDefault} onClick={() => { onColor(DEFAULT_COLOR); onBlur(DEFAULT_BLUR); }}><RotateCcw size={13} /></button>
    </div>
    <p className="appearance-label" id="glass-color-label">Glass</p>
    <div className="swatch-grid" role="radiogroup" aria-labelledby="glass-color-label" onKeyDown={arrows} onMouseLeave={() => setHovered(null)}>
      {PRESETS.map(([label, value], index) => {
        const checked = preset?.[1] === value;
        return <button key={value} role="radio" aria-checked={checked} aria-label={label} className="swatch" style={{ '--swatch': value } as CSSProperties}
          tabIndex={checked || (!preset && index === 0) ? 0 : -1}
          onClick={() => onColor(value)} onMouseEnter={() => setHovered(label)} onFocus={() => setHovered(null)}>
          {checked && <Check size={14} strokeWidth={2.4} />}
        </button>;
      })}
      <button role="radio" aria-checked={!preset} aria-label="Custom color" aria-expanded={picking} aria-controls="glass-picker"
        className={`swatch-custom ${preset ? '' : 'checked'}`} style={{ '--swatch': color } as CSSProperties} tabIndex={preset ? -1 : 0}
        onClick={() => setPicking(value => !value)} onMouseEnter={() => setHovered('Custom color')} onFocus={() => setHovered(null)}>
        <span className="swatch-face" />
        {preset ? <Pipette size={13} /> : <Check size={14} strokeWidth={2.4} />}
      </button>
    </div>
    <p className="swatch-name" aria-live="polite">{name}</p>
    <AnimatePresence initial={false}>
      {picking && <motion.div key="picker" className="picker-reveal" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={{ height: { type: 'spring', stiffness: 520, damping: 44 }, opacity: { duration: 0.16 } }}>
        <ColorPicker id="glass-picker" color={color} onChange={onColor} />
      </motion.div>}
    </AnimatePresence>
    <div className="appearance-divider" />
    <div className="appearance-label"><label htmlFor="glass-blur">Blur</label><output htmlFor="glass-blur">{blur}%</output></div>
    <input id="glass-blur" className="blur-slider" type="range" min="0" max="100" step="1" value={blur} style={{ '--fill': `${blur}%` } as CSSProperties}
      aria-valuetext={`${blur}%${blur === 0 ? ', clear glass' : ''}`} onChange={event => onBlur(Number(event.target.value))} />
    <div className="blur-endpoints"><span>Clear</span><span>Frosted</span></div>
    {error && <p className="appearance-error" role="alert">{error}</p>}
    {about && <div className="appearance-about"><span>Nolithium {about.version}</span><button className="about-check" onClick={about.onCheck} disabled={about.busy}>{about.label}</button></div>}
  </motion.div>;
}
