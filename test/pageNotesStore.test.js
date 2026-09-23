import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createPageNotesStore, normalizePageRecord, PAGE_NOTES_KEY_PREFIX } from '../src/notes/pageNotesStore.js';

/** A stand-in for `chrome.storage.local` that lives in memory. */
function fakeStorageArea(/** @type {Record<string, unknown>} */ initial = {}) {
  /** @type {Record<string, unknown>} */
  const data = { ...initial };
  const area = /** @type {chrome.storage.StorageArea} */ (
    /** @type {unknown} */ ({
      get: async (/** @type {string | null} */ key) => (key === null ? { ...data } : { [key]: data[key] }),
      set: async (/** @type {Record<string, unknown>} */ values) => void Object.assign(data, values),
      remove: async (/** @type {string} */ key) => void delete data[key],
    })
  );
  return { area, data };
}

/** A store with a clock and ids that the test controls. */
function createTestStore(/** @type {Record<string, unknown>} */ initial = {}) {
  const { area, data } = fakeStorageArea(initial);
  let tick = 0;
  let nextId = 0;
  const store = createPageNotesStore(area, {
    now: () => new Date(Date.UTC(2026, 8, 23, 10, 0, tick++)),
    createId: () => 'note-' + String(++nextId),
  });
  return { store, data };
}

const page = { pageUrl: 'https://example.com/post?ref=feed#intro', pageTitle: 'A post' };

test('files a note under the page address without its query and hash', async () => {
  const { store, data } = createTestStore();

  await store.addNote(page, { quote: 'teh', text: 'Typo: "the".', label: { name: 'Correction', color: '#e53935' } });

  assert.deepEqual(Object.keys(data), [PAGE_NOTES_KEY_PREFIX + 'https://example.com/post']);
});

test('keeps the full address of the note, so an anchor still points at the right spot', async () => {
  const { store } = createTestStore();

  const note = await store.addNote(page, { quote: 'teh', text: 'Typo.', label: null });

  assert.equal(note.sourceUrl, page.pageUrl);
});

test('puts the notes of the same page in one folder, oldest first', async () => {
  const { store } = createTestStore();

  await store.addNote(page, { quote: 'one', text: 'First.', label: null });
  await store.addNote({ ...page, pageUrl: 'https://example.com/post#other' }, { quote: 'two', text: 'Second.', label: null });

  const pages = await store.listPages();
  assert.equal(pages.length, 1);
  assert.deepEqual(
    pages[0]?.notes.map((note) => note.quote),
    ['one', 'two'],
  );
});

test('lists the page with the most recent note first', async () => {
  const { store } = createTestStore();

  await store.addNote({ pageUrl: 'https://a.com/', pageTitle: 'A' }, { quote: 'a', text: 'a', label: null });
  await store.addNote({ pageUrl: 'https://b.com/', pageTitle: 'B' }, { quote: 'b', text: 'b', label: null });
  await store.addNote({ pageUrl: 'https://a.com/', pageTitle: 'A' }, { quote: 'a2', text: 'a2', label: null });

  assert.deepEqual(
    (await store.listPages()).map((record) => record.pageTitle),
    ['A', 'B'],
  );
});

test('keeps the last known title when a later note arrives without one', async () => {
  const { store } = createTestStore();

  await store.addNote(page, { quote: 'one', text: 'First.', label: null });
  await store.addNote({ ...page, pageTitle: '' }, { quote: 'two', text: 'Second.', label: null });

  assert.equal((await store.getPage('https://example.com/post'))?.pageTitle, 'A post');
});

test('changes the text and the label of one note and stamps the change', async () => {
  const { store } = createTestStore();
  const note = await store.addNote(page, { quote: 'teh', text: 'Typo.', label: null });

  const changed = await store.updateNote('https://example.com/post', note.id, {
    text: 'Typo: "the".',
    label: { name: 'Correction', color: '#e53935' },
  });

  const stored = (await store.getPage('https://example.com/post'))?.notes[0];
  assert.equal(changed, true);
  assert.equal(stored?.text, 'Typo: "the".');
  assert.equal(stored?.label?.name, 'Correction');
  assert.notEqual(stored?.updatedAt, stored?.createdAt);
});

test('reports false when the note to change does not exist', async () => {
  const { store } = createTestStore();

  assert.equal(await store.updateNote('https://example.com/post', 'missing', { text: 'x', label: null }), false);
});

test('removes the folder together with its last note', async () => {
  const { store, data } = createTestStore();
  const note = await store.addNote(page, { quote: 'teh', text: 'Typo.', label: null });

  await store.deleteNote('https://example.com/post', note.id);

  assert.deepEqual(data, {});
});

test('deletes every note of one page and leaves the other pages alone', async () => {
  const { store } = createTestStore();
  await store.addNote(page, { quote: 'one', text: 'One.', label: null });
  await store.addNote({ pageUrl: 'https://other.com/', pageTitle: 'Other' }, { quote: 'two', text: 'Two.', label: null });

  await store.deleteAllNotes('https://example.com/post');

  assert.deepEqual(
    (await store.listPages()).map((record) => record.pageKey),
    ['https://other.com/'],
  );
});

test('refuses a note with neither a quote nor a text, because it could never be read back', async () => {
  const { store, data } = createTestStore();

  await assert.rejects(store.addNote(page, { quote: '  ', text: '', label: null }));
  assert.deepEqual(data, {});
});

test('refuses to empty the text of a note that has no quote', async () => {
  const { store } = createTestStore();
  const note = await store.addNote(page, { quote: '', text: 'A thought about the whole page.', label: null });

  assert.equal(await store.updateNote('https://example.com/post', note.id, { text: ' ', label: null }), false);
  assert.equal((await store.getPage('https://example.com/post'))?.notes[0]?.text, 'A thought about the whole page.');
});

test('ignores storage keys that belong to something else', async () => {
  const { store } = createTestStore({ 'settings:v1': { anything: true } });

  assert.deepEqual(await store.listPages(), []);
});

test('repairs a stored record: drops broken notes and unknown keys', () => {
  const record = normalizePageRecord('https://example.com/post', {
    pageTitle: 42,
    leftBehindByAnOlderVersion: true,
    notes: [
      {
        id: 'ok',
        quote: 'q',
        text: 't',
        label: { name: 'Question', color: '#1e88e5' },
        sourceUrl: 'x',
        createdAt: 'c',
        updatedAt: 'u',
      },
      { id: 'no-text-or-quote', quote: '', text: '' },
      'not a note',
      { id: 'bad-label', quote: 'q', text: 't', label: { name: '' } },
    ],
  });

  assert.equal(record.pageTitle, '');
  assert.deepEqual(Object.keys(record).sort(), ['notes', 'pageKey', 'pageTitle']);
  assert.deepEqual(
    record.notes.map((note) => note.id),
    ['ok', 'bad-label'],
  );
  assert.equal(record.notes[1]?.label, null);
});
