const FENCE = /^\s*(```|~~~)/;
const DELIMITER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

/**
 * Find GFM pipe tables in markdown.
 *
 * Lines inside fenced code blocks are ignored, so a table that the description
 * only *shows as text* is never rendered twice. A table starts at a line
 * containing "|" whose next line is a delimiter row; it ends at the first line
 * without "|".
 *
 * @param {string} markdown
 * @returns {{header: string[], rows: string[][]}[]}
 */
export function parseTables(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const tables = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const line = lines[i];
    const next = lines[i + 1] || '';
    if (!line.includes('|') || !next.includes('-') || !DELIMITER.test(next)) continue;

    const header = splitRow(line);
    const rows = [];
    for (i += 2; i < lines.length && lines[i].includes('|'); i++) {
      rows.push(splitRow(lines[i]));
    }
    i--;
    tables.push({ header, rows });
  }

  return tables;
}

function splitRow(line) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}
