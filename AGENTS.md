# Margin Notes

A Manifest V3 Chrome extension for proofreading and feedback. The user selects text on any page or local file, right-clicks or presses the keyboard shortcut, and adds a note with a label. The toolbar button opens a notes page with one folder per page, where the user copies or downloads the notes as Markdown or plain text. There is no build step and no server, so the repository folder is the folder Chrome loads. Install, use, publishing, and troubleshooting details: `README.md`.

The extension **never draws in the page** and holds no host permission. It learns about a page from what Chrome hands to the right-click menu, the keyboard shortcut, and the toolbar click. The one exception is the shortcut: it runs one function in the tab to read the selection, and falls back to a note about the whole page where Chrome allows no script. Keep it that way: it is why the extension works on local files and PDFs, and why each permission is narrow.

Delegate to these agents at the right moment (each agent's own description says what it does). They fall into two groups, by when they run.

**Before you implement (explore agents, launched as preparation):**

- **pattern-scout**: before implementing any non-trivial module, feature, or page change, and any time you ask "how do we do X here?". Returns real code examples with the rules distilled from them.
- **adr-checker** (consult mode): before implementing in an ADR-relevant area (the "Architecture Decision Records (ADRs)" section lists them). Returns the decisions the work must follow.

**After you implement, before you ship:**

- **docs-checker**: after a change that could affect documented content. Checks every documentation location (code comments, `README.md`, `AGENTS.md`, ADRs, and the help text on the notes page) against the code and fixes drift.
- **validate**: just before you create a PR or push. Runs the repo's checks the way CI does (format, types, tests) and reports pass or fail.
- **adr-checker** (maintain mode): after you introduce a new architectural pattern or change one an ADR records. Creates or updates the ADR.

Beyond these, spawn subagents freely: hand off research, code exploration, and parallel analysis so the files they read stay out of your own context. Give each subagent one task.

## Writing style

The people who read your output may read English as a second language and may be new to the area. Two layers apply. This section is the one home for both: no other file restates them.

**Layer 1 covers every piece of prose you write**: chat replies, PR and issue text, review comments, commit messages, and every document below. It follows Zinsser's four principles, which are simplicity, brevity, clarity, and humanity.

- **Short sentences, one idea each.** Use common words. Avoid idioms, slang, and cultural references.
- **Lead with the answer**, then only the detail that changes what the reader does. Cut filler and hedging. Do not use em dashes.
- **Assume a short attention span.** The reader usually skims to make a quick decision (which PR to review, which issue to pick), with little context and little time; put the single most important thing first, and make each part land even if they stop after the first line.
- **Gloss each jargon term, acronym, or tool/library name on first use** in one short clause, or pick a simpler word.
- **Explain a concept briefly before going deeper.** Do not assume a flow, tool, or pattern is already known.
- **Assume junior-level knowledge of the area.** Name the things you reference (files, commands, terms) instead of assuming the reader can guess.

**Layer 2 adds ASD-STE100 on top, for technical documents only**: `AGENTS.md`, ADRs, `README.md`, skills, subagents, and code comments. ASD-STE100 (Simplified Technical English) is a controlled-English standard from the aerospace industry. A maintenance manual must carry one reading and one only, and these documents have the same job.

- **Active voice only.** Name the actor: "the hook formats the file", not "the file gets formatted".
- **One meaning per word, and the same word for the same thing every time.** Never swap in a synonym for variety.
- **One instruction per sentence, and start the sentence with the verb.** Write "Run the migration", not "The migration should be run".
- **No `-ing` verb form as a noun or as a sentence opener.** Write "Use the skill to create a branch", not "Creating a branch is done with the skill".
- **About 20 words per sentence at most** (25 in descriptive text).
- **Leave out no word that guards the meaning.** Write "the file that you changed" when "the file you changed" could be misread.

Both layers cover prose only. Neither covers code identifiers or text you quote word for word.

## Commands

| Task                                   | Command                                                                  | Notes                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Install dependencies and the git hooks | `npm install`                                                            | The `prepare` script runs `lefthook install`. Run this once per clone.                  |
| Run every check, the way CI runs it    | `npm run check`                                                          | Format check, then type check, then tests. This is the umbrella script that CI calls.   |
| Format the whole repo                  | `npm run format`                                                         | Prettier.                                                                               |
| Check the format only                  | `npm run format:check`                                                   | Fix a failure with `npm run format`.                                                    |
| Type check                             | `npm run typecheck`                                                      | `tsc --noEmit` over the JSDoc types. Success prints nothing.                            |
| Run the tests                          | `npm test`                                                               | `node --test`. It finds `test/*.test.js` on its own.                                    |
| Build the Web Store zip                | `powershell -ExecutionPolicy Bypass -File scripts/packageExtension.ps1`  | Windows only. Writes `dist/margin-notes-<version>.zip` with only the files Chrome uses. |
| Render the Web Store images            | `powershell -ExecutionPolicy Bypass -File scripts/renderStoreImages.ps1` | Windows only, needs Google Chrome. Renders `store/graphics/*.html` to `store/images/`.  |
| Redraw the icons                       | `powershell -ExecutionPolicy Bypass -File scripts/makeIcons.ps1`         | Windows only. Run it only when the artwork changes.                                     |

There is no build and no code generation. To try the extension, load the repository folder unpacked in Chrome (`README.md` has the steps).

Whenever you need to confirm the code still passes, delegate to the **validate** agent (it runs the sequence above the way CI does).

## Architecture

The extension runs in three places, and none of them is the page the user reads.

| Place          | Files                             | Job                                                                                 |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Service worker | `src/background/serviceWorker.js` | Owns the right-click menu, the shortcut, and the toolbar button. Opens the windows. |
| Note dialog    | `noteDialog/noteDialog.*`         | A popup window. Reads the draft, saves the note, closes itself.                     |
| Notes page     | `notesPage/notesPage.*`           | A tab. Lists the folders, edits and deletes notes, exports, labels.                 |

### How one note happens, end to end

1. The user right-clicks selected text. Chrome passes the selection, the page address, and the tab to `contextMenus.onClicked`.
2. `buildNoteDraft` (`noteDraft.js`) turns that into a draft. The service worker writes it to `chrome.storage.session` under `noteDraft:<id>`.
3. The service worker opens `noteDialog.html?draft=<id>` as a popup window, centered by `centerDialogOver`.
4. The dialog reads the draft, and on save calls `addNote` (`pageNotesStore.js`). `toPageKey` (`pageKey.js`) picks the folder.
5. The dialog removes the draft and closes. An open notes page redraws through `chrome.storage.onChanged`.

The keyboard shortcut (`chrome.commands.onCommand`) takes the same path from step 2. It has no selection from Chrome, so `readSelection` first runs `getSelection()` in every frame of the tab, and `pickFrameSelection` (`noteDraft.js`) picks the frame that has one. The notes page reads the current key with `chrome.commands.getAll` and opens `chrome://extensions/shortcuts` to change it, because an extension cannot set its own keys.

A toolbar click opens `notesPage.html?page=<pageKey>` for the current tab. The click grants `activeTab`, which is the only reason the service worker can read the tab address. An open notes page is reused, found with `chrome.runtime.getContexts`.

### File map

| File                               | Holds                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/background/serviceWorker.js`  | Wiring only. Menu, toolbar, window placement.                                                     |
| `src/pageAddress/pageKey.js`       | Address to folder key, and the readable form of a key. **All address knowledge here.**            |
| `src/notes/noteDraft.js`           | The draft from menu or shortcut to dialog, the command name, and the dialog position. Pure logic. |
| `src/notes/noteLabels.js`          | Default labels, `normalizeLabels`, load and save in `chrome.storage.sync`.                        |
| `src/notes/pageNotesStore.js`      | One record per page in `chrome.storage.local`. **The only file that touches its keys.**           |
| `src/notes/notesExport.js`         | Markdown, plain text, and file names. Pure logic.                                                 |
| `src/ui/domElements.js`            | `createElement` and the label chip, shared by both pages.                                         |
| `src/ui/extensionTheme.css`        | Colors, type, and controls shared by both pages, light and dark.                                  |
| `noteDialog/noteDialog.*`          | The note dialog.                                                                                  |
| `notesPage/notesPage.*`            | The notes page.                                                                                   |
| `store/listing.md`                 | Every text of the Chrome Web Store listing, field by field.                                       |
| `store/graphics/`, `store/images/` | The store images: HTML sources, and the rendered PNG files to upload.                             |

## Rules

- **Draw nothing in the page, and ask for no host permission.** The permissions are `contextMenus`, `storage`, `activeTab`, and `scripting`. `scripting` serves only the shortcut's one-time selection read. A feature that needs more page access changes `adr/0002-dialog-in-a-popup-window.md` first. It also costs the local-file support, because Chrome runs no extension script on `file://` until the user turns on "Allow access to file URLs".
- **A failed selection read must still open the dialog.** Where Chrome allows no script, `readSelection` returns an empty text, and the dialog opens as a note about the whole page. Never let the shortcut fail with no window.
- **Never rename the command `add-note-to-selection`.** Chrome stores the user's own key under that name, so a new name drops the user back to the suggested key. `ADD_NOTE_COMMAND` in `noteDraft.js` is the one copy in the code.
- **Put user text into the DOM with `textContent` only.** A note and a quote are text from a page the user does not control. Use `createElement` from `domElements.js`; never `innerHTML`.
- **Pass the selected text through `chrome.storage.session`, never through a window address.** The address shows in the window history and can grow past what Chrome accepts.
- **All address knowledge lives in `pageKey.js`.** A folder is the origin plus the path, with no query, no hash, and no trailing slash. See `adr/0005-one-folder-per-page-address.md`.
- **A note keeps a copy of its label** (name and color), not a reference. An edit of the label list must never change a saved note, and the editor offers a note's old label even when the list no longer has it.
- **Validate everything that comes out of storage.** `normalizeLabels`, `normalizePageRecord`, and `normalizeNoteDraft` drop unknown keys and repair wrong values. Extend the matching function when you add a field, and add a test.
- **Use the three storage areas as `adr/0004-extension-storage-layout.md` sets them.** Notes go in `local`, one key per page; labels go in `sync`; drafts go in `session`.
- **Keep `chrome.*` and the DOM out of `src/notes/` and `src/pageAddress/`.** Each store function receives its storage area as an argument. The two page scripts and the service worker are the only files that call `chrome.*` directly.
- **Keep the store listing true.** `store/listing.md` and the store images state facts about the code: the permissions and their reasons, the default labels, the shortcut key, and the zip size ("28 KB"). Update them in the same change as the code, and re-render the images with `renderStoreImages.ps1`. A false claim can get the extension rejected at review.
- **Save a download from the page, with a `Blob` link.** That is why the extension needs no `downloads` permission. Keep it that way.

## Gotchas

- **The menu item exists only after `onInstalled`.** Chrome keeps menu items across service worker restarts, so the code creates them once per install or update. After you change the menu, press the reload arrow on the extension card; a service worker restart alone does not rebuild it.
- **`info.pageUrl` can be empty.** Chrome documents it as optional, for example in some frames. `buildNoteDraft` falls back to `frameUrl`, then to the tab address, and opens no dialog when all three are empty.
- **A note dialog is a tab context too.** `chrome.runtime.getContexts` returns the note dialogs next to the notes page, so `openNotesPage` matches the notes page by its address, not by position.
- **`chrome.windows.create` refuses bounds that are mostly off screen** ("Bounds must be at least 50% within visible screen space"). `openNoteDialog` retries with no position, so the dialog still opens.
- **`chrome.tabs.update` with a `url` reloads the tab, even when the address is the same.** `openNotesPage` only focuses the notes page when the address would not change, so an open edit survives.
- **A redraw of the notes page destroys its open inputs.** A storage change waits while a note is in edit mode, and in the labels view it redraws only the folder list. Leave edit mode through `stopEditing`, which catches up on the waited changes.
- **Chrome skips a suggested shortcut that another extension already holds, with no error.** The notes page then shows "not set". An extension cannot pick a key for itself, so point the user to `chrome://extensions/shortcuts`.
- **A plain link to a `chrome://` page does nothing on an extension page.** Open it with `chrome.tabs.create`.
- **`executeScript` with `allFrames` can fail as a whole** when one frame refuses the script. `readSelection` then retries the top frame alone.
- **`chrome.storage.session` empties when Chrome restarts.** A dialog window that survives a restart finds no draft, and shows a message instead of a blank form.
- **`navigator.clipboard.writeText` refuses while the page has no focus.** `copyText` falls back to a hidden textarea and `execCommand('copy')`.
- **Windows PowerShell 5.1 `Compress-Archive` writes `\` into zip entry names.** The Web Store cannot read such a zip, so `packageExtension.ps1` writes each entry by hand with `/`.
- **`node --test test/` fails on Node 24.** It treats the folder as a module. Run bare `node --test`, which is what `npm test` does.
- **Prettier uses `endOfLine: "auto"` on purpose.** A Windows checkout with `core.autocrlf=true` holds CRLF line endings. A pinned `endOfLine: "lf"` would fail the format check on every file while the content is correct.

## Test-Driven Development (mandatory)

Develop new behavior **test-first, red-green**: write a failing test that pins the behavior you want (**red**), make it pass with the smallest change (**green**), then clean up with the test as your safety net. A bug fix starts with a test that reproduces the bug.

What is testable here, and what is not:

- **Testable, and always test-first:** the folder key and its readable form (`pageKey.js`), the draft, the frame selection, and the dialog position (`noteDraft.js`), label validation (`noteLabels.js`), the whole note store (`pageNotesStore.js`), and every export format and file name (`notesExport.js`).
- **Exempt, because a unit test would only restate the code:** `serviceWorker.js`, `noteDialog.js`, `notesPage.js`, and `domElements.js`. Keep these thin: an adapter reads an event, calls a pure function, and draws the result. It holds no decision.
- **The safety net for the exempt parts** is the type check (`npm run typecheck` reads every file) plus one manual run in Chrome. `adr/0006-testing-strategy.md` records this split and the manual run.

When a bug appears in an exempt file, do not test the adapter. Move the decision that failed into a pure function, and test that.

The gate: CI runs the checks on every PR, and the repo ruleset "Requirements for merge" blocks merging until the `checks` check is green.

## Git Workflow

- Branch from `main`, PR back to `main`. Whenever you create a branch, use the `create-branch` skill.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`. Whenever you commit, use the `write-commit` skill.
- CI runs the repo's checks (the Commands table) on every PR; the ruleset "Requirements for merge" blocks merging until the `checks` check is green.
- **PRs merge automatically once the required `checks` check passes** (`.github/workflows/auto-merge.yml`); there is no human review gate, the tests are the review, which is what makes the TDD protocol non-negotiable.
- Three layers enforce quality, and they overlap on purpose: the Claude Code hooks in `.claude/settings.json` run while you edit, the lefthook `pre-commit` hook runs the format and type checks when anyone commits, and the CI required check is the merge gate.

## Documentation Organization

Each kind of knowledge has one home. Write a change in the home that matches it; never duplicate the same content across homes. What decides the home is **when the file loads** and **how deep it goes**, not its subject.

| Home                             | Loaded                           | Holds                                                                                                                                                                        |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                      | Every session                    | The map: architecture facts, conventions, gotchas, and the ADR index. Points to the homes below; does not repeat their depth. (`CLAUDE.md` is a one-line `@AGENTS.md` shim.) |
| `.claude/skills/<name>/SKILL.md` | On demand, when the task matches | One procedure: how to do X.                                                                                                                                                  |
| `adr/NNNN-*.md`                  | On demand, via adr-checker       | One architectural decision and its why.                                                                                                                                      |
| `README.md`                      | Read by humans                   | What the project is, install, use, publish, privacy, troubleshooting.                                                                                                        |

**All of these files are living: keep them true.** When you learn something that helps future agents, update the right file in the same session. When a file holds wrong or outdated information, fix it or remove it. This covers code comments too. After implementation, the **docs-checker** agent catches drift you missed.

**Rules:**

- ADRs are agent-only: never reference or list them in `README.md`.
- Number ADRs in sequence (`NNNN-kebab-title.md`) and never renumber an existing file. Index each one as a one-line row in the ADR table below, never a summary.
- Do not duplicate content between `README.md` and `AGENTS.md`; reference it instead.
- `CLAUDE.md` is a one-line `@AGENTS.md` shim; edit `AGENTS.md` instead.

## Architecture Decision Records (ADRs)

ADRs live in `adr/`. Each records one architectural decision or cross-cutting standard and why. **One ADR per pattern, kept alive:** when a pattern changes, update its ADR in place; create a new ADR only for a genuinely new pattern. Most changes need no ADR. Conventions: `adr/AGENTS.md` (auto-loads through its `adr/CLAUDE.md` shim when you work in `adr/`).

**Before implementing** in an area that may carry a decision, delegate to the **adr-checker** agent in consult mode. These areas usually carry decisions: the permissions and anything that would touch the page; how the dialog opens; the storage layout and record shapes; how an address becomes a folder; the testing strategy and the exempt files; the toolchain, the type system, and the absence of a build step.

**After implementing**, delegate to the **adr-checker** agent in maintain mode only if you introduced a new architectural pattern or changed one an ADR already records.

| ADR                                         | Topic                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `0001-agent-docs-structure.md`              | `AGENTS.md` map + Claude-Code-only skills, subagents, and settings                              |
| `0002-dialog-in-a-popup-window.md`          | The note dialog is a popup window; the page gets at most the shortcut's one-time selection read |
| `0003-plain-javascript-with-jsdoc-types.md` | JSDoc types checked by `tsc`, so the repo folder is the extension folder                        |
| `0004-extension-storage-layout.md`          | Notes in `local` one key per page, labels in `sync`, drafts in `session`                        |
| `0005-one-folder-per-page-address.md`       | A folder is origin plus path; the query, the hash, and a trailing slash are dropped             |
| `0006-testing-strategy.md`                  | Pure logic is test-first; thin adapters are exempt and covered by types and a manual run        |

## GitHub issues, PRs, and other artifacts

- **Always self-assign PRs** when you create them.
- **Always link PRs to issues** with `Closes #N` in the PR body, so the issue auto-closes on merge.
- **Always add the `waiting-for-human-check` label** when you create a GitHub issue, PR, or any other reviewable artifact. It means no human has verified the content yet; a human removes it after reviewing. The label marks state (unreviewed), not origin. In this repo the label does **not** block a merge: a green PR auto-merges with the label still on it.

If the repo has no `waiting-for-human-check` label, create it first:

```bash
gh label create "waiting-for-human-check" --description "No human has verified this yet -- direct AI output" --color "D93F0B"
```

Whenever you create a GitHub issue, use the `create-issue` skill. Whenever you implement one, use the `implement-issue` skill. Whenever you review a PR, use the `review-pr` skill (optional here, because no human review gate exists).

## Coding standards

- **Match existing patterns.** Before you write code, find similar implementations and follow their style, structure, and conventions (the **pattern-scout** agent does this).
- **Explicit type annotations** are mandatory for all parameters, return types, and non-trivial variables. This repo writes them as JSDoc comments, and `npm run typecheck` enforces them under `strict`.
- **Comment the _why_, never the _what_.** A comment must carry what the code cannot: a non-obvious constraint, an intentional divergence, a trap a future reader would reintroduce. Do not document self-explanatory names or signatures, and match the comment density of the surrounding file.

## Refactoring safety

Whenever you rename or refactor a symbol, use the `rename-symbol` skill.

## Debugging

Whenever a fix attempt fails or a bug needs root-causing, use the `debug` skill.

## Writing prompts for agents and rules

Whenever you author or edit an AI-facing file (`AGENTS.md`, skills under `.claude/skills/`, subagents under `.claude/agents/`, prompts for agents you spawn), use the `write-ai-instructions` skill.

## Self-updating rules

These instruction files are living, and keeping them current is part of the work. Persist a rule right away (in the narrowest scope that fits) instead of applying it only this session when you discover something **extremely hard to find, deeply non-obvious, and time-saving for future sessions**, hit a pattern that **diverges from what an AI would write by default**, when the user says **"every time" / "always" / "never"**, or when **feedback on your own work reveals a standard you should have followed** (a PR review comment, a user correction). Persist it in these shared, committed files, never in personal memory or the global config, so the whole team gets the lesson. For where to write it, use the `write-ai-instructions` skill.
