---
name: rename-symbol
description: Rename or refactor a symbol safely by searching every naming-case variant across code, tests, docs, configs, and JSON. Use when renaming any identifier so no reference is missed.
---

# Rename a symbol safely

When you rename or refactor any symbol, search **all** naming variants (camelCase, PascalCase, snake_case, kebab-case, UPPER_CASE) across the whole project (code, tests, docs, configs, and JSON), not just the obvious code references. A missed variant in a config key or a data file is the usual cause of a rename that compiles fine but breaks at runtime.

Extra traps in this repo:

- **Storage keys are data, not code.** `pageNotes:v1:`, `labels:v1`, and `noteDraft:` name records that already exist in a user's browser. Renaming the JavaScript constant is safe. Renaming the **stored string** hides every saved note with no error. If a key must change, add a `:v2` key and migrate on read; never rename a live key.
- **Stored field names are data too.** `pageTitle`, `notes`, `quote`, `text`, `label`, `sourceUrl`, `createdAt`, and `updatedAt` are read back by the `normalize*` functions. A renamed field reads as missing, so the note is dropped or loses its value. Keep the old name in the normalizer as a fallback.
- **File paths are named in more than one place.** `manifest.json` names the service worker and the icons; the service worker names `noteDialog/noteDialog.html` and `notesPage/notesPage.html`; `scripts/packageExtension.ps1` names the shipped folders; `jsconfig.json` names the checked folders. Search all four after you move a file.
- **The menu item id `add-note-to-selection` is Chrome state.** A changed id leaves the old item in place until the next install or update.
