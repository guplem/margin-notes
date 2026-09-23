/**
 * The notes page: one folder per page on the left, that page's notes on the
 * right, and the label editor. The toolbar button opens it with `?page=<pageKey>`
 * so it starts on the folder of the tab the user was reading.
 *
 * Every decision lives in `src/notes/`; this file only draws and wires buttons.
 */

import { describePageKey } from '../src/pageAddress/pageKey.js';
import { ADD_NOTE_COMMAND } from '../src/notes/noteDraft.js';
import { DEFAULT_LABELS, loadLabels, saveLabels } from '../src/notes/noteLabels.js';
import { buildExportFileName, formatPageAsMarkdown, formatPageAsText, formatPagesAsMarkdown } from '../src/notes/notesExport.js';
import { createPageNotesStore, PAGE_NOTES_KEY_PREFIX } from '../src/notes/pageNotesStore.js';
import { createElement, createLabelChip, requireElement } from '../src/ui/domElements.js';

/** @typedef {import('../src/notes/noteLabels.js').NoteLabel} NoteLabel */
/** @typedef {import('../src/notes/pageNotesStore.js').PageNote} PageNote */
/** @typedef {import('../src/notes/pageNotesStore.js').PageRecord} PageRecord */

/**
 * @typedef {object} NotesPageState
 * @property {PageRecord[]} pages
 * @property {NoteLabel[]} labels
 * @property {'page' | 'labels'} view
 * @property {string | null} selectedPageKey
 * @property {string | null} editingNoteId  While set, a storage change waits, so a redraw never eats the edit.
 * @property {boolean} changedWhileEditing
 */

const store = createPageNotesStore(chrome.storage.local);
const pageList = requireElement('pageList');
const content = requireElement('content');

/** @type {NotesPageState} */
const state = {
  pages: [],
  labels: [],
  view: 'page',
  selectedPageKey: new URLSearchParams(location.search).get('page'),
  editingNoteId: null,
  changedWhileEditing: false,
};

/**
 * @param {string} message
 * @returns {void}
 */
function showToast(message) {
  const toast = requireElement('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    if (toast.textContent === message) toast.classList.remove('visible');
  }, 2500);
}

/**
 * @param {PageRecord} record
 * @returns {string}
 */
const pageName = (record) => record.pageTitle || describePageKey(record.pageKey);

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The clipboard API refuses when the page is not focused. The old path still works then.
    const scratch = createElement('textarea', { attributes: { readonly: '' } });
    scratch.value = text;
    document.body.append(scratch);
    scratch.select();
    document.execCommand('copy');
    scratch.remove();
  }
}

/**
 * The page saves the file itself, so the extension needs no `downloads` permission.
 * @param {string} fileName
 * @param {string} text
 * @param {string} mimeType
 * @returns {void}
 */
