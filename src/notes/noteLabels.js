/**
 * The labels a note can carry, their defaults, and the reading and writing helpers.
 *
 * Labels live in `chrome.storage.sync`, so an edited list follows the Chrome
 * profile. A note stores a copy of its label (name and color), not a reference,
 * so a later edit of the list never changes a note that was already written.
 *
 * The storage area is passed in instead of read from `chrome` directly, so the
 * logic in this file is unit tested without a browser.
 */

/**
 * @typedef {object} NoteLabel
 * @property {string} name   What the label says, for example "Correction".
 * @property {string} color  A `#rrggbb` color, in lowercase.
 */

/** @type {ReadonlyArray<Readonly<NoteLabel>>} */
export const DEFAULT_LABELS = Object.freeze([
  Object.freeze({ name: 'Comment', color: '#757575' }),
  Object.freeze({ name: 'Question', color: '#1e88e5' }),
  Object.freeze({ name: 'Correction', color: '#e53935' }),
  Object.freeze({ name: 'Rephrasing', color: '#8e24aa' }),
  Object.freeze({ name: 'Suggestion', color: '#43a047' }),
  Object.freeze({ name: 'Praise', color: '#fb8c00' }),
]);

export const LABELS_STORAGE_KEY = 'labels:v1';

const FALLBACK_LABEL_COLOR = '#757575';
const MAX_LABEL_NAME_LENGTH = 40;

/**
 * Repairs one label, or returns `null` when nothing usable is left.
 * @param {unknown} stored
 * @returns {NoteLabel | null}
 */
export function normalizeLabel(stored) {
  if (stored === null || typeof stored !== 'object') return null;
  const raw = /** @type {Record<string, unknown>} */ (stored);
  const name = typeof raw['name'] === 'string' ? raw['name'].trim().slice(0, MAX_LABEL_NAME_LENGTH) : '';
  if (name === '') return null;
  const color =
    typeof raw['color'] === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw['color'])
      ? raw['color'].toLowerCase()
      : FALLBACK_LABEL_COLOR;
  return { name, color };
}

/**
 * Drops broken entries and duplicate names. Anything that is not a list falls
 * back to the defaults; an empty list stays empty, because the user may want none.
 * @param {unknown} stored
 * @returns {NoteLabel[]}
 */
export function normalizeLabels(stored) {
  if (!Array.isArray(stored)) return DEFAULT_LABELS.map((label) => ({ ...label }));
  /** @type {NoteLabel[]} */
  const labels = [];
  /** @type {Set<string>} */
  const seenNames = new Set();
  for (const entry of stored) {
    const label = normalizeLabel(entry);
    if (label === null || seenNames.has(label.name.toLowerCase())) continue;
    seenNames.add(label.name.toLowerCase());
    labels.push(label);
  }
  return labels;
}

/**
 * @param {chrome.storage.StorageArea} storageArea
 * @returns {Promise<NoteLabel[]>}
 */
export async function loadLabels(storageArea) {
  const stored = await storageArea.get(LABELS_STORAGE_KEY);
  return normalizeLabels(stored[LABELS_STORAGE_KEY]);
}

/**
 * @param {chrome.storage.StorageArea} storageArea
 * @param {unknown} labels
 * @returns {Promise<NoteLabel[]>} The list as stored, after repair.
 */
export async function saveLabels(storageArea, labels) {
  const next = normalizeLabels(labels);
  await storageArea.set({ [LABELS_STORAGE_KEY]: next });
  return next;
}
