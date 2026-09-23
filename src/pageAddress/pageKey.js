/**
 * All knowledge of how a page address becomes a folder lives here.
 *
 * A folder is one page, not one site: `google.com/a` and `google.com/b` are two
 * folders. The query (`?...`) and the hash (`#...`) are dropped, because they
 * usually point at the same document (tracking tags, a scroll position).
 */

/**
 * @param {string} url
 * @returns {string} The address without its query and hash, and without a trailing slash except at the site root.
 */
export function toPageKey(url) {
  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
  parsed.search = '';
  parsed.hash = '';
  const key = parsed.href;
  // `href` always ends a bare origin with "/", so only a longer path loses its slash.
  return parsed.pathname.length > 1 && key.endsWith('/') ? key.slice(0, -1) : key;
}

/**
 * A short, readable form of a page key for the folder list and the exports.
 * @param {string} pageKey
 * @returns {string}
 */
export function describePageKey(pageKey) {
  if (pageKey.startsWith('file:///')) {
    const path = safeDecode(pageKey.slice('file://'.length));
    // A Windows path arrives as "/C:/...". Drop the slash so it reads the way Windows shows it.
    return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
  }
  const withoutProtocol = pageKey.replace(/^https?:\/\//, '');
  return safeDecode(withoutProtocol.endsWith('/') ? withoutProtocol.slice(0, -1) : withoutProtocol);
}

/**
 * @param {string} text
 * @returns {string}
 */
function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
