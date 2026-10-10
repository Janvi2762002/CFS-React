import React, { useEffect, useState, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography, Box, TextField, Button, IconButton,
  Stack, Chip, InputAdornment, Paper, Divider, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";
import { paginationDisplayedRows } from "../components/gridPagination";
import { formatGridDate } from "../components/gridDate";
import { DEFAULT_PAGE_SIZE } from "../services/paginate";

/* ── Money cell ──────────────────────────────────────────────────────────── */
/* A null amount renders as a dash: printing ₹0 would claim a value the API
   never sent. */
function Money({ value, tone = "text.primary" }) {
  if (value == null || value === "") {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  return (
    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: tone }}>
      ₹{Number(value).toLocaleString("en-IN")}
    </Typography>
  );
}

/* Spreadsheet columns, in grid order, keyed by the PaymentInfo field names. */
const EXPORT_COLUMNS = [
  ["date", "Date"], ["partyName", "Party Name"], ["swipeCount", "Swipes"],
  ["swipeAmount", "Swipe Amount"], ["totalAmount", "Total Amount"],
  ["profit", "Profit"], ["totalProfit", "Total Profit"], ["cardName", "Card"],
  ["merchant", "Merchant"], ["swipePerson", "Swipe Person"],
  ["limitUsed", "Status"], ["remarks", "Remarks"],
];

export default function CardPayments() {
  const [rows,            setRows]            = useState([]);
  const [rowCount,        setRowCount]        = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [search,          setSearch]          = useState("");
  const [partyFilter,     setPartyFilter]     = useState("");
  const [loading,         setLoading]         = useState(true);
  const [exporting,       setExporting]       = useState(false);
  const [error,           setError]           = useState("");

  /* The API filters by party server-side, so wait for typing to settle
     before querying, and restart from the first page of the new result. */
  useEffect(() => {
    const t = setTimeout(() => {
      setPartyFilter(search.trim());
      setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, total } = await AdminService.getPaymentInfo({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        partyName: partyFilter,
      });
      const withIds = (data || []).map((r, idx) => ({ ...r, id: r.id ?? `row-${idx}` }));
      setRows(withIds);
      setRowCount(total || 0);
    } catch (e) {
      setRows([]);
      setRowCount(0);
      setError(e?.message || "Could not load payment data.");
    } finally { setLoading(false); }
  }, [paginationModel, partyFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* The statement covers every matching row, not just the page on screen. */
  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const all = await AdminService.getAllPaymentInfo({ partyName: partyFilter });
      const sheetRows = all.map((r) => Object.fromEntries(EXPORT_COLUMNS.map(([key, label]) => [
        label,
        key === "date" ? (r.date ? r.date.split("T")[0] : "") :
        key === "limitUsed" ? (r.limitUsed ? "Used" : "Pending") :
        r[key] ?? "",
      ])));
      const sheet = XLSX.utils.json_to_sheet(sheetRows);
      const book  = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "CardPayments");
      saveAs(new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })]), "card_payments.xlsx");
    } catch (e) {
      setError(e?.message || "Could not export the statement.");
    } finally { setExporting(false); }
  };

  const columns = [
    { field: "date",         headerName: "Date",           width: 120, valueFormatter: (v) => formatGridDate(v) },
    { field: "partyName",    headerName: "Party Name",     flex: 1.2, minWidth: 160,
      renderCell: (p) => p.value || "—" },
    { field: "swipeCount",   headerName: "Swipes",         width: 90,  align: "center", headerAlign: "center" },
    { field: "swipeAmount",  headerName: "Swipe Amount",   width: 135, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "totalAmount",  headerName: "Total Amount",   width: 135, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="primary.main" /> },
    { field: "profit",       headerName: "Profit",         width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "totalProfit",  headerName: "Total Profit",   width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "cardName",     headerName: "Card",           flex: 1,   minWidth: 140,
      renderCell: (p) => p.value || "—" },
    { field: "merchant",     headerName: "Merchant",       width: 130, renderCell: (p) => p.value || "—" },
    { field: "swipePerson",  headerName: "Swipe Person",   width: 130, renderCell: (p) => p.value || "—" },
    {
      field: "limitUsed", headerName: "Status", width: 110,
      renderCell: (p) => (
        <Chip size="small" variant="outlined"
          color={p.value ? "success" : "warning"}
          label={p.value ? "Used" : "Pending"}
        />
      ),
    },
    { field: "remarks",      headerName: "Remarks",        flex: 1,   minWidth: 140,
      renderCell: (p) => p.value || "—" },
  ];

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Card Payments</Typography>
          <Typography variant="body2" color="text.secondary">
            Party-wise payment summaries, profit settlements and balance statements.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}
          disabled={exporting} sx={{ whiteSpace: "nowrap" }}>
          {exporting ? "Exporting…" : "Export Statement"}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting}>Export</Button>
        </Stack>
        <Divider />
        <Box sx={{ height: 580 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No party payment records found.",
              paginationDisplayedRows: paginationDisplayedRows(paginationModel),
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
