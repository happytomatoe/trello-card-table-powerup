import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTables } from '../js/parse-table.js';

const fixture = readFileSync(new URL('./fixtures/anger-card-desc.md', import.meta.url), 'utf8');

test('real card description: only the unfenced table is parsed', () => {
  const tables = parseTables(fixture);

  assert.equal(tables.length, 1, 'fenced representations A and B must be skipped');
  assert.deepEqual(tables[0].header, ['Feature', 'Clean Anger', 'Manipulative / Toxic Anger']);
  assert.equal(tables[0].rows.length, 4);
  for (const row of tables[0].rows) assert.equal(row.length, 3);
  assert.match(tables[0].rows[3][2], /fuels a cycle of shame/);
});

test('fenced code blocks are never parsed, even when they contain a table', () => {
  const md = [
    '```',
    'a | b',
    '--- | ---',
    '1 | 2',
    '```',
    '',
    'x | y',
    '--- | ---',
    '3 | 4',
  ].join('\n');

  assert.deepEqual(parseTables(md), [{ header: ['x', 'y'], rows: [['3', '4']] }]);
});

test('escaped pipe stays inside one cell', () => {
  const tables = parseTables('a \\| b | c\n--- | ---\n1 | 2');
  assert.deepEqual(tables[0].header, ['a | b', 'c']);
});

test('outer pipes are optional', () => {
  const tables = parseTables('a | b\n--- | ---\n1 | 2');
  assert.deepEqual(tables, [{ header: ['a', 'b'], rows: [['1', '2']] }]);
});

test('a blank line ends the table', () => {
  const tables = parseTables('a | b\n--- | ---\n1 | 2\n\nafter | text');
  assert.deepEqual(tables[0].rows, [['1', '2']]);
});

test('CRLF input parses the same as LF', () => {
  const tables = parseTables('a | b\r\n--- | ---\r\n1 | 2\r\n');
  assert.deepEqual(tables, [{ header: ['a', 'b'], rows: [['1', '2']] }]);
});

test('prose containing pipes is not a table', () => {
  assert.deepEqual(parseTables('use a | b or c | d in your text\n'), []);
  assert.deepEqual(parseTables('a | b\nnot a delimiter row\n'), []);
});

test('no table at all yields an empty array', () => {
  assert.deepEqual(parseTables('# Title\n\n- bullet\n- bullet\n'), []);
  assert.deepEqual(parseTables(''), []);
});
