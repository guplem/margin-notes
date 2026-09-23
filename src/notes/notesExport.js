/**
 * Turns the notes of a page into text a person or an LLM can read: Markdown or
 * plain text. Pure logic, no DOM and no `chrome.*`.
 */

import { describePageKey } from '../pageAddress/pageKey.js';

/** @typedef {import('./pageNotesStore.js').PageRecord} PageRecord */
/** @typedef {import('./pageNotesStore.js').PageNote} PageNote */

const UNLABELLED_NOTE_NAME = 'Note';

/**
 * @param {PageRecord} record
 * @returns {string}
 */
const pageName = (record) => record.pageTitle.trim() || describePageKey(record.pageKey);

/**
 * @param {number} count
 * @returns {string}
 */
const countNotes = (count) => (count === 1 ? '1 note' : String(count) + ' notes');

/**
 * The full address only adds something when it differs from the page, for example an anchor.
 * @param {PageRecord} record
 * @param {PageNote} note
 * @returns {string | null}
 */
const extraSourceUrl = (record, note) => (note.sourceUrl !== '' && note.sourceUrl !== record.pageKey ? note.sourceUrl : null);

/**
 * @param {string} text
 * @param {string} prefix
 * @param {string} emptyLine  What an empty line becomes, so a prefix never leaves trailing spaces.
 * @returns {string}
 */
const prefixLines = (text, prefix, emptyLine) =>
  text
    .split('\n')
    .map((line) => (line.trim() === '' ? emptyLine : prefix + line))
    .join('\n');

/**
 * @param {PageRecord} record
 * @returns {string}
 */
export function formatPageAsMarkdown(record) {
  /** @type {string[]} */
  const blocks = ['# Notes on "' + pageName(record) + '"', record.pageKey, countNotes(record.notes.length)];
  record.notes.forEach((note, index) => {
    blocks.push('## ' + String(index + 1) + '. ' + (note.label?.name ?? UNLABELLED_NOTE_NAME));
    if (note.quote.trim() !== '') blocks.push(prefixLines(note.quote.trim(), '> ', '>'));
    if (note.text.trim() !== '') blocks.push(note.text.trim());
    const sourceUrl = extraSourceUrl(record, note);
    if (sourceUrl !== null) blocks.push('At: ' + sourceUrl);
  });
  return blocks.join('\n\n') + '\n';
}

/**
 * @param {PageRecord[]} records
 * @returns {string}
 */
export function formatPagesAsMarkdown(records) {
  return records.map((record) => formatPageAsMarkdown(record).trimEnd()).join('\n\n---\n\n') + '\n';
}

/**
 * @param {PageRecord} record
 * @returns {string}
 */
export function formatPageAsText(record) {
  /** @type {string[]} */
  const blocks = ['Notes on "' + pageName(record) + '"\n' + record.pageKey + '\n' + countNotes(record.notes.length)];
  record.notes.forEach((note, index) => {
    /** @type {string[]} */
    const lines = [String(index + 1) + '. [' + (note.label?.name ?? UNLABELLED_NOTE_NAME) + ']'];
    if (note.quote.trim() !== '') lines.push('Selected text:', prefixLines(note.quote.trim(), '  ', ''));
    if (note.text.trim() !== '') lines.push('Note:', prefixLines(note.text.trim(), '  ', ''));
    const sourceUrl = extraSourceUrl(record, note);
    if (sourceUrl !== null) lines.push('At: ' + sourceUrl);
    blocks.push(lines.join('\n'));
  });
  return blocks.join('\n\n') + '\n';
}

/**
 * @param {PageRecord} record
 * @param {'md' | 'txt'} extension
 * @returns {string}
 */
export function buildExportFileName(record, extension) {
  const slug = pageName(record)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return 'notes-' + (slug || 'page') + '.' + extension;
}
