import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "../services/paginate";

/** Page sizes offered by every grid's footer. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const storageKey = (gridKey) => `cfs.pageSize.${gridKey}`;

/* Storage can be missing or throw (private mode, blocked site data), so every
   access falls back to the default instead of breaking the page. */
function readPageSize(gridKey) {
  try {
    const stored = Number(window.localStorage.getItem(storageKey(gridKey)));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function writePageSize(gridKey, pageSize) {
  try {
    window.localStorage.setItem(storageKey(gridKey), String(pageSize));
  } catch {
    /* Not remembered this time; the grid still works. */
  }
}

/**
 * A grid's `paginationModel` state that remembers its page size per grid.
 * Returns the same `[model, setModel]` pair as `useState`, so updater
 * functions keep working.
 *
 * @param {string} gridKey  e.g. "stockItems" → `cfs.pageSize.stockItems`
 */
export default function usePaginationModel(gridKey) {
  const [model, setModel] = useState(() => ({ page: 0, pageSize: readPageSize(gridKey) }));

  useEffect(() => { writePageSize(gridKey, model.pageSize); }, [gridKey, model.pageSize]);

  return [model, setModel];
}
