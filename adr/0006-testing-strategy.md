# Test the logic test-first; leave the thin adapters to the type check and one manual run

## Context

The repo mandates red-green TDD. A Chrome extension resists it at its edges: the service worker reacts to Chrome events, and the two pages draw DOM and react to clicks. A unit test of that code would need a fake `chrome` object and a fake DOM that this repo invents, so it would only prove that the code calls what the test told it to call.

The rest of the extension is decisions. Which folder an address belongs to, what a broken stored record becomes, how a quote with several lines looks in Markdown, and which note a delete removes are all decisions. They are also where a bug loses or scrambles a user's notes.

## Decision

**Split the code so the decisions are pure, then test all of them test-first.**

- `pageKey.js`, `noteDraft.js`, and `notesExport.js` are pure functions with no `chrome.*` and no DOM.
- `noteLabels.js` and `pageNotesStore.js` take the storage area as an argument. The store also takes the clock and the id maker. A test passes an in-memory storage object, a fixed clock, and counting ids, so every result is exact.

**Exempt from unit tests:** `serviceWorker.js`, `noteDialog.js`, `notesPage.js`, and `domElements.js`. Keep them thin. An adapter reads an event or a form, calls a pure function, and draws or stores the result. It holds no decision. When a bug appears in one of them, move the decision that failed into a pure function and test that, rather than test the adapter.

**The safety net for the exempt files** is two things. `npm run typecheck` reads every file under `strict`, so a wrong property name or a missed `null` fails the check. One manual run in Chrome covers the rest:

1. Load the folder unpacked, select text on a web page, right-click, and save a note with a label.
2. Select text on a web page and press the shortcut. Confirm that the dialog shows the quote with its line breaks.
3. Do the right-click step on a local file.
4. Press the toolbar button, and confirm that the notes page opens on that page's folder.
5. Edit a note, copy the folder as Markdown, download the `.md` and `.txt` files, and delete the folder.

**Rejected alternative:** a browser test runner (Puppeteer or Playwright) that loads the unpacked extension. Branded Chrome no longer accepts the command-line flag that loads an unpacked extension, so it needs a separate test build of Chrome, and right-click menus are hard to drive from such tools. The value it adds is the value of the manual run.

## Consequences

**Positive:**

- The suite runs in well under a second, so the pre-commit hook and CI stay fast.
- The rules that protect the user's notes (folder grouping, record repair, empty-folder removal, export shape) are each a cheap, exact test.

**Trade-offs and follow-up:**

- The files with no unit tests are the ones that talk to Chrome. The type check and the manual run cover them instead.
- The exemption holds only while the adapters stay thin. A decision that creeps into an adapter is a defect; move it out instead of widening the exemption.
- PRs here auto-merge on a green check, so a change to an exempt file needs the manual run before it is trusted.
