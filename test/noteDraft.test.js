import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildNoteDraft, centerDialogOver, normalizeNoteDraft } from '../src/notes/noteDraft.js';

test('takes the selected text, the page address, and the tab title', () => {
  const draft = buildNoteDraft(
    { selectionText: '  some text  ', pageUrl: 'https://example.com/post#x' },
    { title: 'A post', url: 'https://example.com/post' },
  );

  assert.deepEqual(draft, { quote: 'some text', pageUrl: 'https://example.com/post#x', pageTitle: 'A post' });
});

test('uses the frame address when the menu has no page address', () => {
  const draft = buildNoteDraft({ selectionText: 'x', frameUrl: 'file:///C:/draft.pdf' }, undefined);

  assert.deepEqual(draft, { quote: 'x', pageUrl: 'file:///C:/draft.pdf', pageTitle: '' });
});

test('gives no draft when there is no address to file the note under', () => {
  assert.equal(buildNoteDraft({ selectionText: 'x' }, undefined), null);
});

test('repairs a draft read back from session storage', () => {
  assert.equal(normalizeNoteDraft(undefined), null);
  assert.equal(normalizeNoteDraft({ quote: 'x' }), null);
  assert.deepEqual(normalizeNoteDraft({ quote: 7, pageUrl: 'https://a.com/', pageTitle: null }), {
    quote: '',
    pageUrl: 'https://a.com/',
    pageTitle: '',
  });
});

test('centers the dialog over the browser window', () => {
  const bounds = centerDialogOver({ left: 100, top: 50, width: 1200, height: 800 }, { width: 400, height: 500 });

  assert.deepEqual(bounds, { left: 500, top: 200, width: 400, height: 500 });
});

test('places the dialog near the top left when the window size is unknown', () => {
  assert.deepEqual(centerDialogOver(undefined, { width: 400, height: 500 }), { left: 100, top: 100, width: 400, height: 500 });
});