function downloadText(fileName, text, mimeType) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType + ';charset=utf-8' }));
  createElement('a', { attributes: { href: url, download: fileName } }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** @returns {Promise<void>} */
async function reloadPages() {
  state.pages = await store.listPages();
  state.changedWhileEditing = false;
  // The label editor holds unsaved input, so a new note redraws only the folder list next to it.
  if (state.view === 'labels') renderPageList();
  else render();
}

/**
 * Leaves edit mode, and catches up on the storage changes that waited for it.
 * @returns {void}
 */
function stopEditing() {
  state.editingNoteId = null;
  if (state.changedWhileEditing) void reloadPages();
  else render();
}

/**
 * @param {string} message
 * @returns {(error: unknown) => void}
 */
const reportFailure = (message) => (error) => {
  console.error('[Margin Notes] ' + message, error);
  showToast(message);
};

/** @returns {void} */
function render() {
  renderPageList();
  content.replaceChildren();
  if (state.view === 'labels') {
    renderLabelEditor();
    return;
  }
  const selected = state.pages.find((record) => record.pageKey === state.selectedPageKey) ?? null;
  if (selected !== null) renderPage(selected);
  else renderEmptyState();
}

/** @returns {void} */
function renderPageList() {
  pageList.replaceChildren(
    ...state.pages.map((record) =>
      createElement(
        'button',
        {
          attributes: {
            type: 'button',
            title: record.pageKey,
            'aria-current': String(state.view === 'page' && record.pageKey === state.selectedPageKey),
          },
          onClick: () => {
            state.view = 'page';
            state.selectedPageKey = record.pageKey;
            stopEditing();
          },
        },
        [
          createElement('span', { className: 'folder-icon', text: '📁', attributes: { 'aria-hidden': 'true' } }),
          createElement('span', { className: 'page-title', text: pageName(record) }),
          createElement('span', { className: 'page-count', text: String(record.notes.length) }),
          createElement('span', { className: 'page-address', text: describePageKey(record.pageKey) }),
        ],
      ),
    ),
  );
  if (state.pages.length === 0) pageList.append(createElement('p', { className: 'hint', text: 'No notes yet.' }));
}

/** @returns {void} */
function renderEmptyState() {
  const title = state.selectedPageKey
    ? 'No notes on ' + describePageKey(state.selectedPageKey) + ' yet'
    : state.pages.length === 0
      ? 'No notes yet'
      : 'Pick a page on the left';
  content.append(
    createElement('section', { className: 'empty-state' }, [
      createElement('h2', { text: title }),
      createElement('p', { text: 'To add a note:' }),
      createElement('ol', {}, [
        createElement('li', { text: 'Select some text on any page.' }),
        createElement('li', {
          text: 'Right-click the selection and choose "Add note to …", or press the shortcut shown at the bottom left.',
        }),
        createElement('li', { text: 'Write your note, pick a label, and press Save note.' }),
      ]),
      createElement('p', {
        className: 'hint',
        text: 'Each page gets its own folder here. The part of the address after "?" or "#" is ignored, so one page stays one folder.',
      }),
    ]),
  );
}

/**
 * @param {PageRecord} record
 * @returns {void}
 */
function renderPage(record) {
  const isWebPage = /^https?:\/\//.test(record.pageKey);
  content.append(
    createElement('header', { className: 'content-header' }, [
      createElement('h2', { text: pageName(record) }),
      isWebPage
        ? createElement('a', {
            text: record.pageKey,
            attributes: { href: record.pageKey, target: '_blank', rel: 'noopener noreferrer' },
          })
        : // Chrome blocks an extension page from linking to a local file, so show its path as text.
          createElement('span', { className: 'hint', text: describePageKey(record.pageKey) }),
      createElement('span', {
        className: 'hint',
        text: record.notes.length === 1 ? '1 note' : String(record.notes.length) + ' notes',
      }),
    ]),
    createElement('div', { className: 'actions' }, [
      createElement('button', {
        text: 'Copy as Markdown',
        attributes: { type: 'button' },
        onClick: () => void copyText(formatPageAsMarkdown(record)).then(() => showToast('Copied as Markdown.')),
      }),
      createElement('button', {
        text: 'Download .md',
        attributes: { type: 'button' },
        onClick: () => downloadText(buildExportFileName(record, 'md'), formatPageAsMarkdown(record), 'text/markdown'),
      }),
      createElement('button', {
        text: 'Download .txt',
        attributes: { type: 'button' },
        onClick: () => downloadText(buildExportFileName(record, 'txt'), formatPageAsText(record), 'text/plain'),
      }),
      createElement('button', {
        className: 'danger',
        text: 'Delete all notes',
        attributes: { type: 'button' },
        onClick: () => {
          const count = record.notes.length === 1 ? 'the 1 note' : 'all ' + String(record.notes.length) + ' notes';
          if (!confirm('Delete ' + count + ' on "' + pageName(record) + '"? This cannot be undone.')) return;
          state.editingNoteId = null;
          void store
            .deleteAllNotes(record.pageKey)
            .then(() => showToast('Notes deleted.'))
            .catch(reportFailure('The notes could not be deleted.'));
        },
      }),
    ]),
    createElement(
      'ol',
      { className: 'note-list' },
      record.notes.map((note) => renderNoteCard(record, note)),
    ),
  );
}

/**
 * @param {PageRecord} record
 * @param {PageNote} note
 * @returns {HTMLLIElement}
 */
function renderNoteCard(record, note) {
  const isEditing = state.editingNoteId === note.id;
  const card = createElement('li', { className: 'note-card' }, [
    createElement('div', { className: 'note-card-header' }, [
      createLabelChip(note.label),
      createElement('time', { text: formatDate(note.createdAt), attributes: { datetime: note.createdAt } }),
      isEditing
        ? null
        : createElement('button', {
            text: 'Edit',
            attributes: { type: 'button' },
            onClick: () => {
              state.editingNoteId = note.id;
              render();
            },
          }),
      createElement('button', {
        className: 'danger',
        text: 'Delete',
        attributes: { type: 'button' },
        onClick: () => {
          if (!confirm('Delete this note?')) return;
          state.editingNoteId = null;
          void store.deleteNote(record.pageKey, note.id).catch(reportFailure('The note could not be deleted.'));
        },
      }),
    ]),
    note.quote === '' ? null : createElement('blockquote', { className: 'quote', text: note.quote }),
    isEditing
      ? renderNoteEditor(record, note)
      : note.text === ''
        ? null
        : createElement('p', { className: 'note-text', text: note.text }),
  ]);
  if (note.label !== null) card.style.setProperty('--label-color', note.label.color);
  return card;
}

/**
 * @param {PageRecord} record
 * @param {PageNote} note
 * @returns {HTMLDivElement}
 */
function renderNoteEditor(record, note) {
  // A note keeps its own copy of a label, so it may carry one the list no longer has.
  const labelChoices = [...state.labels];
  if (note.label !== null && !labelChoices.some((label) => label.name === note.label?.name)) labelChoices.unshift(note.label);

  const labelSelect = createElement('select', { attributes: { 'aria-label': 'Label' } }, [
    ...labelChoices.map((label) => createElement('option', { text: label.name, attributes: { value: label.name } })),
    createElement('option', { text: 'No label', attributes: { value: '' } }),
  ]);
  labelSelect.value = note.label?.name ?? '';
  const textArea = createElement('textarea', { attributes: { rows: '5', 'aria-label': 'Note' } });
  textArea.value = note.text;
  setTimeout(() => textArea.focus(), 0);

  return createElement('div', { className: 'note-edit' }, [
    labelSelect,
    textArea,
    createElement('div', { className: 'note-edit-actions' }, [
      createElement('button', { text: 'Cancel', attributes: { type: 'button' }, onClick: stopEditing }),
      createElement('button', {
        className: 'primary',
        text: 'Save',
        attributes: { type: 'button' },
        onClick: () => {
          const label = labelChoices.find((choice) => choice.name === labelSelect.value) ?? null;
          void store
            .updateNote(record.pageKey, note.id, { text: textArea.value.trim(), label })
            .then((changed) => {
              if (!changed) {
                showToast('A note without a quote needs some text.');
                return;
              }
              state.changedWhileEditing = true;
              stopEditing();
            })
            .catch(reportFailure('The note could not be saved.'));
        },
      }),
    ]),
  ]);
}

/** @returns {void} */
function renderLabelEditor() {
  const rows = createElement('div', { className: 'label-rows' });

  /**
   * @param {NoteLabel} label
   * @returns {void}
   */
  const addRow = (label) => {
    const colorInput = createElement('input', { attributes: { type: 'color', 'aria-label': 'Label color' } });
    colorInput.value = label.color;
    const nameInput = createElement('input', { attributes: { type: 'text', 'aria-label': 'Label name', maxlength: '40' } });
    nameInput.value = label.name;
    const row = createElement('div', { className: 'label-row' }, [colorInput, nameInput]);
    row.append(
      createElement('button', {
        className: 'danger',
        text: 'Remove',
        attributes: { type: 'button' },
        onClick: () => row.remove(),
      }),
    );
    rows.append(row);
  };
  state.labels.forEach(addRow);

  /** @returns {Array<{ name: string, color: string }>} */
  const collectLabels = () =>
    [...rows.querySelectorAll('.label-row')].map((row) => {
      const [colorInput, nameInput] = /** @type {HTMLInputElement[]} */ ([...row.querySelectorAll('input')]);
      return { name: nameInput?.value ?? '', color: colorInput?.value ?? '' };
    });

  content.append(
    createElement('header', { className: 'content-header' }, [
      createElement('h2', { text: 'Labels' }),
      createElement('p', {
        className: 'hint',
        text: 'The note dialog offers these labels, in this order. A note keeps the label it was saved with, even after you change this list.',
      }),
    ]),
    rows,
    createElement('div', { className: 'actions' }, [
      createElement('button', {
        text: 'Add label',
        attributes: { type: 'button' },
        onClick: () => addRow({ name: '', color: '#607d8b' }),
      }),
      createElement('button', {
        className: 'primary',
        text: 'Save labels',
        attributes: { type: 'button' },
        onClick: () =>
          void saveLabels(chrome.storage.sync, collectLabels())
            .then((saved) => {
              state.labels = saved;
              render();
              showToast('Labels saved.');
            })
            .catch(reportFailure('The labels could not be saved.')),
      }),
      createElement('button', {
        text: 'Reset to defaults',
        attributes: { type: 'button' },
        onClick: () =>
          void saveLabels(chrome.storage.sync, DEFAULT_LABELS)
            .then((saved) => {
              state.labels = saved;
              render();
              showToast('Labels reset.');
            })
            .catch(reportFailure('The labels could not be reset.')),
      }),
    ]),
  );
}

requireElement('showLabels').addEventListener('click', () => {
  state.view = 'labels';
  stopEditing();
});

/**
 * Chrome owns the key. An extension can read it but not change it, so "Change" opens Chrome's own shortcut page.
 * @returns {Promise<void>}
 */
async function showShortcut() {
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((command) => command.name === ADD_NOTE_COMMAND)?.shortcut ?? '';
  requireElement('shortcutKeys').textContent = shortcut || 'not set';
}

requireElement('changeShortcut').addEventListener('click', () => {
  // A plain link to a chrome:// page is blocked, but an extension page may open one as a tab.
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// The user comes back from Chrome's shortcut page to this tab, so read the key again then.
window.addEventListener('focus', () => void showShortcut().catch(() => undefined));

requireElement('downloadAll').addEventListener('click', () => {
  if (state.pages.length === 0) {
    showToast('There are no notes to download.');
    return;
  }
  downloadText('margin-notes-all-pages.md', formatPagesAsMarkdown(state.pages), 'text/markdown');
});

// The note dialog saves while this page is open, so it follows storage instead of waiting for a reload.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    void loadLabels(chrome.storage.sync).then((labels) => (state.labels = labels));
    return;
  }
  if (areaName !== 'local' || !Object.keys(changes).some((key) => key.startsWith(PAGE_NOTES_KEY_PREFIX))) return;
  if (state.editingNoteId !== null) state.changedWhileEditing = true;
  else void reloadPages();
});

void (async () => {
  state.labels = await loadLabels(chrome.storage.sync);
  void showShortcut().catch((error) => console.error('[Margin Notes] could not read the shortcut', error));
  await reloadPages();
  // Without a folder asked for, open the most recent one instead of an empty screen.
  if (state.selectedPageKey === null && state.pages[0] !== undefined) {
    state.selectedPageKey = state.pages[0].pageKey;
    render();
  }
})();
