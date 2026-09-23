/**
 * Background service worker. It owns the three ways into the extension:
 *
 * - The right-click menu item on selected text opens the note dialog in a small
 *   popup window. A popup window works on every page, local files and PDFs
 *   included, because nothing is injected into the page.
 * - The keyboard shortcut opens the same dialog. Chrome gives a shortcut no
 *   selection, so it reads `getSelection()` once in the tab, and falls back to a
 *   note about the whole page where Chrome allows no script (a PDF, for one).
 * - The toolbar button opens the notes page, on the folder of the current tab.
 */

import { toPageKey } from '../pageAddress/pageKey.js';
import {
  ADD_NOTE_COMMAND,
  buildNoteDraft,
  centerDialogOver,
  NOTE_DRAFT_KEY_PREFIX,
  pickFrameSelection,
} from '../notes/noteDraft.js';

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

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== ADD_NOTE_COMMAND) return;
  void openNoteDialogFromShortcut(tab).catch((error) => console.error('[Margin Notes] could not open the note dialog', error));
});

chrome.action.onClicked.addListener((tab) => {
  void openNotesPage(tab.url).catch((error) => console.error('[Margin Notes] could not open the notes page', error));
});

/**
 * @param {chrome.tabs.Tab | undefined} tab  Chrome passes the active tab; the query covers the case where it does not.
 * @returns {Promise<void>}
 */
async function openNoteDialogFromShortcut(tab) {
  const activeTab = tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (activeTab?.id === undefined) return;
  const selectionText = await readSelection(activeTab.id);
  await openNoteDialog({ selectionText, pageUrl: activeTab.url ?? '' }, activeTab);
}

/**
 * Runs once in the tab, which the shortcut grants through `activeTab`. It reads the
 * selection and leaves nothing behind in the page.
 * @param {number} tabId
 * @returns {Promise<string>} Empty when Chrome allows no script there, or when nothing is selected.
 */
async function readSelection(tabId) {
  /** @returns {string} */
  const readPageSelection = () => getSelection()?.toString() ?? '';
  try {
    return pickFrameSelection(
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: readPageSelection }),
    );
  } catch {
    // A frame from another site can refuse the script, so ask the top frame alone before giving up.
    try {
      return pickFrameSelection(await chrome.scripting.executeScript({ target: { tabId }, func: readPageSelection }));
    } catch {
      return '';
    }
  }
}

/**
 * @param {{ selectionText?: string, pageUrl?: string, frameUrl?: string }} menuInfo  From the menu, or built by the shortcut.
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
