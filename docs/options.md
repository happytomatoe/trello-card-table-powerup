# Rendering options — and how to switch

The Power-Up parses a card description and draws any GFM pipe table it finds. Four
parsers can do that job; **we ship option 1 (hand-rolled)**. This file records what each
route costs, why option 1 won, and the exact edits needed to move to another one later.

All numbers below are measured, not estimated: the four routes were run in a browser over
200 iterations each on the same 3,073-character input (the anger card's table block), and
every route produced the identical 3×4 table. Measurement harness:
`/tmp/poc-table-options/` (serve with `python3 -m http.server 8766`, open
`http://127.0.0.1:8766/index.html`) — scratch artifact, numbers copied here so they survive it.

## The decision

**Option 1 — hand-rolled parser.** `js/parse-table.js` (pure, testable in plain Node) plus
`js/inline.js` (inline markdown → DOM nodes).

Why: it ships **0 third-party bytes**, is **safe by construction** (text nodes, never
`innerHTML`), costs **0.15 ms** per render, and is the only route with no supply chain and
no build step. On this card it produces byte-identical output to the three library routes —
the table is a plain 3×4 pipe table with bold cells, which is inside the documented subset.
The price we accept: the subset is *ours to own*. Alignment columns (`:---:`), nested block
content inside cells, and any future GFM table syntax would have to be added by hand.

## What each route costs (measured)

| | 1. hand-rolled | 2. markdown-it (tokenizer) | 3. marked + DOMPurify | 4. micromark + gfm-table |
|---|---|---|---|---|
| Vendored bytes | 0 | 125,451 | 46,891 + 28,885 = 75,776 | 93,797 (1 bundle) |
| Our own code | 2,449 B / 58 lines | 2,483 B / 55 lines | 274 B / 5 lines | 1,944 B / 38 lines |
| Files to vendor | 0 | 1 (UMD v14) | 2 | 1 bundle, built from 125 modules |
| Build step | none | none (pin v14) | none | **yes** (ESM-only) |
| What the library returns | — | flat token stream | HTML string | mdast tree |
| Sanitizer needed | no | no (`html:false` default) | **yes — on the output** | no |
| Mean render (3 KB) | 0.15 ms | 1.2 ms | 2.8 ms | 5.7 ms |
| GFM table fidelity | pipe tables + bold/italic/code/links | full | full | full, 100% spec |
| Duplicate-render risk | none | none | **yes** — must keep only `<table>` nodes | none |

## Where the code lives (the switch points)

```
js/parse-table.js   option 1's parser   → the only file that must change
js/inline.js        inline renderer     → shared by options 1, 2 and 4
js/section.js       imports the parser  → import line + the table→DOM walker
test/               parser unit tests   → fixture-driven; keep them passing
```

`js/section.js` currently does:

```js
import { parseTables } from './parse-table.js';
...
draw(parseTables(card.desc || ''));
```

Switching means: add the library file(s), change that import (or inline the call), and
replace the `{header, rows}` shape with whatever the new parser returns. `draw()` itself
takes `{header: string[], rows: string[][]}` and does not care where they came from, so the
cheapest switch is a small adapter that returns that same shape.

## Option 2 — markdown-it as a tokenizer

Vendor `markdown-it@14/dist/markdown-it.min.js` (125,451 B; **v15 dropped the UMD bundle**,
so a no-build page must pin v14). Load it as a classic script and adapt:

```js
// adapter: token stream → the {header, rows} shape draw() already understands
function tablesFromMarkdownIt(src) {
  const md = window.markdownit({ html: false });   // html:false is the default
  const tokens = md.parse(src, {});
  const tables = [];
  let cur = null, row = null, cell = null, inHead = false;
  for (const tk of tokens) {
    switch (tk.type) {
      case 'table_open': cur = { header: [], rows: [] }; break;
      case 'thead_open': inHead = true; break;
      case 'tbody_open': inHead = false; break;
      case 'tr_open': row = []; break;
      case 'tr_close': if (inHead) cur.header = row; else cur.rows.push(row); row = null; break;
      case 'th_open': case 'td_open': cell = ''; break;
      case 'inline': if (cell !== null) cell = tk.content; break;
      case 'th_close': case 'td_close': row.push(cell); cell = null; break;
      case 'table_close': tables.push(cur); cur = null; break;
    }
  }
  return tables;
}
```

Gain: full GFM fidelity, still no sanitizer (with `html:false` raw HTML never becomes markup,
and `javascript:`/`vbscript:`/`file:`/`data:` URLs are refused). Cost: the largest single file
of the four and 55 lines of walker you still write.

## Option 3 — marked + DOMPurify

Vendor `marked@18.0.14/lib/marked.umd.js` (46,891 B; `marked.min.js` 404s at v18) and
`dompurify@3.4.16/dist/purify.min.js` (28,885 B). Five lines, and marked does the inline
rendering for you:

```js
function tablesFromMarked(src) {
  const html = DOMPurify.sanitize(marked.parse(src));        // sanitize the OUTPUT, never the input
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('table')].map((t) => document.importNode(t, true));
}
```

Two non-negotiables, both silent when broken:

1. Sanitize marked's **output**. Sanitizing the input markdown instead is bypassable
   (marked PR #2462 — a documented CTF).
2. marked renders the **whole** description, so extract only `<table>` elements — otherwise
   the card shows the note twice, once from Trello and once from us.

Gain: least code (5 lines), best-maintained dependency, full GFM, and no build step.
Cost: 75,776 B of vendored code and one ordering rule that can be got wrong.

## Option 4 — micromark + micromark-extension-gfm-table

ESM-only, so "no build step" stops being true. Bundling `mdast-util-from-markdown@2` +
`micromark@4` + `micromark-extension-gfm-table@2` + `mdast-util-gfm-table@2` produced a single
minified 93,797 B file from 125 modules — the largest artifact of the four. The no-build
shortcut does not rescue it: `esm.sh/micromark@4.0.2` returns a 93–564 byte stub that
re-exports dozens of separately versioned module paths, i.e. a runtime CDN dependency with a
transitive graph you cannot pin.

```js
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';

function tablesFromMicromark(src) {
  const tree = fromMarkdown(src, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()],
  });
  return tree.children.filter((node) => node.type === 'table');
}
```

Then walk `tableRow` / `tableCell` / `strong` / `emphasis` / `inlineCode` / `link` into DOM
(38 lines in the measured build). Gain: the nicest intermediate structure and safe-by-design
(no raw HTML unless `allowDangerousHtml`). Cost: largest file, only route needing a build step,
and its own comparison page recommends **marked** for trusted input.

## After switching — checklist

1. `node --test` — the parser suite must stay green (fixture: `test/fixtures/anger-card-desc.md`,
   asserts exactly one table, 3×4, fenced A and B skipped).
2. `grep -rn "innerHTML" js/` → no hits (options 1, 2 and 4); option 3 instead requires the
   `DOMPurify.sanitize(marked.parse(...))` order above.
3. Re-run the local smoke: serve the repo root and open `section.html` with `TrelloPowerUp`
   stubbed, or load the deployed section page on the anger card.
4. Check the card in Trello: one table, no raw pipes, no duplicated description text, and the
   **Refresh** action picks up description edits.
