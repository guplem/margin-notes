# Margin Notes

A Chrome extension to take notes on what you read. Select some text, right-click it, and add a note with a label such as **Question**, **Correction**, or **Rephrasing**. When you finish a page, open your notes from the toolbar, and copy or download them as Markdown or plain text for a colleague or an LLM.

It works on web pages, on local files that you open in Chrome (HTML, text, PDF), and on PDFs online. Nothing leaves your browser.

![the icon: a yellow note with three lines of text](icons/icon128.png)

## Install

Install it from the Chrome Web Store: **[Margin Notes](https://chromewebstore.google.com/detail/inlfhheelfembhnmegepaofeodbfamai)**.

### Install from source

To run it from source, load it from this folder. There is no build step, so the repository folder **is** the extension folder.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Press **Load unpacked** and pick the folder that holds `manifest.json`.
5. Optional: pin the extension. Press the puzzle icon in the toolbar, then the pin next to **Margin Notes**.

Chrome keeps the extension until you remove it. After you pull a new version, press the reload arrow on the extension card.

## How to use it

### Add a note

1. Select some text on a page.
2. Right-click the selection and choose **Add note to "…"**.
3. A small window opens with the selected text. Pick a label, write your note, and press **Save note** (or `Ctrl+Enter`). `Esc` closes the window without saving.

### Keyboard shortcut

Select some text and press **`Alt+Shift+N`** instead of right-clicking. The shortcut keeps the line breaks of the selection.

- **Change the key:** press **Change** next to the shortcut at the bottom left of the notes page, or open `chrome://extensions/shortcuts`. Chrome owns shortcut keys, so they are changed there.
- **Nothing selected:** the window opens without a quote, for a note about the whole page.
- **In a PDF:** the shortcut cannot read the selection. Use the right-click menu.

### Read, edit, and share your notes

Press the Margin Notes button in the toolbar. The notes page opens on the folder of the page that you are reading.

- **One folder per page.** The left column lists every page with notes, the most recent first. `google.com/a` and `google.com/b` are two folders. The part of the address after `?` or `#` is ignored, so `article?utm_source=mail` and `article#comments` land in the same folder as `article`.
- **Per folder:** **Copy as Markdown**, **Download .md**, **Download .txt**, and **Delete all notes**.
- **Per note:** **Edit** (change the text or the label) and **Delete**.
- **Download all notes (.md)** saves every folder in one Markdown file.

This is what **Copy as Markdown** gives you:

```markdown
# Notes on "We are launching our new product"

https://example.com/blog/launch-post

2 notes

## 1. Correction

> teh best tool

Typo: "the".

## 2. Question

> We leverage synergies to empower stakeholders.

What does this mean for a reader?

At: https://example.com/blog/launch-post#intro
```

The `At:` line shows up only when the note was taken at a specific spot of the page (an address with `#...`).

### Labels

Each label has a name and a color. The defaults are **Comment**, **Question**, **Correction**, **Rephrasing**, **Suggestion**, and **Praise**. Press **Edit labels** on the notes page to rename, recolor, add, remove, or reorder them. Your labels follow your Chrome profile to your other computers.

A note keeps the label that it was saved with. If you later rename or remove a label, your old notes do not change.

## Troubleshooting

**The "Add note" item is not in the right-click menu.**
The item shows only when text is selected. If you just installed or updated the extension, reload the tab once.

**The item is missing on a local file.**
Open `chrome://extensions`, press **Details** on Margin Notes, and turn on **Allow access to file URLs**.

**The note window says the note was lost.**
Chrome was restarted while the window was open, so the selected text is gone. Close the window, select the text again, and right-click it.

**The selected text lost its line breaks.**
Chrome gives the extension the selection as one line in some cases. Edit the note if the line breaks matter.

**The shortcut does nothing, or the notes page says "Shortcut: not set".**
Another extension already uses `Alt+Shift+N`, so Chrome did not give it to Margin Notes. Press **Change** on the notes page and pick another key.

**The shortcut opens a note without the text that I selected.**
Chrome does not let extensions read that page: a PDF, a Chrome settings page, or a local file without file access. Use the right-click menu there, or turn on **Allow access to file URLs** for local files.

**Copy as Markdown did nothing.**
Click once anywhere on the notes page and press the button again. Chrome only lets a page write to the clipboard while it has focus.

## Privacy

- Your notes stay on this computer, in Chrome's storage for the extension. There is no server, no account, and no analytics.
- Your labels are stored in your Chrome profile, so Chrome syncs them to your other computers when sync is on.
- The extension never changes the pages you visit. It sees only the text that you select, the page address, and the page title, and only when you right-click **Add note** or press the shortcut.
- A copy or a download goes only where you put it.

The full policy for the Chrome Web Store is in [`PRIVACY.md`](PRIVACY.md).

## Publish to the Chrome Web Store

1. Raise `version` in `manifest.json` (and in `package.json`, to keep them equal).
2. Build the upload zip. It holds only the files that Chrome uses:
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/packageExtension.ps1
   ```
   The zip lands in `dist/margin-notes-<version>.zip`.
3. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). A new developer account pays a one-time registration fee.
4. Press **New item** and upload the zip. For an update, open the item and upload the new zip in **Package**.
5. Fill in the **Store listing**, **Privacy**, and **Distribution** tabs. [`store/listing.md`](store/listing.md) holds every text to paste, field by field, including one reason per permission and the privacy policy link. The images to upload are in `store/images/`.
6. Submit for review.

The store images are rendered from HTML pages in `store/graphics/`. After you change one, render them again (Windows, needs Google Chrome):

```bash
powershell -ExecutionPolicy Bypass -File scripts/renderStoreImages.ps1
```

## Development

Requires [Node.js](https://nodejs.org). There is no build step.

```bash
npm install
npm run check
```

`npm run check` runs the format check, the type check, and the tests, which is what CI runs. Contributor and architecture notes live in `AGENTS.md`.

## Licence

MIT. See `LICENSE`.
