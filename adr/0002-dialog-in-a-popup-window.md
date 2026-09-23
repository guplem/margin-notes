# The note dialog is an extension popup window; the page gets at most a one-time selection read

## Context

The user selects text, right-clicks, and writes a note. The note needs a small form. Chrome offers two places to show it.

- **Inside the page**: a content script (an extension script that Chrome runs inside the page) draws a dialog over the text. That needs a content script on every site, or the `scripting` permission to inject one on demand.
- **Outside the page**: the service worker opens an extension page in a small popup window with `chrome.windows.create`.

The extension must work on local files, because the user proofreads drafts opened from disk. Chrome runs no extension script on a `file://` page until the user turns on "Allow access to file URLs" on the extension card. The built-in PDF viewer accepts no script at all. The extension is also meant for the Chrome Web Store, where each host permission adds a warning at install and extra questions at review.

## Decision

Open the note dialog as an extension popup window (`noteDialog/noteDialog.html`). Never draw anything inside the page.

- The right-click menu item (`contextMenus`, context `selection`) gives the service worker the selected text and the page address. The tab title comes with the tab object.
- The service worker passes that draft to the dialog through `chrome.storage.session`, keyed by a random id in the dialog address (`?draft=<id>`). The selected text never goes into a window address.
- `centerDialogOver` places the dialog in the middle of the browser window that the user clicked in.
- The keyboard shortcut (`commands` in `manifest.json`, name `add-note-to-selection`) opens the same dialog. Chrome gives a shortcut no selection, so `readSelection` in the service worker runs one function in the tab with `chrome.scripting.executeScript`: it returns `getSelection().toString()` and leaves nothing behind. The shortcut grants `activeTab`, so this needs no host permission.
- Where Chrome allows no script (the PDF viewer, Chrome's own pages, a local file without file access), `readSelection` returns an empty text. The dialog then opens with no quote, as a note about the whole page, and says why. The right-click menu stays the path that works everywhere.
- The permissions are `contextMenus`, `storage`, `activeTab`, and `scripting`. There is no `host_permissions` entry and no `content_scripts` entry. `activeTab` gives the toolbar click the current tab address and gives the shortcut its one-time script. `scripting` is the API that runs that script; without a host permission it reaches only a tab that `activeTab` opened to it.

**Rejected alternative:** an in-page dialog through `scripting.executeScript` after the menu click or the shortcut. No host permission is needed, and the dialog would look more native. But it fails on a local file until the user finds the file-access toggle, and it fails on PDFs and on Chrome's own pages. The popup window works on every one of them. The shortcut uses `scripting` only to read the selection, and a failed read still opens the dialog.

**Rejected alternative:** a content script on `<all_urls>`. It gives the richest page features (highlights on noted text, for example), but it asks for access to every site, which is the permission users and reviewers trust least.

## Consequences

**Positive:**

- One path for every page type: web pages, local HTML and text files, and PDFs.
- The install shows no "read and change your data on all websites" warning. The Web Store review needs one reason per permission, and each one is narrow.
- A broken page script or a strict page Content Security Policy can never break the dialog, because the dialog does not live in the page.
- A selection read through the shortcut keeps its line breaks, because `getSelection()` returns them. The right-click menu text can lose them (see below).

**Trade-offs and follow-up:**

- The dialog is a separate window, not an overlay on the text. It cannot show where on the page the quote came from.
- The extension cannot mark noted text on the page. A future "highlight my notes" feature needs page access, so it needs this ADR updated first, with the local-file and PDF limits stated to the user.
- From the right-click menu, the extension knows only the text that Chrome passes to the menu. Chrome may collapse the whitespace of the selection, so a quote can lose its line breaks.
- In a PDF, the shortcut cannot read the selection. The dialog says so and points to the right-click menu.
- An extension cannot set its own shortcut keys. Chrome suggests `Alt+Shift+N` at install, skips it silently if another extension holds it, and the user changes it at `chrome://extensions/shortcuts`.
