/**
 * Optional browser script for the story map board. Load it with
 * `<script type="module" src="…/board.js">` on the page that renders the board.
 *
 * The board works without it: the filter form is a plain GET form with an
 * **Apply** button. With it, changing a filter applies it straight away and the
 * Apply button is hidden; the status filter applies when its menu closes. After
 * the page reloads, focus returns to the filter that was changed, so keyboard and
 * screen reader users keep their place. Menus close on Escape or a click elsewhere.
 * It also remembers which release lanes the viewer collapsed, and adds them to
 * the board's export links so the downloaded file matches.
 */

const focusKey = "esm-filter-focus";
const enhanced = new WeakSet<HTMLFormElement>();

function remember(name: string) {
  try {
    sessionStorage.setItem(focusKey, name);
  } catch {
    // Storage can be unavailable, such as in a private window. Focus then starts at the top.
  }
}

function restoreFocus(form: HTMLFormElement) {
  let name: string | null = null;
  try {
    name = sessionStorage.getItem(focusKey);
    sessionStorage.removeItem(focusKey);
  } catch {
    return;
  }
  const field = name ? form.elements.namedItem(name) : null;
  // The status filter is a group of checkboxes, so focus returns to its menu button.
  const target = field instanceof HTMLElement ? field : name ? form.querySelector<HTMLElement>(`[data-esm-focus="${name}"]`) : null;
  target?.focus();
}

function submit(form: HTMLFormElement, field: HTMLInputElement | HTMLSelectElement) {
  remember(field.name);
  if (typeof form.requestSubmit === "function") form.requestSubmit();
  else form.submit();
}

/** Applies the board’s filters as soon as they change. Safe to call more than once. */
export function enhanceStoryMapFilters(root: ParentNode = document) {
  for (const form of root.querySelectorAll<HTMLFormElement>("form.esm-filters")) {
    if (enhanced.has(form)) continue;
    enhanced.add(form);
    form.dataset.esmAuto = "";
    const hint = form.querySelector<HTMLElement>("[data-esm-filter-hint]");
    if (hint) hint.textContent = "The board updates as soon as you choose an option. Status choices apply when you close the status list.";
    form.addEventListener("change", event => {
      if (event.target instanceof HTMLSelectElement) submit(form, event.target);
    });
    // The Apply button is hidden, so submit the search explicitly rather than
    // relying on the browser's implicit submission.
    form.addEventListener("keydown", event => {
      const target = event.target;
      if (event.key === "Enter" && target instanceof HTMLInputElement && target.type === "search") {
        event.preventDefault();
        submit(form, target);
      }
    });
    restoreFocus(form);
  }
}

const collapsedKeyPrefix = "esm-collapsed:";
const enhancedBoards = new WeakSet<Element>();

function collapsedKey() {
  return collapsedKeyPrefix + (typeof location === "undefined" ? "" : location.pathname);
}

function readCollapsed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(collapsedKey()) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeCollapsed(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(collapsedKey(), JSON.stringify(ids));
    else localStorage.removeItem(collapsedKey());
  } catch {
    // Storage can be unavailable. Collapsing still works, but resets on reload.
  }
}

/** Sets `collapsed` on the board's export links to the lanes collapsed on that board. */
function updateExportLinks(board: Element) {
  const ids = [...board.querySelectorAll<HTMLInputElement>("input.esm-collapse-input")].filter(input => input.checked).map(input => input.value);
  for (const link of board.querySelectorAll<HTMLAnchorElement>("a[data-esm-export]")) {
    const href = link.dataset.esmExport ?? "";
    if (!ids.length) {
      link.setAttribute("href", href);
      continue;
    }
    const hash = href.indexOf("#");
    const [path, fragment] = hash === -1 ? [href, ""] : [href.slice(0, hash), href.slice(hash)];
    link.setAttribute("href", `${path}${path.includes("?") ? "&" : "?"}collapsed=${ids.map(encodeURIComponent).join(",")}${fragment}`);
  }
}

/**
 * Remembers which release lanes the viewer collapsed, per page, so they stay collapsed
 * when a filter reloads the page, and keeps the export links in step. Safe to call more than once.
 */
export function enhanceStoryMapReleases(root: ParentNode = document) {
  for (const board of root.querySelectorAll(".esm-board")) {
    if (enhancedBoards.has(board)) continue;
    enhancedBoards.add(board);
    const collapsed = new Set(readCollapsed());
    for (const input of board.querySelectorAll<HTMLInputElement>("input.esm-collapse-input")) {
      if (collapsed.has(input.value)) input.checked = true;
    }
    updateExportLinks(board);
    board.addEventListener("change", event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains("esm-collapse-input")) return;
      // Read storage again so two boards on one page do not overwrite each other.
      const ids = new Set(readCollapsed());
      if (target.checked) ids.add(target.value);
      else ids.delete(target.value);
      writeCollapsed([...ids]);
      updateExportLinks(board);
    });
  }
}

const enhancedMenus = new WeakSet<Element>();

/**
 * Closes the board's menus (the status filter and Export) on Escape or a click
 * elsewhere, and the Export menu after a choice. When the status menu closes with
 * a changed choice, it submits the filter form. Safe to call more than once.
 */
export function enhanceStoryMapMenus(root: ParentNode = document) {
  for (const menu of root.querySelectorAll<HTMLDetailsElement>("details.esm-menu")) {
    if (enhancedMenus.has(menu)) continue;
    enhancedMenus.add(menu);
    const close = (focus: boolean) => {
      if (!menu.open) return;
      menu.open = false;
      if (focus) menu.querySelector<HTMLElement>("summary")?.focus();
    };
    menu.addEventListener("keydown", event => {
      if (event.key === "Escape") close(true);
    });
    menu.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("a")) close(false);
    });
    document.addEventListener("click", event => {
      if (!(event.target instanceof Node) || !menu.contains(event.target)) close(false);
    });

    const form = menu.closest("form");
    if (!form || !menu.querySelector("input[type=checkbox]")) continue;
    let changed = false;
    menu.addEventListener("change", () => {
      changed = true;
    });
    menu.addEventListener("toggle", () => {
      if (menu.open || !changed) return;
      changed = false;
      remember("status");
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.submit();
    });
  }
}

function enhance() {
  enhanceStoryMapFilters();
  enhanceStoryMapReleases();
  enhanceStoryMapMenus();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance, { once: true });
  } else {
    enhance();
  }
}
