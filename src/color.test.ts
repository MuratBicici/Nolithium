import { expect, it } from 'vitest';
import { hexToHsv, hsvToHex, parseHex } from './color';

it('parses short and long hex with or without #, rejecting anything else', () => {
  expect(parseHex('#ABC')).toBe('#aabbcc');
  expect(parseHex(' 12304b ')).toBe('#12304b');
  expect(parseHex('#12304B')).toBe('#12304b');
  for (const bad of ['', '#', '#12', '#1234', '12304g', '#12304b0']) expect(parseHex(bad)).toBeNull();
});

it('converts primaries and greys between hex and hsv', () => {
  expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000');
  expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00');
  expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff');
  expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
  expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
  expect(hexToHsv('#ff00ff').h).toBe(300);
});

it('round-trips every preset glass colour exactly', () => {
  for (const hex of ['#121717', '#1c1f26', '#12304b', '#24264d', '#10393a', '#183b2b', '#39233f', '#44202b', '#44311d', '#2a3b4c']) {
    expect(hsvToHex(hexToHsv(hex))).toBe(hex);
  }
});
