import type { Note } from './types';

/** Filesystem-safe filename stem derived from the note title. */
function toFileStem(title: string): string {
  const stem = title
    .trim()
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return stem || 'note';
}

/**
 * Converts the subset of HTML the note templates produce into Markdown.
 *
 * Note content is stored as HTML, so exporting it verbatim would leave raw
 * tags in the file. Anything not handled here is stripped rather than escaped.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html; // already plain text

  return (
    html
      .replace(/\r\n/g, '\n')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*h1[^>]*>([\s\S]*?)<\s*\/h1\s*>/gi, (_m, t) => `\n# ${t.trim()}\n`)
      .replace(/<\s*h2[^>]*>([\s\S]*?)<\s*\/h2\s*>/gi, (_m, t) => `\n## ${t.trim()}\n`)
      .replace(/<\s*h3[^>]*>([\s\S]*?)<\s*\/h3\s*>/gi, (_m, t) => `\n### ${t.trim()}\n`)
      .replace(/<\s*(strong|b)[^>]*>([\s\S]*?)<\s*\/\1\s*>/gi, (_m, _tag, t) => `**${t.trim()}**`)
      .replace(/<\s*(em|i)[^>]*>([\s\S]*?)<\s*\/\1\s*>/gi, (_m, _tag, t) => `*${t.trim()}*`)
      .replace(/<\s*li[^>]*>([\s\S]*?)<\s*\/li\s*>/gi, (_m, t) => `- ${t.trim()}\n`)
      .replace(/<\s*\/?(ul|ol)[^>]*>/gi, '\n')
      .replace(/<\s*p[^>]*>([\s\S]*?)<\s*\/p\s*>/gi, (_m, t) => `\n${t.trim()}\n`)
      .replace(/<[^>]+>/g, '')
      // Decode the entities the editor is likely to emit.
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Renders a note as Markdown, with its metadata as front matter. */
export function noteToMarkdown(note: Note): string {
  const meta: string[] = [];
  if (note.subject) meta.push(`**Subject:** ${note.subject}`);
  if (note.tags?.length) meta.push(`**Tags:** ${note.tags.map((t) => `#${t}`).join(' ')}`);
  if (typeof note.qualityScore === 'number') meta.push(`**AI score:** ${note.qualityScore}%`);
  if (note.updatedAt || note.createdAt) {
    meta.push(`**Last updated:** ${new Date(note.updatedAt ?? note.createdAt).toLocaleString()}`);
  }

  return [
    `# ${note.title || 'Untitled note'}`,
    meta.length ? `\n${meta.join('  \n')}` : '',
    '\n---\n',
    htmlToMarkdown(note.content ?? ''),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Triggers a browser download of the note as a Markdown file.
 *
 * Returns the filename so the caller can confirm it to the user.
 */
export function downloadNoteAsMarkdown(note: Note): string {
  const filename = `${toFileStem(note.title)}.md`;
  const blob = new Blob([noteToMarkdown(note)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return filename;
}
