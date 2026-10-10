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

/** Rows per page everywhere: the grids open on it and full-list loads fetch in it. */
export const DEFAULT_PAGE_SIZE = 25;

/** How many page requests a full-list load keeps in flight at once. */
const MAX_PARALLEL_PAGES = 4;

/**
 * Query string for a 1-indexed page.
 *
 * The paging model also declares `Skip`. Where an endpoint reads its offset
 * from `Skip` rather than deriving it from `PageNumber`, leaving it out gives
 * offset 0 on every page, so page 2 comes back as page 1 again. Sending the
 * matching offset is correct either way.
 */
export function pageParams({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  return { PageNumber: page, PageSize: pageSize, Skip: (page - 1) * pageSize };
}

/**
 * Normalise a list response to { data, total, page, totalPages, next, previous }.
 *
 * Handles both server-paged endpoints and the ones that still return a bare
 * array (e.g. /CashLedger takes no paging parameters), paging those locally.
 */
export function normaliseList(raw, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const size = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

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

/**
 * Every row of a paged list endpoint, for screens that aggregate or search the
 * whole collection (Dashboard, Card Swipes, Users, pick lists).
 *
 * Calling a paged endpoint with no parameters returns only the server's
 * default first page, which silently truncates those screens. This reads
 * page 1, then fetches the remaining pages the server reports.
 *
 * @param {(params: object) => Promise<any>} fetchPage — unwrapped GET for one page
 */
export async function fetchAllPages(fetchPage, pageSize = DEFAULT_PAGE_SIZE) {
  const raw = await fetchPage(pageParams({ page: 1, pageSize }));
  if (Array.isArray(raw)) return raw; // unpaged endpoint: already everything

  const first = normaliseList(raw, 1, pageSize);
  const pages = [];
  for (let page = 2; page <= first.totalPages; page += 1) pages.push(page);

  /* Small pages mean more of them on a long list, so only a few are
     requested at a time rather than all at once. */
  const rest = new Array(pages.length);
  let next = 0;
  const worker = async () => {
    while (next < pages.length) {
      const i = next++;
      rest[i] = toArray(await fetchPage(pageParams({ page: pages[i], pageSize })));
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_PAGES, pages.length) }, worker));
  return uniqueById([first.data, ...rest].flat());
}

/**
 * Drop rows whose id was already seen. If a server ever answers a later page
 * with rows it already sent, the DataGrid would otherwise hold duplicate ids,
 * which repeats rows across pages and breaks its paging.
 */
function uniqueById(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const id = r?.id;
    if (id == null) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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
