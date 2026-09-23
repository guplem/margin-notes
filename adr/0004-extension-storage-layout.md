# Notes in local storage one key per page, labels in sync storage, drafts in session storage

## Context

Chrome gives an extension three storage areas with different limits and lifetimes.

- `chrome.storage.local` stays on one computer and holds about 10 MB.
- `chrome.storage.sync` follows the Chrome profile to other computers. It holds about 100 KB in total and about 8 KB per item.
- `chrome.storage.session` lives in memory and empties when Chrome restarts.

The extension stores three kinds of data. **Notes** grow without a clear limit: a long proofread can hold dozens of notes with long quotes. **Labels** are a short list that the user edits once and expects everywhere. **Drafts** carry the selected text from the right-click to the dialog, and matter only for a few seconds.

## Decision

- **Notes** live in `chrome.storage.local`, one key per page: `pageNotes:v1:<pageKey>`. The record holds `pageTitle` and `notes`, oldest first. `pageNotesStore.js` is the only file that reads or writes these keys.
- **Labels** live in `chrome.storage.sync` under the single key `labels:v1`. `noteLabels.js` reads and writes them.
- **Drafts** live in `chrome.storage.session` under `noteDraft:<id>`. The service worker writes a draft, and the dialog removes it after the save.
- **A note stores a copy of its label** (name and color), not a reference to the list. An edit of the list must never change a note that is already written or exported.
- **A record with no notes is removed**, not written empty. A folder never outlives its last note.

Every read is validated. `normalizePageRecord`, `normalizeLabels`, and `normalizeNoteDraft` drop unknown keys and repair wrong values, because storage can hold data from an older version. Whenever you add a field, extend the matching function and add a test.

The `:v1` suffix is the migration escape hatch. If a record shape changes in a way that `normalize` cannot repair, write `:v2` keys and migrate the old ones on read.

**Rejected alternative:** one `local` key that holds every page. The folder list reads more simply, but each save would rewrite every note that the user ever wrote.

**Rejected alternative:** notes in `sync` so they follow the user. The 8 KB item limit breaks on a single long page of notes, and a failed write loses the note.

## Consequences

**Positive:**

- A save writes one small record, whatever else is stored.
- The folder list is one prefix scan over `local` (`listPages`), and it cannot pick up the labels by accident, because they live in a different area.
- Labels follow the user's profile, which is what a user expects from a preference.

**Trade-offs and follow-up:**

- Notes do not follow the user to another computer. The export is the way to move them.
- Two dialogs that save to the same page at the same moment race: each reads the record, adds its note, and writes. The second write can drop the first note. Both saves must land within a few milliseconds, which a person cannot do by hand. Move to one key per note if this ever shows up.
- Nothing evicts old notes. `local` holds about 10 MB, which is many thousands of notes, so this is not urgent.
