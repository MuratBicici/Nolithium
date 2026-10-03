import { expect, it } from 'vitest';
import { normalizeUrl } from './links';

it('accepts web and mail addresses, adding a scheme when it is missing', () => {
  expect(normalizeUrl('https://tiptap.dev/docs')).toBe('https://tiptap.dev/docs');
  expect(normalizeUrl(' tiptap.dev/docs?x=1 ')).toBe('https://tiptap.dev/docs?x=1');
  expect(normalizeUrl('localhost:1430')).toBe('https://localhost:1430');
  expect(normalizeUrl('me@example.com')).toBe('mailto:me@example.com');
  expect(normalizeUrl('mailto:me@example.com')).toBe('mailto:me@example.com');
});

it('rejects empty, unsafe and non-address input', () => {
  for (const bad of ['', '   ', 'javascript:alert(1)', 'file:///C:/secret', 'just words', 'data:text/html,hi']) {
    expect(normalizeUrl(bad)).toBeNull();
  }
});
