import { useCallback, useEffect, useRef, useState } from "react";
import usePaginationModel from "./usePaginationModel";
import { gridPagerProps } from "../components/GridPager";

/**
 * Grid data for a paged list endpoint, with search, filters and sorting all
 * done by the server. Every page, page-size, filter or sort change asks the
 * API for exactly that window; a new filter or sort starts from page one.
 *
 * Sorting: `sortFields` maps a grid column's `field` to the API's `sortBy`
 * name. Columns missing from it can't be sorted on the server, so mark them
 * with `serverSortable(columns, sortFields)`.
 *
 * @param {object} opts
 * @param {(p: object) => Promise<{ data: any[], total: number }>} opts.fetchPage
 *   receives { page (1-indexed), pageSize, ...filters, sortBy?, sortDir? }; keep it stable
 * @param {object} [opts.filters]  the API's filter params; empty values mean "no filter"
 * @param {Record<string, string>} [opts.sortFields]  grid field → API sortBy
 * @param {{ field: string, sort: "asc" | "desc" }[]} [opts.initialSort]
 * @param {string} opts.gridKey  names the grid's remembered page size (see usePaginationModel)
 */
export default function usePagedList({ fetchPage, filters = {}, sortFields = {}, initialSort = [], gridKey }) {
  const [paginationModel, setPaginationModel] = usePaginationModel(gridKey);
  const [sortModel, setSortModel] = useState(initialSort);
  const [rows,     setRows]     = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [version,  setVersion]  = useState(0); // bumped by reload()
  const request = useRef(0);

  /* Filters arrive as a fresh object each render; compare them by value. */
  const filtersKey = JSON.stringify(filters);
  const sort = sortModel[0];
  const sortBy = sort ? sortFields[sort.field] : undefined;
  const sortDir = sortBy ? sort.sort : undefined;
  const queryKey = `${filtersKey}|${sortBy || ""}|${sortDir || ""}`;
  const lastQuery = useRef(queryKey);

  useEffect(() => {
    /* A new filter or sort starts from the first page. Moving there re-runs
       this effect, so the old page is never fetched with the new filters. */
    if (lastQuery.current !== queryKey) {
      lastQuery.current = queryKey;
      if (paginationModel.page !== 0) {
        setPaginationModel((m) => ({ ...m, page: 0 }));
        return;
      }
    }

    // A slower reply to an older request must not overwrite a newer one.
    const id = ++request.current;
    setLoading(true);
    setError("");
    fetchPage({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      ...JSON.parse(filtersKey),
      ...(sortBy ? { sortBy, sortDir } : {}),
    })
      .then(({ data, total }) => {
        if (id !== request.current) return;
        setRows(Array.isArray(data) ? data : []);
        setRowCount(total || 0);
      })
      .catch((e) => {
        if (id !== request.current) return;
        setRows([]);
        setRowCount(0);
        setError(e?.message || "Could not load the list.");
      })
      .finally(() => { if (id === request.current) setLoading(false); });
    // queryKey stands in for filtersKey, sortBy and sortDir.
  }, [fetchPage, queryKey, paginationModel.page, paginationModel.pageSize, version]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Refetch after a create, update or delete. */
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    rows,
    rowCount,
    /* Props to spread onto the DataGrid. The grid's own column filters
       would only filter the page on screen, so they stay off: the page's
       toolbar filters go to the server instead. */
    gridProps: {
      ...gridPagerProps,
      paginationMode: "server",
      sortingMode: "server",
      rowCount,
      paginationModel,
      onPaginationModelChange: setPaginationModel,
      sortModel,
      onSortModelChange: setSortModel,
      disableColumnFilter: true,
    },
    paginationModel,
    setPaginationModel,
    loading,
    error,
    reload,
  };
}

/**
 * Marks every column the API can't sort by as not sortable, so its header
 * offers no sort that would only reorder the page on screen.
 */
export function serverSortable(columns, sortFields) {
  return columns.map((c) => (c.field in sortFields ? c : { ...c, sortable: false }));
}
