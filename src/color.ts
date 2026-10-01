/** Hue in degrees [0, 360), saturation and value in [0, 1]. */
export interface Hsv { h: number; s: number; v: number }

/** Accepts `#abc`, `abc`, `#aabbcc` or `aabbcc` (any case); returns lowercase `#aabbcc` or null. */
export function parseHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map(digit => digit + digit).join('') : match[1];
  return `#${digits.toLowerCase()}`;
}

export function hexToHsv(hex: string): Hsv {
  const value = parseHex(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    const value = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}
