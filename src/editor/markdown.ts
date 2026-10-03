/**
 * Notes written before the rich editor are plain text where every blank line
 * counts. Tiptap's Markdown parser measures blank lines in pairs, so a run of
 * three newlines (two blank lines) would silently lose one.
 *
 * Its serializer only ever emits runs of exactly 2 or 4 newlines (a paragraph
 * break, plus one empty paragraph), writing further empty paragraphs as
 * `&nbsp;`. So runs of 3 or 5+ newlines can only come from older plain text;
 * rewrite just those into the same empty-paragraph form. Editor output passes
 * through unchanged, which keeps repeated open/save cycles stable.
 */
export function preserveBlankLines(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inFence = false;
  let blank = 0;
  lines.forEach((line, index) => {
    if (!inFence && line === '' && index < lines.length - 1) { blank += 1; return; }
    if (blank) {
      const between = line !== '' && out.some(previous => previous !== '');
      out.push(...(between ? blankRun(blank) : Array<string>(blank).fill('')));
      blank = 0;
    }
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    out.push(line);
  });
  return out.join('\n');
}

/** `count` blank lines between two content lines, in the serializer's own form. */
function blankRun(count: number): string[] {
  const newlines = count + 1;
  if (newlines === 2 || newlines === 4) return Array<string>(count).fill('');
  const emptyParagraphs = newlines - 2;
  return ['', '', '', ...Array.from({ length: emptyParagraphs - 1 }, () => ['&nbsp;', '']).flat()];
}
