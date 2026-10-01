import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { hexToHsv, hsvToHex, parseHex, type Hsv } from '../color';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * In-app picker: a saturation/brightness field, a hue strip and a hex field.
 * HSV is kept locally so hue survives at grey or black, where hex loses it.
 */
export function ColorPicker({ id, color, onChange }: { id?: string; color: string; onChange: (hex: string) => void }) {
  const field = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [text, setText] = useState(color.toUpperCase());
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    // Follow outside changes (presets, reset) but keep our own hue when it still matches.
    setHsv(current => hsvToHex(current) === color.toLowerCase() ? current : hexToHsv(color));
    if (!editing) setText(color.toUpperCase());
  }, [color, editing]);

  function commit(next: Hsv) { setHsv(next); onChange(hsvToHex(next)); }
  function pick(event: PointerEvent<HTMLDivElement>) {
    const rect = field.current!.getBoundingClientRect();
    commit({ ...hsv, s: clamp((event.clientX - rect.left) / rect.width), v: 1 - clamp((event.clientY - rect.top) / rect.height) });
  }
  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.01;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    commit({ ...hsv, s: clamp(hsv.s + delta[0]), v: clamp(hsv.v + delta[1]) });
  }
  function typeHex(value: string) {
    setText(value);
    const hex = parseHex(value);
    if (hex && value.replace('#', '').trim().length === 6) commit(hexToHsv(hex));
  }
  function finishHex() {
    const hex = parseHex(text);
    if (hex && hex !== hsvToHex(hsv)) commit(hexToHsv(hex));
    if (hex) setText(hex.toUpperCase());
    setEditing(false);
  }

  const hex = hsvToHex(hsv);
  const hue = `hsl(${hsv.h} 100% 50%)`;
  const invalid = editing && !parseHex(text);
  return <div id={id} className="color-picker" style={{ '--hue-color': hue, '--color': hex } as CSSProperties}>
    <div ref={field} className="sv-field" role="slider" tabIndex={0} aria-label="Saturation and brightness"
      aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
      onPointerDown={event => {
        if (event.button !== 0) return;
        dragging.current = true;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is only an enhancement */ }
        event.currentTarget.focus({ preventScroll: true }); pick(event);
      }}
      onPointerMove={event => { if (dragging.current) pick(event); }}
      onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} onLostPointerCapture={() => { dragging.current = false; }}
      onKeyDown={nudge}>
      <span className="sv-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
    </div>
    <input className="hue-slider" type="range" min="0" max="359" step="1" aria-label="Hue" value={Math.round(hsv.h)}
      onChange={event => commit({ ...hsv, h: Number(event.target.value) })} />
    <label className="hex-row"><span>Hex</span>
      <input value={editing ? text : hex.toUpperCase()} maxLength={7} spellCheck={false} autoComplete="off" aria-invalid={invalid}
        onFocus={event => { setEditing(true); setText(hex.toUpperCase()); event.currentTarget.select(); }}
        onChange={event => typeHex(event.target.value)} onBlur={finishHex}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); finishHex(); event.currentTarget.select(); setEditing(true); } }} />
    </label>
  </div>;
}
