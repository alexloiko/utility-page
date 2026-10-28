# Utility page

Single-page collection of developer tools (time/ObjectId conversion, Base64, JSON, JWT, HMAC, diff,
URL encoding, text stats, UUID, calculator). Static site, no build step, no framework, no backend.
Deployed by GitHub Pages from `main`; `CNAME` points it at https://utils.tryelse.ovh.

## Layout

| File | Role |
| --- | --- |
| `index.html` | Shell: Bootstrap 5.3 + Bootstrap Icons from CDN, sidebar nav, `#content` slot, GA tag. Script order matters: `utils.js`, `router.js`, `app.js`. |
| `utils.js` | Pure, DOM-free logic exposed as the `Utils` object (and `module.exports` for Node). All conversions, parsing and formatting live here. |
| `router.js` | Hash router. Route = `{ path, component, default? }` or `{ path, redirect }`. Calls the previous component's cleanup before rendering the next. |
| `app.js` | One `XxxComponent` function per tool, markup helpers, storage helpers, the `routes` table, copy-button handler, "Clear inputs" button. |
| `styles.css` | Small overrides on top of Bootstrap: result grid, copy button, diff colours, mobile nav. |
| `test/utils.test.js` | `node --test` suite for `utils.js`. |

## Conventions

- **A tool is a function** that sets `#content.innerHTML`, wires its inputs, and optionally returns a
  cleanup function (e.g. `TimeComponent` removes its `r` keyboard shortcut). Register it in `routes` in `app.js` and add a
  nav link in `index.html` with `data-tool="<tool>"`, plus a `--tool` accent colour for it in
  `styles.css` (the sidebar tints each tab's icon, hover and active state with that colour). Route
  paths are `/<tool>`; old paths stay as `redirect` entries.
- **Pure logic goes in `utils.js`, with a test.** Components should only do DOM work. Anything that can
  be unit-tested in Node (parsing, encoding, formatting) belongs in `Utils`.
- **Never put raw values into `innerHTML`.** Use `row()`, `grid()`, `pre()` and `message()` from
  `app.js`; they escape via `Utils.escapeHtml`. Decoded user data (Base64, URL, JWT, diff) is hostile.
- **Every result gets a copy button** by using `row()` / `pre()`. The button sits directly after the
  value (inside `.result-cell`), or in the top-right corner of a `pre` block. The delegated click
  handler copies `data-copy-value` if the button has one, otherwise the text of the element right
  before the button's wrapper, so keep that DOM shape. `row(label, value, { note, extra, copy, cls })`:
  `note` is muted context that is not copied (e.g. "3 years ago"), `copy: false` for placeholders like
  "not set".
- **Primary input gets `data-autofocus`**; the router focuses it after each navigation on pointer
  devices only (no keyboard pop-up on phones).
- **Nothing ticks on its own.** The Now card on the Time page is a snapshot with a Refresh button
  (and `r` key); don't reintroduce a timer.
- **Inputs persist in localStorage** under `"<route path>/<field>"` keys via `bindInput()` /
  `bindCheckbox()`. "Clear inputs" removes every key with the current route's prefix and re-renders, so
  always use the route path as the key prefix.
- **Time semantics.** Numeric input is read by digit count: ≤10 digits seconds, ≤13 ms, ≤16 µs, else ns.
  ObjectId output defaults to the zero suffix (`<8 hex seconds>0000000000000000`), which is the correct
  boundary for Mongo `_id` range queries; the random-suffix variant is kept stable across keystrokes and
  only changes on the regenerate button.
- **Base64 is UTF-8 and base64url tolerant** (padding optional). Do not reintroduce bare `atob`/`btoa`
  on user text.
- **Calculator** evaluates with `new Function` on a whitelisted character set; integer-only expressions
  without `/` go through BigInt so `2^64` is exact.
- Style: 4-space indent, single quotes, template literals for markup, no semicolon-free code.

## Run and test

```bash
npm test                                   # node --test (utils only)
python3 -m http.server 8000                # then open http://localhost:8000/#/time
```

There is no bundler or lint step. Browser verification is manual (or a throwaway Playwright script
against the local server). GA page views fire on every route change; the ID is in `index.html`.

## Gotchas

- `app.js` depends on the global `Utils`, `Router` and `Diff` (jsdiff from CDN). Load order in
  `index.html` is the only module system.
- The `.idea/` folder is git-ignored and irrelevant.
- HMAC secrets and JWT tokens are persisted in localStorage like any other input. The sidebar says so;
  don't add a tool that stores something more sensitive without reconsidering that.
