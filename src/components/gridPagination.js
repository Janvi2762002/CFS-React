/**
 * Footer label shared by every DataGrid in the app.
 *
 * Wired through the grid's own `localeText.paginationDisplayedRows`, which is
 * what MUI's `BasePagination` reads via `getLocaleText`. Note that
 * `slotProps.pagination` does NOT reach this label in @mui/x-data-grid v8 —
 * `GridPagination` only spreads `slotProps.basePagination` — so an override
 * placed there is silently ignored.
 *
 * `count` is the filtered row total for client-side grids and the `rowCount`
 * prop for grids in server pagination mode. It is -1 when the total is not
 * yet known, in which case the page count is omitted rather than guessed.
 *
 * @param {{ pageSize: number }} paginationModel — the grid's pagination state
 * @returns {(params: { from: number, to: number, count: number }) => string}
 */
export function paginationDisplayedRows(paginationModel) {
  return ({ from, count }) => {
    const size = paginationModel?.pageSize || 1;

    if (count === 0) return "0 items total";

    const items = `${count.toLocaleString()} ${count === 1 ? "item" : "items"}`;

    // Unknown total: report the page we are on, but never invent a page count.
    if (count < 0) return `Page ${Math.floor((from - 1) / size) + 1}`;

    const totalPages = Math.max(Math.ceil(count / size), 1);
    const currentPage = Math.min(Math.floor((from - 1) / size) + 1, totalPages);

    return `${items} · Page ${currentPage} of ${totalPages}`;
  };
}

export default paginationDisplayedRows;
