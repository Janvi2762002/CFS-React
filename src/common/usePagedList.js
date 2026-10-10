import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "../services/paginate";

/**
 * Grid data for a paged list endpoint.
 *
 * Normally the grid pages on the server: every page or page-size change asks
 * the API for exactly that window (`fetchPage`). The endpoints take no search
 * or filter parameters, though, so while `filtering` is true the full list is
 * loaded once (`fetchAll`) and the grid pages it locally, which keeps a search
 * covering every record instead of only the page on screen.
 *
 * @param {object} opts
 * @param {(p: { page: number, pageSize: number }) => Promise<{ data: any[], total: number }>} opts.fetchPage  1-indexed page
 * @param {() => Promise<any[]>} opts.fetchAll
 * @param {boolean} opts.filtering  a search or filter is active
 * @param {boolean} [opts.keepAll]  also hold the full list while not filtering (e.g. for totals)
 */
export default function usePagedList({ fetchPage, fetchAll, filtering, keepAll = false }) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [pageRows, setPageRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [allRows,  setAllRows]  = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [allLoading,  setAllLoading]  = useState(false);
  const [pageError,   setPageError]   = useState("");
  const [allError,    setAllError]    = useState("");
  const [version,  setVersion]  = useState(0); // bumped by reload()
  const pageRequest = useRef(0);
  const allRequest = useRef(0);

  const needAll = filtering || keepAll;

  /* Server window. A slower reply to an older page must not overwrite a newer one. */
  useEffect(() => {
    const request = ++pageRequest.current;
    if (filtering) { setPageLoading(false); return; }
    setPageLoading(true);
    setPageError("");
    fetchPage({ page: paginationModel.page + 1, pageSize: paginationModel.pageSize })
      .then(({ data, total }) => {
        if (request !== pageRequest.current) return;
        setPageRows(Array.isArray(data) ? data : []);
        setRowCount(total || 0);
      })
      .catch((e) => {
        if (request !== pageRequest.current) return;
        setPageRows([]);
        setRowCount(0);
        setPageError(e?.message || "Could not load the list.");
      })
      .finally(() => { if (request === pageRequest.current) setPageLoading(false); });
  }, [fetchPage, filtering, paginationModel.page, paginationModel.pageSize, version]);

  /* Full list, fetched once per reload and only when something needs it. */
  useEffect(() => {
    const request = ++allRequest.current;
    if (!needAll) { setAllLoading(false); return; }
    setAllLoading(true);
    setAllError("");
    fetchAll()
      .then((rows) => { if (request === allRequest.current) setAllRows(Array.isArray(rows) ? rows : []); })
      .catch((e) => {
        if (request !== allRequest.current) return;
        setAllRows([]);
        setAllError(e?.message || "Could not load the list.");
      })
      .finally(() => { if (request === allRequest.current) setAllLoading(false); });
  }, [fetchAll, needAll, version]);

  /* Starting or clearing a search changes which rows the pages hold. */
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  }, [filtering]);

  /** Refetch after a create, update or delete. */
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    rows: filtering ? allRows ?? [] : pageRows,
    allRows,
    /* Props to spread onto the DataGrid. rowCount only means something in
       server mode, and the grid warns if it is passed in client mode. */
    gridProps: {
      paginationMode: filtering ? "client" : "server",
      ...(filtering ? {} : { rowCount }),
      paginationModel,
      onPaginationModelChange: setPaginationModel,
    },
    /** Server-reported total while paging on the server. */
    rowCount,
    paginationModel,
    setPaginationModel,
    loading: filtering ? allLoading : pageLoading,
    error: filtering ? allError : pageError,
    /** Error from the full list while it is only held for totals. */
    allError,
    reload,
  };
}
