/**
 * Background service worker. It owns the two ways into the extension:
 *
 * - The right-click menu item on selected text opens the note dialog in a small
 *   popup window. A popup window works on every page, local files and PDFs
 *   included, because nothing is injected into the page.
 * - The toolbar button opens the notes page, on the folder of the current tab.
 */

import { toPageKey } from '../pageAddress/pageKey.js';
import { buildNoteDraft, centerDialogOver, NOTE_DRAFT_KEY_PREFIX } from '../notes/noteDraft.js';

const ADD_NOTE_MENU_ID = 'add-note-to-selection';
const NOTE_DIALOG_SIZE = { width: 460, height: 600 };
const NOTES_PAGE_PATH = 'notesPage/notesPage.html';

// Menu items survive a service worker restart, so they are created once per install or update.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: ADD_NOTE_MENU_ID, title: 'Add note to "%s"', contexts: ['selection'] });
  });
});

chrome.contextMenus.onClicked.addListener((menuInfo, tab) => {
  if (menuInfo.menuItemId !== ADD_NOTE_MENU_ID) return;
  void openNoteDialog(menuInfo, tab).catch((error) => console.error('[Margin Notes] could not open the note dialog', error));
});

chrome.action.onClicked.addListener((tab) => {
  void openNotesPage(tab.url).catch((error) => console.error('[Margin Notes] could not open the notes page', error));
});

/**
 * @param {chrome.contextMenus.OnClickData} menuInfo
 * @param {chrome.tabs.Tab | undefined} tab
 * @returns {Promise<void>}
 */
async function openNoteDialog(menuInfo, tab) {
  const draft = buildNoteDraft(menuInfo, tab);
  if (draft === null) return;
  const draftId = crypto.randomUUID();
  await chrome.storage.session.set({ [NOTE_DRAFT_KEY_PREFIX + draftId]: draft });

  /** @type {chrome.windows.Window | undefined} */
  let browserWindow;
  if (tab !== undefined && tab.windowId >= 0) {
    browserWindow = await chrome.windows.get(tab.windowId).catch(() => undefined);
  }
  const url = chrome.runtime.getURL('noteDialog/noteDialog.html?draft=' + encodeURIComponent(draftId));
  const bounds = centerDialogOver(browserWindow, NOTE_DIALOG_SIZE);
  try {
    await chrome.windows.create({ url, type: 'popup', focused: true, ...bounds });
  } catch {
    // Chrome refuses a window that would sit mostly off screen, for example over a browser window
    // that is partly off screen. Let Chrome pick the position instead.
    await chrome.windows.create({ url, type: 'popup', focused: true, width: bounds.width, height: bounds.height });
  }
}

/**
 * Reuses an open notes page instead of stacking a new tab on every click.
 * @param {string | undefined} currentTabUrl  Readable because a toolbar click grants `activeTab`.
 * @returns {Promise<void>}
 */
async function openNotesPage(currentTabUrl) {
  const baseUrl = chrome.runtime.getURL(NOTES_PAGE_PATH);
  // A click while an extension page is in front has no page of its own to open.
  const isReadablePage = currentTabUrl !== undefined && !currentTabUrl.startsWith(chrome.runtime.getURL(''));
  const url = isReadablePage ? baseUrl + '?page=' + encodeURIComponent(toPageKey(currentTabUrl)) : baseUrl;

  // A note dialog is a tab context too, so match the notes page by its address.
  const openContexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] });
  const openPage = openContexts.find((context) => context.documentUrl?.startsWith(baseUrl) && context.tabId >= 0);
  if (openPage !== undefined) {
    // An update with the same address still reloads the tab, which throws away an open edit.
    const addressChanged = openPage.documentUrl !== url && isReadablePage;
    await chrome.tabs.update(openPage.tabId, addressChanged ? { url, active: true } : { active: true });
    await chrome.windows.update(openPage.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url });
}
