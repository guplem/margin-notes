/**
 * The draft that travels from the right-click menu to the note dialog, and
 * where the dialog window opens. Pure logic, no `chrome.*`.
 *
 * The service worker writes the draft to `chrome.storage.session` and the
 * dialog reads it back, so the selected text never goes into a window address.
 */

/**
 * @typedef {object} NoteDraft
 * @property {string} quote      The selected text, trimmed.
 * @property {string} pageUrl    The full address of the page, hash included.
 * @property {string} pageTitle  The tab title, or empty when Chrome gave none.
 */

/**
 * @typedef {object} WindowBounds
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

export const NOTE_DRAFT_KEY_PREFIX = 'noteDraft:';

/**
 * @param {{ selectionText?: string, pageUrl?: string, frameUrl?: string }} menuInfo  From `contextMenus.onClicked`.
 * @param {{ title?: string, url?: string } | undefined} tab
 * @returns {NoteDraft | null} `null` when there is no address to file the note under.
 */
export function buildNoteDraft(menuInfo, tab) {
  // Chrome marks `pageUrl` as optional (it can be empty in some frames), so fall back to the frame, then the tab.
  const pageUrl = menuInfo.pageUrl || menuInfo.frameUrl || tab?.url || '';
  if (pageUrl === '') return null;
  return { quote: (menuInfo.selectionText ?? '').trim(), pageUrl, pageTitle: tab?.title ?? '' };
}

/**
 * @param {unknown} stored
 * @returns {NoteDraft | null}
 */
export function normalizeNoteDraft(stored) {
  if (stored === null || typeof stored !== 'object') return null;
  const raw = /** @type {Record<string, unknown>} */ (stored);
  if (typeof raw['pageUrl'] !== 'string' || raw['pageUrl'] === '') return null;
  return {
    quote: typeof raw['quote'] === 'string' ? raw['quote'] : '',
    pageUrl: raw['pageUrl'],
    pageTitle: typeof raw['pageTitle'] === 'string' ? raw['pageTitle'] : '',
  };
}

/**
 * @param {Partial<WindowBounds> | undefined} parent  The browser window, when Chrome reports its bounds.
 * @param {{ width: number, height: number }} size
 * @returns {WindowBounds}
 */
export function centerDialogOver(parent, size) {
  const { left, top, width, height } = parent ?? {};
  if (left === undefined || top === undefined || width === undefined || height === undefined) {
    return { left: 100, top: 100, ...size };
  }
  return {
    left: Math.round(left + (width - size.width) / 2),
    top: Math.round(top + (height - size.height) / 2),
    ...size,
  };
}
