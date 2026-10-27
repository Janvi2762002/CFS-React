import React from "react";
import { Box, IconButton, MenuItem, Pagination, Select, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  useGridApiContext, useGridRootProps, useGridSelector,
  gridPaginationModelSelector, gridPaginationRowCountSelector, gridPageCountSelector,
} from "@mui/x-data-grid";
import { PAGE_SIZE_OPTIONS } from "../common/usePaginationModel";

const fmt = (n) => n.toLocaleString("en-IN");
const itemCount = (n) => `${fmt(n)} ${n === 1 ? "item" : "items"}`;

/* Brings the grid's header back into view after a page change, but only when
   it has scrolled up out of sight: a grid already on screen stays put. The
   grid root's scroll-margin (theme) keeps it clear of the sticky topbar. */
function scrollGridIntoView(el) {
  if (!el) return;
  const margin = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
  if (el.getBoundingClientRect().top >= margin) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
}

/**
 * Footer pager shared by every DataGrid, plugged in through `slots.pagination`
 * (spread `gridPagerProps` onto the grid). It reads the grid's own pagination
 * state, so it works the same in client and server pagination mode.
 */
export default function GridPager() {
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  const { page: rawPage, pageSize } = useGridSelector(apiRef, gridPaginationModelSelector);
  const rowCount = useGridSelector(apiRef, gridPaginationRowCountSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);

  // -1 means the server has not said how many rows there are.
  const unknownTotal = rowCount === -1;
  const lastPage = Math.max(0, pageCount - 1);
  const page = unknownTotal ? rawPage : Math.min(rawPage, lastPage);
  const singlePage = !unknownTotal && pageCount <= 1;
  const disabled = unknownTotal && rootProps.paginationMode === "server" && rootProps.loading;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, rowCount);
  const countLabel = unknownTotal
    ? `Page ${fmt(page + 1)}`
    : singlePage
      ? itemCount(rowCount)
      : `${isPhone ? "" : "Showing "}${fmt(from)}–${fmt(to)} of ${fmt(rowCount)}`;

  /* The grid's own options, falling back to the app default; the current
     size is always listed so the select never holds an unknown value. */
  const sizes = (rootProps.pageSizeOptions?.length ? rootProps.pageSizeOptions : PAGE_SIZE_OPTIONS)
    .map((o) => (typeof o === "number" ? o : o.value));
  if (!sizes.includes(pageSize)) sizes.push(pageSize);

  const goTo = (p) => {
    if (p === page) return;
    apiRef.current.setPage(p);
    scrollGridIntoView(apiRef.current.rootElementRef?.current);
  };

  // A new page size starts again from the first page.
  const changePageSize = (size) => {
    if (size === pageSize) return;
    apiRef.current.setPaginationModel({ page: 0, pageSize: size });
    scrollGridIntoView(apiRef.current.rootElementRef?.current);
  };

  const countText = (
    <Typography variant="body2" color="text.secondary" className="tabular-nums" noWrap>
      {countLabel}
    </Typography>
  );

  const sizeSelect = (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" color="text.secondary">Rows</Typography>
      <Select
        size="small"
        value={pageSize}
        onChange={(e) => changePageSize(Number(e.target.value))}
        disabled={disabled}
        inputProps={{ "aria-label": "Rows per page" }}
        sx={{ fontSize: "0.8125rem", "& .MuiSelect-select": { py: 0.5 } }}
      >
        {sizes.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
      </Select>
    </Stack>
  );

  /* Unknown total: previous / next only, never an invented page count. The
     next button stays enabled because there may always be another page. */
  const prevNext = (label) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <IconButton size="small" aria-label="Previous page" disabled={disabled || page === 0} onClick={() => goTo(page - 1)}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      {label}
      <IconButton
        size="small" aria-label="Next page"
        disabled={disabled || (!unknownTotal && page >= lastPage)}
        onClick={() => goTo(page + 1)}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );

  if (isPhone) {
    return (
      <Stack spacing={1} alignItems="center" sx={{ width: "100%", py: 1, px: 2 }}>
        {!singlePage && prevNext(
          <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, minWidth: 64, textAlign: "center" }}>
            {unknownTotal ? `Page ${fmt(page + 1)}` : `${fmt(page + 1)} / ${fmt(pageCount)}`}
          </Typography>
        )}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          {!unknownTotal && countText}
          {sizeSelect}
        </Stack>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 2,
        py: 1,
        px: 2,
      }}
    >
      {countText}
      <Box>
        {unknownTotal ? prevNext(null) : !singlePage && (
          <Pagination
            count={pageCount}
            page={page + 1}
            onChange={(_, p) => goTo(p - 1)}
            shape="rounded"
            color="primary"
            size="small"
            siblingCount={1}
            boundaryCount={1}
            disabled={disabled}
          />
        )}
      </Box>
      <Box sx={{ justifySelf: "end" }}>{sizeSelect}</Box>
    </Box>
  );
}

/** Spread onto a DataGrid to use the shared pager and page sizes. */
export const gridPagerProps = {
  slots: { pagination: GridPager },
  pageSizeOptions: PAGE_SIZE_OPTIONS,
};
