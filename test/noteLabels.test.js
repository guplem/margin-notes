import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { DEFAULT_LABELS, LABELS_STORAGE_KEY, loadLabels, normalizeLabels, saveLabels } from '../src/notes/noteLabels.js';

/** A stand-in for `chrome.storage.sync` that lives in memory. */
function fakeStorageArea(/** @type {Record<string, unknown>} */ initial = {}) {
  /** @type {Record<string, unknown>} */
  const data = { ...initial };
  return /** @type {chrome.storage.StorageArea} */ (
    /** @type {unknown} */ ({
      get: async (/** @type {string} */ key) => ({ [key]: data[key] }),
      set: async (/** @type {Record<string, unknown>} */ values) => void Object.assign(data, values),
    })
  );
}

test('offers the proofreading labels by default', () => {
  const names = DEFAULT_LABELS.map((label) => label.name);

  for (const expected of ['Question', 'Correction', 'Rephrasing']) assert.ok(names.includes(expected), expected);
});

test('falls back to the defaults for anything that is not a list', () => {
  for (const stored of [undefined, null, 'text', 7, {}]) {
    assert.deepEqual(normalizeLabels(stored), DEFAULT_LABELS);
  }
});

test('keeps an empty list, because the user may want no labels at all', () => {
  assert.deepEqual(normalizeLabels([]), []);
});

test('drops an entry with no name and trims the rest', () => {
  const labels = normalizeLabels([{ name: '  Typo ', color: '#ff0000' }, { name: '   ', color: '#00ff00' }, 'Loose text']);

  assert.deepEqual(labels, [{ name: 'Typo', color: '#ff0000' }]);
});

test('replaces a color that is not a #rrggbb value', () => {
  const labels = normalizeLabels([{ name: 'Typo', color: 'red' }]);

  assert.match(labels[0]?.color ?? '', /^#[0-9a-f]{6}$/);
});

test('keeps only the first label of each name', () => {
  const labels = normalizeLabels([
    { name: 'Typo', color: '#111111' },
    { name: 'typo', color: '#222222' },
  ]);

  assert.deepEqual(labels, [{ name: 'Typo', color: '#111111' }]);
});

test('reads the defaults from an empty storage area', async () => {
  assert.deepEqual(await loadLabels(fakeStorageArea()), DEFAULT_LABELS);
});

test('writes the list it was given, repaired', async () => {
  const storage = fakeStorageArea();

  const saved = await saveLabels(storage, [{ name: ' Idea ', color: '#ABCDEF' }]);

  assert.deepEqual(saved, [{ name: 'Idea', color: '#abcdef' }]);
  assert.deepEqual(await loadLabels(storage), saved);
});

test('repairs a wrong value on the way out', async () => {
  const storage = fakeStorageArea({ [LABELS_STORAGE_KEY]: [{ name: 'Idea', color: 42 }] });

  const [label] = await loadLabels(storage);

  assert.equal(label?.name, 'Idea');
  assert.match(label?.color ?? '', /^#[0-9a-f]{6}$/);
});
