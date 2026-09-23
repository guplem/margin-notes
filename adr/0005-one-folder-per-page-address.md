# A folder is the origin plus the path; the query, the hash, and a trailing slash are dropped

## Context

The notes page shows one folder per page. Something must decide when two addresses are the same page.

A folder per site is too coarse: every note on `google.com/a` and `google.com/b` would share one folder, and the user reviews one article at a time. The full address is too fine: `?utm_source=newsletter`, `?page=2`, and `#comments` all point at the same document, and each would open a new folder.

## Decision

`toPageKey` in `src/pageAddress/pageKey.js` builds the key, and it is the only place that knows the rule.

- Keep the protocol, the host, and the full path. `https://google.com/a` and `https://google.com/b` are two folders.
- Drop the query (`?...`) and the hash (`#...`).
- Drop a trailing slash, except the slash of the site root. `https://example.com/docs/` and `https://example.com/docs` are one folder; `https://example.com/` keeps its slash.
- Let the `URL` parser lowercase the host. Keep the case of the path, because servers may treat `/Docs` and `/docs` as different pages.
- Treat a local file the same way: `file:///C:/draft.html#part-2` becomes `file:///C:/draft.html`.
- When the text does not parse as a URL, cut it at the first `?` or `#`.

Each note still stores its full address, hash included, in `sourceUrl`. The exports print it when it differs from the folder key, so a note taken at `#section-3` still points at that spot.

`describePageKey` turns a key into the short form that the page list and the exports show: no `https://`, no root slash, and a decoded local path (`C:/My Drafts/draft.html`).

**Rejected alternative:** keep the query. Some sites use it to pick the document (`/view?id=42`), and those pages would merge into one folder under this rule. The user asked for the query to be ignored, and tracking tags are far more common than query-based pages.

## Consequences

**Positive:**

- One article is one folder, however the user arrived at it.
- The rule is one pure function, so each case above is a unit test.

**Trade-offs and follow-up:**

- A site that selects its document through the query (`?id=42`) puts all its documents in one folder. If this becomes a real problem, add a per-site exception here, not in a caller.
- A change to this rule orphans nothing, but it splits or merges folders from then on: old notes stay under their old key. A rule change that must regroup old notes needs a migration in `pageNotesStore.js`.
