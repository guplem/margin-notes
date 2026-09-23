# Plain JavaScript with JSDoc types, checked by tsc, and no build step

## Context

The author's standard requires explicit types on every parameter, return type, and non-trivial variable. TypeScript is the obvious way to get them, but it needs a compiler, so the folder that a developer edits stops being the folder that Chrome loads.

That gap matters for a browser extension. The whole development loop is: edit a file, press the reload arrow on the extension card, try the change. A build step adds a watcher that must run and be correct, and it puts the shipped code one transformation away from the code in the editor. The extension has no dependencies to bundle and no syntax to downlevel.

## Decision

Write plain JavaScript with JSDoc type comments. Check them with the TypeScript compiler in no-emit mode: `tsc --noEmit -p jsconfig.json`, with `checkJs`, `strict`, and `noUncheckedIndexedAccess` on. TypeScript is a development dependency and a checker only; it never produces output.

The repository root is the extension folder. `manifest.json`, `src/`, `noteDialog/`, `notesPage/`, and `icons/` sit next to `package.json`, `test/`, and `node_modules/`. Chrome ignores the files that it does not reference. `scripts/packageExtension.ps1` builds the Web Store zip from the shipped folders only.

Every file uses ES module `import`. The service worker is declared with `"type": "module"`, and both pages load their script with `<script type="module">`. That is why the same files load in Chrome and in `node --test` without change.

Use a `/** @type {X} */ (value)` cast only at a real boundary, such as a DOM lookup or a test fake. A cast inside logic is a sign that the types are wrong.

**Rejected alternative:** TypeScript with a bundler (esbuild or Vite). It gives nicer syntax for the same guarantees, but it puts a build between the editor and Chrome for a project with nothing to bundle.

**Rejected alternative:** no type check, JSDoc as documentation only. That drops the explicit-type rule and removes the only automatic safety net of the adapter files, which `0006-testing-strategy.md` leaves without unit tests.

## Consequences

**Positive:**

- Load unpacked, edit, reload. Nothing sits between the source and the browser.
- `npm ci --ignore-scripts` plus `npm run check` is the whole CI job, and the same command runs locally.
- The type check reads every file, including the adapters that carry no unit tests.

**Trade-offs and follow-up:**

- JSDoc generics and casts are wordier than TypeScript syntax.
- `node_modules/` sits inside the folder that Chrome loads. Chrome ignores it, but a manual zip of the folder would carry it. Always build the upload with `packageExtension.ps1`.
- If the project gains a runtime dependency from npm, revisit this decision, because Chrome cannot resolve a bare module name such as `import 'some-package'`.
