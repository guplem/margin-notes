# Margin Notes: Chrome Web Store listing

Everything to paste into the Developer Dashboard, in the order the dashboard asks for it. Keep it true: when a feature, a permission, or the size changes, update this file and the images in the same change.

- The upload zip: build it with `scripts/packageExtension.ps1`. It lands in `dist/`.
- The images: `store/images/`. Their sources are the HTML pages in `store/graphics/`. Render them again with `scripts/renderStoreImages.ps1`.

---

## 0. Before you start

- Store page: https://chromewebstore.google.com/detail/inlfhheelfembhnmegepaofeodbfamai
- Item ID: `inlfhheelfembhnmegepaofeodbfamai`. The dashboard and the store address use this ID.
- Dashboard: https://chrome.google.com/webstore/devconsole
- Upload file: `dist/margin-notes-<version>.zip`
- Google account: the one that should own the extension. It needs 2-Step Verification.

---

## 1. Package (upload)

Press **New item** and choose the zip. For an update, open the item, go to **Package**, and upload the new zip.

The dashboard reads the name, the version, the summary, and the icon from the zip.

---

## 2. Store listing tab

### Name (comes from the zip)

Margin Notes

### Summary (comes from the zip: the `description` in `manifest.json`, at most 132 characters)

Select text on any page or local file, right-click, and add a labelled note. Export each page's notes as Markdown or text.

### Description (paste this whole block)

Take notes on anything you read, right where you read it.

Margin Notes is made for proofreading, reviewing, and giving feedback on content online. Select some text, right-click it, and add a note with a label such as Question, Correction, or Rephrasing. When you finish a page, open all its notes in one place and copy them as Markdown, ready to send to a colleague or paste into an LLM.

HOW IT WORKS

1. Select some text on a page.
2. Right-click and choose "Add note", or press Alt+Shift+N.
3. Pick a label, write your note, and press Ctrl+Enter. Done.

FEATURES
• Labelled notes: Comment, Question, Correction, Rephrasing, Suggestion, and Praise. Rename them, recolor them, or add your own.
• One folder per page: every page you annotate gets its own folder. Different pages of the same site stay apart. Tracking tags and anchors in the address (after "?" or "#") are ignored, so one article stays one folder.
• Export in one click: copy a page's notes as Markdown, or download them as a .md or .txt file. You can also download all your notes at once.
• Works almost everywhere: web pages, PDFs, and local files that you open in Chrome.
• Keyboard shortcut: Alt+Shift+N by default. Change it at chrome://extensions/shortcuts.
• Edit and delete: fix a note later, or clear a whole page when you are done.
• Light and dark mode: follows your system theme.

PRIVATE BY DESIGN
• Your notes stay on your computer. There is no server, no account, and no sign-up.
• No analytics, no ads, and no tracking. The extension makes no network requests.
• It never changes the pages you visit. It reads only the text that you select, and only when you ask for a note.
• The whole extension is about 28 KB.

TIP FOR LOCAL FILES
To take notes on files opened from your computer, open chrome://extensions, press Details on Margin Notes, and turn on "Allow access to file URLs".

Open source: https://github.com/guplem/margin-notes

### Category

Productivity (sub-category: Tools, if the dashboard asks)

### Language

English

### Graphic assets

| Field (files in `store/images/`) | File                                              |
| -------------------------------- | ------------------------------------------------- |
| Store icon (128×128)             | Comes from the zip. If asked: `icons/icon128.png` |
| Screenshot 1                     | `1-simple-to-use.png`                             |
| Screenshot 2                     | `2-light-fast-private.png`                        |
| Screenshot 3                     | `3-add-a-note.png`                                |
| Screenshot 4                     | `4-notes-page.png`                                |
| Small promo tile (440×280)       | `small-promo-tile-440x280.png`                    |
| Marquee promo tile (1400×560)    | Leave empty. It is optional.                      |
| Promo video                      | Leave empty. It is optional.                      |

### Additional fields

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Official URL   | Leave "None" (it needs a verified domain)     |
| Homepage URL   | https://github.com/guplem/margin-notes        |
| Support URL    | https://github.com/guplem/margin-notes/issues |
| Mature content | No                                            |

---

## 3. Privacy tab

### Single purpose description

Margin Notes lets the user attach labelled notes to text that they select on web pages and local files, and export the notes of each page as Markdown or plain text.

### Permission justifications

**contextMenus**
Adds an "Add note" item to the right-click menu when text is selected. This item is the main way to create a note.

**storage**
Saves the user's notes on the user's own computer (chrome.storage.local) and the user's label list in the Chrome profile (chrome.storage.sync). Nothing is sent to any server.

**activeTab**
When the user presses the toolbar button, reads the address of the current tab so the notes page opens on that page's folder. When the user presses the keyboard shortcut, gives access to the current tab only, so the extension can read the selected text.

**scripting**
When the user presses the keyboard shortcut, runs one function in the current tab that returns the selected text (window.getSelection). It runs only on that user action, only in that tab, and it never changes the page.

**Host permissions**
None requested. (If the field shows, write: "The extension requests no host permissions.")

### Remote code

Select: **No, I am not using remote code.**

Justification (if asked): All JavaScript ships inside the package. The extension loads no external script and makes no network request.

### Data usage

Tick only:

- **Website content** (the text that the user selects and the notes that the user writes about it)

Leave every other category unticked (personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity).

Tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL

https://github.com/guplem/margin-notes/blob/main/PRIVACY.md

---

## 4. Distribution tab

| Field      | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| Payments   | Free                                                             |
| Visibility | Public. Pick Unlisted instead to share it only by link at first. |
| Regions    | All regions                                                      |

---

## 5. Submit

Press **Submit for review**. Leave "Publish automatically after review" on, unless you want to press Publish yourself.

Google sends an email when the review is done. It usually takes a few days.
