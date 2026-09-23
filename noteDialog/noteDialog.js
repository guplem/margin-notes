/**
 * The popup window that the right-click menu opens. It reads the draft that the
 * service worker left in `chrome.storage.session`, lets the user write the note
 * and pick a label, saves it, and closes itself.
 */

import { describePageKey, toPageKey } from '../src/pageAddress/pageKey.js';
import { loadLabels } from '../src/notes/noteLabels.js';
import { NOTE_DRAFT_KEY_PREFIX, normalizeNoteDraft } from '../src/notes/noteDraft.js';
import { createPageNotesStore, hasNoteContent } from '../src/notes/pageNotesStore.js';
import { createElement, createLabelChip, requireElement } from '../src/ui/domElements.js';

/** @typedef {import('../src/notes/noteLabels.js').NoteLabel} NoteLabel */

const NO_LABEL_VALUE = '';

const form = /** @type {HTMLFormElement} */ (requireElement('noteForm'));
const noteText = /** @type {HTMLTextAreaElement} */ (requireElement('noteText'));
const saveButton = /** @type {HTMLButtonElement} */ (requireElement('save'));
const status = requireElement('status');

/**
 * @param {NoteLabel[]} labels
 * @returns {void}
 */
function showLabelChoices(labels) {
  const choices = requireElement('labelChoices');
  /** @type {Array<{ value: string, label: NoteLabel | null }>} */
  const options = [...labels.map((label) => ({ value: label.name, label })), { value: NO_LABEL_VALUE, label: null }];
  options.forEach(({ value, label }, index) => {
    const radio = createElement('input', { attributes: { type: 'radio', name: 'label', value } });
    radio.checked = index === 0;
    const chip = createLabelChip(label);
    if (label === null) chip.textContent = 'No label';
    choices.append(createElement('label', {}, [radio, chip]));
  });
}

/**
 * @param {NoteLabel[]} labels
 * @returns {NoteLabel | null}
 */
function readChosenLabel(labels) {
  const chosen = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="label"]:checked'));
  return labels.find((label) => label.name === chosen?.value) ?? null;
}

/**
 * @param {string} message
 * @returns {void}
 */
function showProblem(message) {
  status.textContent = message;
  saveButton.disabled = true;
}

async function start() {
  const draftKey = NOTE_DRAFT_KEY_PREFIX + (new URLSearchParams(location.search).get('draft') ?? '');
  const [storedDraft, labels] = await Promise.all([chrome.storage.session.get(draftKey), loadLabels(chrome.storage.sync)]);
  const draft = normalizeNoteDraft(storedDraft[draftKey]);

  showLabelChoices(labels);
  requireElement('cancel').addEventListener('click', () => window.close());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.close();
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.requestSubmit();
  });

  if (draft === null) {
    // The session store empties when Chrome restarts, so an old dialog window can outlive its draft.
    showProblem('This note was lost. Close this window, select the text again, and right-click it.');
    return;
  }

  requireElement('pageName').textContent = draft.pageTitle || describePageKey(toPageKey(draft.pageUrl));
  requireElement('quote').textContent = draft.quote;
  // The keyboard shortcut can arrive with no selection: the page allows no script, or nothing was selected.
  requireElement('quote').hidden = draft.quote === '';
  requireElement('quoteMissing').hidden = draft.quote !== '';
  noteText.focus();

  // A selection of only spaces gives an empty quote, and then the note needs a text.
  /** @returns {void} */
  const updateSaveButton = () => {
    saveButton.disabled = !hasNoteContent(draft.quote, noteText.value);
  };
  noteText.addEventListener('input', updateSaveButton);
  updateSaveButton();

  const store = createPageNotesStore(chrome.storage.local);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    void (async () => {
      try {
        await store.addNote(draft, { quote: draft.quote, text: noteText.value.trim(), label: readChosenLabel(labels) });
        await chrome.storage.session.remove(draftKey);
        window.close();
      } catch (error) {
        console.error('[Margin Notes] could not save the note', error);
        status.textContent = 'The note could not be saved. Copy your text somewhere safe and try again.';
        updateSaveButton();
      }
    })();
  });
}

void start().catch((error) => {
  console.error('[Margin Notes] the note dialog failed to start', error);
  showProblem('Something went wrong. Close this window and try again.');
});
