/**
 * Shared paging helpers for the list endpoints.
 *
 * The API's documented contract (Swagger `*PaginatedResult` + `PaginationDetail`)
 * is, inside the usual CRUD `resultObject`:
 *
 *   { items: [...],
 *     pagination: { totalCount, pageSize, currentPage, totalPages, hasNext, hasPrevious } }
 *
 * Two details that are easy to get wrong, and were:
 *   1. The query parameters are PascalCase — `PageNumber` / `PageSize`. Sending
 *      `page` / `pageSize` is silently ignored and the server returns page 1.
 *   2. The total lives at `pagination.totalCount`, not at the top level. Reading
 *      `raw.total` and falling back to `items.length` yields the *page* length,
 *      which makes any "Page X of Y" footer report a single page.
 */

/** Query string for a 1-indexed page. */
export function pageParams({ page = 1, pageSize = 25 } = {}) {
  return { PageNumber: page, PageSize: pageSize };
}

/**
 * Normalise a list response to { data, total, page, totalPages, next, previous }.
 *
 * Handles both server-paged endpoints and the ones that still return a bare
 * array (e.g. /CashLedger takes no paging parameters), paging those locally.
 */
export function normaliseList(raw, page = 1, pageSize = 25) {
  const size = pageSize > 0 ? pageSize : 25;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const items = raw.items ?? raw.data ?? raw.results ?? raw.records;

    if (Array.isArray(items)) {
      const meta = raw.pagination ?? {};
      const total = meta.totalCount ?? raw.totalCount ?? raw.total ?? raw.count ?? items.length;
      const currentPage = meta.currentPage ?? page;
      const totalPages = meta.totalPages ?? Math.max(Math.ceil(total / size), 1);

      return {
        // The server already applied the window — slicing again would drop rows.
        data: items,
        total,
        page: currentPage,
        totalPages,
        next: meta.hasNext ?? currentPage < totalPages,
        previous: meta.hasPrevious ?? currentPage > 1,
      };
    }
  }

  // Unpaged endpoint: take the window ourselves so the caller sees one shape.
  const arr = Array.isArray(raw) ? raw : [];
  const start = (page - 1) * size;

  return {
    data: arr.slice(start, start + size),
    total: arr.length,
    page,
    totalPages: Math.max(Math.ceil(arr.length / size), 1),
    next: start + size < arr.length,
    previous: page > 1,
  };
}

/** Pull just the rows out of a list response, paged or not. */
export function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const items = raw.items ?? raw.data ?? raw.results ?? raw.records;
    if (Array.isArray(items)) return items;
  }
  return [];
}
