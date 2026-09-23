/**
 * The notes, one record per page, in `chrome.storage.local`.
 *
 * Each page has its own key (`pageNotes:v1:<pageKey>`), so a save rewrites one
 * small record and never the notes of every page. This file is the only one
 * that reads or writes those keys.
 *
 * The storage area, the clock, and the id maker are passed in, so the whole
 * store is unit tested without a browser.
 */

import { toPageKey } from '../pageAddress/pageKey.js';
import { normalizeLabel } from './noteLabels.js';

/** @typedef {import('./noteLabels.js').NoteLabel} NoteLabel */

/**
 * @typedef {object} PageNote
 * @property {string} id
 * @property {string} quote          The text that was selected on the page.
 * @property {string} text           What the user wrote about it.
 * @property {NoteLabel | null} label A copy of the label, or `null` for none.
 * @property {string} sourceUrl      The full address at the time of the note, hash included.
 * @property {string} createdAt      ISO 8601.
 * @property {string} updatedAt      ISO 8601.
 */

/**
 * @typedef {object} PageRecord
 * @property {string} pageKey
 * @property {string} pageTitle
 * @property {PageNote[]} notes  Oldest first.
 */

/**
 * @typedef {object} NoteContent
 * @property {string} quote
 * @property {string} text
 * @property {NoteLabel | null} label
 */

/**
 * @typedef {object} PageIdentity
 * @property {string} pageUrl
 * @property {string} pageTitle
 */

export const PAGE_NOTES_KEY_PREFIX = 'pageNotes:v1:';

/**
 * @param {unknown} value
 * @returns {string}
 */
const readString = (value) => (typeof value === 'string' ? value : '');

/**
 * A note with neither is dropped on every read, so it must never be written either.
 * @param {string} quote
 * @param {string} text
 * @returns {boolean}
 */
export const hasNoteContent = (quote, text) => quote.trim() !== '' || text.trim() !== '';

/**
 * Repairs one note, or returns `null` when it carries neither a quote nor a text.
 * @param {unknown} stored
 * @returns {PageNote | null}
 */
function normalizeNote(stored) {
  if (stored === null || typeof stored !== 'object') return null;
  const raw = /** @type {Record<string, unknown>} */ (stored);
  const id = readString(raw['id']);
  const quote = readString(raw['quote']);
  const text = readString(raw['text']);
  if (id === '' || !hasNoteContent(quote, text)) return null;
  return {
    id,
    quote,
    text,
    label: normalizeLabel(raw['label']),
    sourceUrl: readString(raw['sourceUrl']),
    createdAt: readString(raw['createdAt']),
    updatedAt: readString(raw['updatedAt']) || readString(raw['createdAt']),
  };
}

/**
 * Drops unknown keys and broken notes. Storage can hold data from an older version.
 * @param {string} pageKey
 * @param {unknown} stored
 * @returns {PageRecord}
 */
export function normalizePageRecord(pageKey, stored) {
  const raw = stored !== null && typeof stored === 'object' ? /** @type {Record<string, unknown>} */ (stored) : {};
  const storedNotes = Array.isArray(raw['notes']) ? raw['notes'] : [];
  return {
    pageKey,
    pageTitle: readString(raw['pageTitle']),
    notes: storedNotes.map(normalizeNote).filter((note) => note !== null),
  };
}

/**
 * @param {PageRecord} record
 * @returns {string}
 */
const latestChange = (record) => record.notes.reduce((latest, note) => (note.updatedAt > latest ? note.updatedAt : latest), '');

/**
 * @param {chrome.storage.StorageArea} storageArea
 * @param {{ now?: () => Date, createId?: () => string }} [options]
 */
export function createPageNotesStore(storageArea, { now = () => new Date(), createId = () => crypto.randomUUID() } = {}) {
  /**
   * @param {string} pageKey
   * @returns {Promise<PageRecord | null>}
   */
  async function getPage(pageKey) {
    const key = PAGE_NOTES_KEY_PREFIX + pageKey;
    const stored = await storageArea.get(key);
    if (stored[key] === undefined) return null;
    return normalizePageRecord(pageKey, stored[key]);
  }

  /**
   * An empty record is removed instead of written, so a folder never outlives its last note.
   * @param {PageRecord} record
   * @returns {Promise<void>}
   */
  async function writePage(record) {
    const key = PAGE_NOTES_KEY_PREFIX + record.pageKey;
    if (record.notes.length === 0) {
      await storageArea.remove(key);
      return;
    }
    await storageArea.set({ [key]: { pageTitle: record.pageTitle, notes: record.notes } });
  }

  return {
    getPage,

    /**
     * @returns {Promise<PageRecord[]>} Every page with notes, the most recently changed first.
     */
    async listPages() {
      const everything = await storageArea.get(null);
      return Object.entries(everything)
        .filter(([key]) => key.startsWith(PAGE_NOTES_KEY_PREFIX))
        .map(([key, value]) => normalizePageRecord(key.slice(PAGE_NOTES_KEY_PREFIX.length), value))
        .filter((record) => record.notes.length > 0)
        .sort((first, second) => latestChange(second).localeCompare(latestChange(first)));
    },

    /**
     * @param {PageIdentity} page
     * @param {NoteContent} content
     * @returns {Promise<PageNote>}
     */
    async addNote(page, content) {
      if (!hasNoteContent(content.quote, content.text)) throw new Error('[Margin Notes] a note needs a quote or a text');
      const pageKey = toPageKey(page.pageUrl);
      const record = (await getPage(pageKey)) ?? { pageKey, pageTitle: '', notes: [] };
      const timestamp = now().toISOString();
      /** @type {PageNote} */
      const note = {
        id: createId(),
        quote: content.quote,
        text: content.text,
        label: content.label,
        sourceUrl: page.pageUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await writePage({
        pageKey,
        pageTitle: page.pageTitle.trim() || record.pageTitle,
        notes: [...record.notes, note],
      });
      return note;
    },

    /**
     * @param {string} pageKey
     * @param {string} noteId
     * @param {{ text: string, label: NoteLabel | null }} changes
     * @returns {Promise<boolean>} `false` when the note does not exist, or when the change would leave it empty.
     */
    async updateNote(pageKey, noteId, changes) {
      const record = await getPage(pageKey);
      const current = record?.notes.find((note) => note.id === noteId);
      if (record === null || current === undefined || !hasNoteContent(current.quote, changes.text)) return false;
      const updatedAt = now().toISOString();
      await writePage({
        ...record,
        notes: record.notes.map((note) => (note.id === noteId ? { ...note, ...changes, updatedAt } : note)),
      });
      return true;
    },

    /**
     * @param {string} pageKey
     * @param {string} noteId
     * @returns {Promise<void>}
     */
    async deleteNote(pageKey, noteId) {
      const record = await getPage(pageKey);
      if (record === null) return;
      await writePage({ ...record, notes: record.notes.filter((note) => note.id !== noteId) });
    },

    /**
     * @param {string} pageKey
     * @returns {Promise<void>}
     */
    async deleteAllNotes(pageKey) {
      await storageArea.remove(PAGE_NOTES_KEY_PREFIX + pageKey);
    },
  };
}

/** @typedef {ReturnType<typeof createPageNotesStore>} PageNotesStore */
