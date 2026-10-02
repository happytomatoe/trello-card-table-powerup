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

## Deploy and register (this repo)

Deployed (GitHub Pages, `main` at the repo root):
**https://happytomatoe.github.io/trello-card-table-powerup/**

Registering it with Trello (manual, at <https://trello.com/power-ups/admin>):

1. Select the **Body** workspace → **New** Power-Up.
2. **iframe connector URL**: `https://happytomatoe.github.io/trello-card-table-powerup/index.html`
3. **Capabilities** tab → enable **`card-back-section`** only. The portal set must equal the keys
   passed to `initialize()` in `js/client.js`, or the Power-Up silently does nothing.
4. Name / description / icon: the icon URL is
   `https://happytomatoe.github.io/trello-card-table-powerup/img/icon.svg` (gray line glyph —
   `card-back-section` requires gray, passed as a string URL).
5. Open the **Body** board → **Power-Ups** → **Custom** → enable the new Power-Up, then open the
   anger card.

On-card checks: the section titled **Description tables** appears below the description with the
3×4 table; no raw `|` and no fenced content in it; edit a cell in the description's pipe table,
save, click **Refresh** → the table updates; a card with no table shows the muted empty-state
line; disabling the Power-Up leaves the card as it was.

## How to create a new Power-Up from scratch

The reusable recipe, independent of this repo's URLs.

**Prerequisites**

- An HTTPS origin for three things: the **connector page**, the **section page(s)**, and the
  **icon**. GitHub Pages, Netlify, Cloudflare Pages, any static host. `http://` and `file://`
  are rejected — Trello loads the connector in an iframe on `trello.com`.
- Deploy **before** registering: the connector URL and the icon URL are frozen into the portal,
  so changing them later means editing the Power-Up (and the connector URL is what Trello
  allowlists).
- The connector must be its own page: it is the only page that calls
  `TrelloPowerUp.initialize()`. Every other page (the ones mounted in iframes) calls
  `TrelloPowerUp.iframe()` instead.

**In the portal — <https://trello.com/power-ups/admin>**

1. Select the **workspace** that will own it → **New Power-Up**.
2. Fill the details tab: name, description, and **iframe connector URL** =
   `https://<host>/<path>/index.html`. Absolute HTTPS, no trailing fragment.
3. **Capabilities** tab → enable **exactly** the capabilities whose keys you pass to
   `TrelloPowerUp.initialize()`. The portal set and the code set must match; a mismatch is a
   **silent** no-op (no console error, no section, nothing). `card-back-section` allows **one
   per Power-Up** and its iframe is capped at 1500 px tall.
4. **OAuth 2.0** tab → **only** for Power-Ups that call the Trello REST API on a user's behalf.
   A pure UI Power-Up — everything it needs arrives over the Power-Up bridge
   (`t.card()`, `t.get`/`t.set`, `t.signUrl()`) — leaves the callback URL(s) empty and ticks no
   scopes. The Client ID shown there is auto-provisioned for every Power-Up and stays unused.
5. Icon: an HTTPS **gray glyph SVG**. The *shape* of the icon differs per capability —
   `card-back-section` takes a plain **string URL**, `board-buttons` takes a
   `{ dark, light }` **object**. The wrong shape renders no icon and reports no error.
6. Save, then enable it **per board** (registration is workspace-wide, rendering is opt-in):
   open the board → **Power-Ups** → **Custom** → add it.

**Iterate**

`git push` → the host rebuilds (GitHub Pages ≈ 1 min) → reload the board. Nothing about the
Power-Up is stored in Trello, so a redeploy is the whole update path.

**Debugging silent failures** — in the order they usually bite

- Connector opened directly in a browser renders **blank**: correct, it only runs inside
  Trello's iframe.
- Nothing renders: capability set ≠ `initialize()` keys, or the connector URL 404s/`http://`.
- Section appears but empty: the iframe URL was not wrapped in `t.signUrl()`.
- No icon: wrong icon shape (see 5).
- Dark-mode boards look broken: pin `:root { color-scheme: light; }` in the iframe page's CSS.
- `t.set()` on `card`/`shared` **reloads** card-back iframes — that is the documented way to
  build a Refresh action.

**Rollback**: disable the Power-Up on the board. The card and its description are never
modified; only the Power-Up's own `pluginData` keys linger (4096-character cap per
scope/visibility pair).

**Publishing to the marketplace** additionally requires the host to send custom HTTP headers
(CSP); GitHub Pages cannot, so a marketplace listing needs a host that can — irrelevant for a
private, unlisted Power-Up like this one.

## Constraints worth remembering

- pluginData is capped at 4096 characters per scope/visibility pair — we write a single
  timestamp, nothing else.
- GitHub Pages cannot send custom HTTP headers, so it cannot satisfy the marketplace CSP
  requirement. Irrelevant for a private, unlisted Power-Up.
- Writing pluginData reloads the card-back iframe; that is what makes the Refresh action work.
- `icon` for `card-back-section` must be a gray glyph passed as a string URL.
