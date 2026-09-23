import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { describePageKey, toPageKey } from '../src/pageAddress/pageKey.js';

test('drops the query and the hash', () => {
  assert.equal(toPageKey('https://example.com/blog/post?utm_source=x&page=2#comments'), 'https://example.com/blog/post');
});

test('keeps the full path, so two pages of one site are two folders', () => {
  assert.notEqual(toPageKey('https://google.com/a'), toPageKey('https://google.com/b'));
  assert.equal(toPageKey('https://google.com/docs/intro'), 'https://google.com/docs/intro');
});

test('treats a trailing slash as the same page', () => {
  assert.equal(toPageKey('https://example.com/docs/'), toPageKey('https://example.com/docs'));
});

test('keeps the slash of the site root', () => {
  assert.equal(toPageKey('https://example.com/?q=1'), 'https://example.com/');
  assert.equal(toPageKey('https://example.com'), 'https://example.com/');
});

test('lowercases the host but not the path', () => {
  assert.equal(toPageKey('https://Example.COM/Docs/Intro'), 'https://example.com/Docs/Intro');
});

test('keeps a local file as its own page', () => {
  assert.equal(toPageKey('file:///C:/Users/me/draft.html#part-2'), 'file:///C:/Users/me/draft.html');
});

test('falls back to cutting at "?" or "#" when the text is not a URL', () => {
  assert.equal(toPageKey('not a url?x=1#y'), 'not a url');
});

test('describes a web page without its protocol', () => {
  assert.equal(describePageKey('https://example.com/blog/post'), 'example.com/blog/post');
  assert.equal(describePageKey('https://example.com/'), 'example.com');
});

test('describes a local file by its decoded path', () => {
  assert.equal(describePageKey('file:///C:/My%20Drafts/draft.html'), 'C:/My Drafts/draft.html');
  assert.equal(describePageKey('file:///home/me/notes.md'), '/home/me/notes.md');
});
