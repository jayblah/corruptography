# Corruptography

Sourced maps of the money, power and relationships around powerful people ruining American democracy. The aim is to tie people to corruption in politics and government, so money and the influence it buys come first: campaign giving, federal contracts, appointments and lobbying.

Live site: https://jayblah.github.io/corruptography/

## Status

This is a work in progress. It began as a map of Peter Thiel's network as described in *The Nerd Reich* by Gil Duran, and the current map is still that network. It is no longer limited to the book: cards, figures and connections are added from public records (FEC filings, USAspending) and press reporting, and other maps may follow.

Expect change. Cards are added, merged and removed, badges and groups are renamed, and figures are corrected as better sources turn up. Each card lists its sources, and every dollar figure should cite one. The version badge in the footer opens a dated log of the content that changed. Report an error from the link on any card.

## Using it

- Hover a card to trace its connections; click it to pin it and read the details. Choosing a filter or clicking a government count in the Thiel card spotlights the matching cards.
- The filter bar starts with **Money**, then the **Power** and **Politics** dropdowns. Power holds Government, Contracts, Influence and Global; Politics holds Republican and Democrat. Tick any number of options in a dropdown: a card matches if it fits any of them, and it must fit every filter that is on. **Anti-Democracy**, **Christian Nationalism** and **Crypto** are single filters. **Clear** resets all filters and the search.
- The first card showing in each group carries the group's name as a tab, filtered or not. Party badges sit in the badge row of each card.
- With a card pinned, **How is it connected to…** finds the chain between two cards, with or without going through Thiel.
- The address bar mirrors the view, so any view can be shared, for example `#card=Yarvin&to=Vance`, `#filter=crypto,gop` or `#q=greenland`.
- Shortcuts: `/` search, `?` help and legend, `Esc` close a dropdown or a card. The light and dark switch is in the footer.

## Files

- `index.html`: the interactive page. Open it in a browser; no build or internet needed. It loads the three files below from the same folder, so keep them together.
- `data.js`: all map content (people, connections, sources, Wikipedia names, summary facts). Edit content here.
- `app.js`: behaviour. Each kind of badge, detail block and filter chip is one entry in `FACETS`; kinds of government reach are in `GOV`.
- `styles.css`: look and feel. Light/dark colours are defined once each with `light-dark()`; category text colours are checked for WCAG 2.1 AA contrast.
- `bump-version.js`: `node bump-version.js 1.17` updates the version shown in the header and in the `?v=` cache-busting suffix on the three files above (do this on every release so browsers never mix new and cached old files).
- `data-loader.js`: how the Node tools (`check.js`, `check-links.js`, `build-static.js`) read `data.js`.
- `img/`: portraits of the people on the map (Wikimedia Commons, freely licensed; credits live in `data.js` under `portraits`). People without a free photo show initials.
- `build-static.js`: `node build-static.js` writes a plain-text copy of the whole map into `index.html` (inside `<noscript>`) for search engines, social-media crawlers and visitors with JavaScript off. Rerun it after changing `data.js`; `node check.js` fails if the copy is stale.
- `social.png`: the preview image shown when the site is shared.
- `robots.txt`: allows search engines to index the page.

## Checks

- `node check.js` validates `data.js` (every connection points at a real card, no duplicates, nothing orphaned, fields have the right shape).
- `tests/smoke.html` loads the real page in a frame and exercises filters, search, pinning, paths and the address bar. Open it in a browser; the title becomes PASS or FAIL.
- `node check-links.js` confirms every Wikipedia link still resolves.
- `npm install && node tests/a11y.js` loads the real page in light and dark mode (home, a card pinned, a filter on, the help open) and fails on any script error, Content-Security-Policy violation or axe accessibility violation. `package.json` lists development tooling only; the site itself has no dependencies.
- `node tests/lighthouse.js` audits the site with Lighthouse on a throttled mobile profile and fails if Performance falls below 90, Accessibility below 100, Best Practices below 95 or SEO below 90, or if the page grows past 110 KB over the wire. (SEO tops out near 91 because the page's strict policy blocks Lighthouse's own robots.txt fetch; the file exists and is fine.)
- `.github/workflows/checks.yml` runs all of the above on GitHub (pull requests, and weekly with the link check).
- `.github/workflows/pages.yml` publishes the site, but only after every check passes. In the repository settings, Pages must use the source **GitHub Actions**.
- `.github/dependabot.yml` proposes weekly, grouped updates to the pinned GitHub Actions and the development tooling (only releases at least 14 days old). The actions in the workflows are pinned to exact commits.

## Weekly research digest

`.github/workflows/weekly-ingest.yml` runs every Monday (and on demand from the Actions tab) and opens an issue titled "Weekly research digest". `ingest/ingest.js` fills it from official sources: federal contracts to Palantir (USAspending.gov), Peter Thiel's political contributions (FEC), Wikipedia pages on the map that changed since last week, source links that no longer resolve, and cards with no cited source. It never edits the map: someone reads the issue and makes any change by hand, with a source, in a pull request. Run it yourself with `npm run ingest`. Optional: add a `FEC_API_KEY` repository secret (free from api.data.gov); without one the shared demo key is used.

## Working on it

`main` is protected: change it through a pull request, which must pass the checks (data, browser test, accessibility, Lighthouse) before it can be merged. Merging publishes the site. After editing `data.js`, run `node build-static.js` and `node check.js`.

## Security

`index.html` carries a Content-Security-Policy: scripts and styles may come only from the site's own files plus the single inline script (allowed by its hash), and nothing may be fetched from elsewhere. `node check.js` verifies that hash, so changing that inline script means updating the hash in the meta tag. Inline `style="…"` attributes are not allowed; set properties from script instead.

The source book is not in this repository (it is copyrighted); `.gitignore` keeps any local copy out.
