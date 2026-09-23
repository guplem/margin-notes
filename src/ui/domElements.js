/**
 * A small helper to build DOM elements for the extension pages.
 *
 * Every piece of user text goes in through `textContent`, never `innerHTML`, so
 * a note or a selected piece of a page can never run as markup.
 */

/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @param {TagName} tagName
 * @param {{ className?: string, text?: string, attributes?: Record<string, string>, onClick?: (event: Event) => void }} [options]
 * @param {Array<Node | null>} [children]  A `null` child is skipped, which keeps optional parts inline.
 * @returns {HTMLElementTagNameMap[TagName]}
 */
export function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  if (options.className !== undefined) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) element.setAttribute(name, value);
  if (options.onClick !== undefined) element.addEventListener('click', options.onClick);
  for (const child of children) if (child !== null) element.append(child);
  return element;
}

/**
 * @param {import('../notes/noteLabels.js').NoteLabel | null} label
 * @returns {HTMLSpanElement}
 */
export function createLabelChip(label) {
  const chip = createElement('span', { className: 'label-chip', text: label?.name ?? 'Note' });
  if (label !== null) chip.style.setProperty('--label-color', label.color);
  return chip;
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export function requireElement(id) {
  const element = document.getElementById(id);
  if (element === null) throw new Error('[Margin Notes] missing element #' + id);
  return element;
}
