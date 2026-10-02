# Description tables — a private Trello Power-Up

Renders GFM markdown tables found in a card's **description** as a real HTML table in the
card's **card-back section**. Nothing is stored: the description stays the single source of
truth, and the section re-reads it on every render and on the **Refresh** action.

Trello's description renderer has no table support, so a pipe table in a description shows up
as literal `|` characters. This Power-Up parses that markdown and draws the table below the
description, where everyone on the board sees it.

## Files

```
index.html          connector: declares the card-back-section capability
js/client.js        capability declaration (title, icon, iframe URL, Refresh action)
section.html        the page Trello mounts in the card back
js/section.js       t.render → t.card('desc') → parse → draw → t.sizeTo
js/parse-table.js   pure GFM pipe-table parser (no DOM, no Trello) — option 1
js/inline.js        cell inline markdown → DOM nodes (**bold**, *italic*, `code`, links)
css/section.css     table styling + color-scheme pin for dark-mode boards
img/icon.svg        gray line glyph (card-back-section requires a gray icon)
manifest.json       capability list, kept in sync with js/client.js
docs/options.md     the four parser routes, measured, and how to switch
test/               parser suite + the real card description as a fixture
```

## Local development

```bash
python3 -m http.server 8080     # then open http://127.0.0.1:8080/section.html
```

`index.html` renders blank when opened directly — that is correct, the connector only runs
inside Trello's iframe.

## Tests

```bash
node --test                     # 8 parser tests, fixture-driven, no dependencies
```

## Deploy and register

1. Push to a **public** repo (GitHub Pages on a free account requires public) and enable Pages
   from `main` at the repo root.
2. Register the connector URL `…/index.html` at <https://trello.com/power-ups/admin>, enable
   the **card-back-section** capability (the portal set must equal `initialize()`'s keys).
3. Enable the Power-Up on the board, open a card whose description contains a pipe table.

## Constraints worth remembering

- pluginData is capped at 4096 characters per scope/visibility pair — we write a single
  timestamp, nothing else.
- GitHub Pages cannot send custom HTTP headers, so it cannot satisfy the marketplace CSP
  requirement. Irrelevant for a private, unlisted Power-Up.
- Writing pluginData reloads the card-back iframe; that is what makes the Refresh action work.
- `icon` for `card-back-section` must be a gray glyph passed as a string URL.
