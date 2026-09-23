import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildExportFileName, formatPageAsMarkdown, formatPageAsText, formatPagesAsMarkdown } from '../src/notes/notesExport.js';

/** @type {import('../src/notes/pageNotesStore.js').PageRecord} */
const record = {
  pageKey: 'https://example.com/post',
  pageTitle: 'A post',
  notes: [
    {
      id: 'one',
      quote: 'teh first line\nand a second line',
      text: 'Typo: "the".',
      label: { name: 'Correction', color: '#e53935' },
      sourceUrl: 'https://example.com/post#intro',
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
    },
    {
      id: 'two',
      quote: 'We leverage synergies.',
      text: 'What does this mean?\nPlease say it plainly.',
      label: null,
      sourceUrl: 'https://example.com/post',
      createdAt: '2026-09-23T10:05:00.000Z',
      updatedAt: '2026-09-23T10:05:00.000Z',
    },
  ],
};

test('writes a Markdown heading with the page title and its address', () => {
  const markdown = formatPageAsMarkdown(record);

  assert.ok(markdown.startsWith('# Notes on "A post"\n\nhttps://example.com/post\n'), markdown);
});

test('quotes every line of the selected text in Markdown', () => {
  const markdown = formatPageAsMarkdown(record);

  assert.ok(markdown.includes('> teh first line\n> and a second line'), markdown);
});

test('numbers the notes and names the label in Markdown', () => {
  const markdown = formatPageAsMarkdown(record);

  assert.ok(markdown.includes('## 1. Correction'), markdown);
  assert.ok(markdown.includes('## 2. Note'), markdown);
  assert.ok(markdown.includes('What does this mean?\nPlease say it plainly.'), markdown);
});

test('falls back to the address when the page has no title', () => {
  assert.ok(formatPageAsMarkdown({ ...record, pageTitle: '' }).startsWith('# Notes on "example.com/post"'));
});

test('writes plain text with no Markdown marks', () => {
  const text = formatPageAsText(record);

  assert.ok(text.startsWith('Notes on "A post"\nhttps://example.com/post\n'), text);
  assert.ok(text.includes('1. [Correction]\nSelected text:\n  teh first line\n  and a second line\nNote:\n  Typo: "the".'), text);
  assert.ok(!text.includes('> '), text);
  assert.ok(!text.split('\n').some((line) => line.startsWith('#')), text);
});

test('links to the exact spot only when the note was taken at an anchor', () => {
  const markdown = formatPageAsMarkdown(record);

  assert.ok(markdown.includes('https://example.com/post#intro'), markdown);
  assert.equal(markdown.split('https://example.com/post\n').length, 2, 'the page address appears once, at the top');
});

test('joins several pages into one Markdown document', () => {
  const markdown = formatPagesAsMarkdown([record, { ...record, pageKey: 'https://other.com/', pageTitle: 'Other' }]);

  assert.ok(markdown.includes('# Notes on "A post"'));
  assert.ok(markdown.includes('# Notes on "Other"'));
  assert.ok(markdown.includes('\n\n---\n\n'));
});

test('names the file after the page, with only safe characters', () => {
  assert.equal(buildExportFileName(record, 'md'), 'notes-a-post.md');
  assert.equal(buildExportFileName({ ...record, pageTitle: 'Q3: "Report" / draft?' }, 'txt'), 'notes-q3-report-draft.txt');
  assert.equal(buildExportFileName({ ...record, pageTitle: '' }, 'md'), 'notes-example-com-post.md');
});
