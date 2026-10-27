import React, { useEffect, useState, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography, Box, TextField, Button, IconButton, MenuItem, Tooltip,
  Stack, Chip, InputAdornment, Paper, Divider, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import PaidIcon from "@mui/icons-material/TaskAltOutlined";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";
import { isConflict } from "../services/apiClient";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../common/AuthContext";
import { formatGridDate } from "../components/gridDate";
import usePaginationModel from "../common/usePaginationModel";
import { gridPagerProps } from "../components/GridPager";

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

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/* The API's payment statuses; anything else is a 400. */
const STATUS_FILTERS = [
  { id: "all",     label: "All statuses" },
  { id: "Pending", label: "Pending" },
  { id: "Paid",    label: "Paid" },
];

/* Spreadsheet columns, in grid order, keyed by the PaymentInfo field names. */
const EXPORT_COLUMNS = [
  ["date", "Date"], ["partyName", "Party Name"], ["swipeCount", "Swipes"],
  ["totalAmount", "Total Amount"], ["paidAmount", "Paid"], ["pendingAmount", "Pending"],
  ["paymentStatus", "Status"], ["lastPaidAt", "Last Paid On"], ["lastPaidByUsername", "Last Paid By"],
  ["swipeAmount", "Swipe Amount"], ["profit", "Profit"], ["totalProfit", "Total Profit"],
  ["cardName", "Card"], ["merchant", "Merchant"], ["swipePerson", "Swipe Person"],
  ["remarks", "Remarks"],
];

export default function CardPayments() {
  const { userRole } = useAuth();
  // The API refuses mark-paid for normal users (403).
  const canSettle = userRole === "master" || userRole === "admin";

  const [rows,            setRows]            = useState([]);
  const [rowCount,        setRowCount]        = useState(0);
  const [paginationModel, setPaginationModel] = usePaginationModel("cardPayments");
  const [search,          setSearch]          = useState("");
  const [partyFilter,     setPartyFilter]     = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [loading,         setLoading]         = useState(true);
  const [exporting,       setExporting]       = useState(false);
  const [error,           setError]           = useState("");
  const [notice,          setNotice]          = useState("");
  const [confirm,         setConfirm]         = useState({ open: false, row: null });

  /* The API filters by party server-side, so wait for typing to settle
     before querying, and restart from the first page of the new result. */
  useEffect(() => {
    const t = setTimeout(() => {
      setPartyFilter(search.trim());
      setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search, setPaginationModel]);

  /* Status is filtered by the API too, so a new one starts from page one. */
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, total } = await AdminService.getPaymentInfo({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        partyName: partyFilter,
        status: statusFilter,
      });
      const withIds = (data || []).map((r, idx) => ({ ...r, id: r.id ?? `row-${idx}` }));
      setRows(withIds);
      setRowCount(total || 0);
    } catch (e) {
      setRows([]);
      setRowCount(0);
      setError(e?.message || "Could not load payment data.");
    } finally { setLoading(false); }
  }, [paginationModel, partyFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkPaidConfirmed = async () => {
    const { row } = confirm;
    if (!row) return;
    setError("");
    setNotice("");
    try {
      await AdminService.markPartyPaid(row.id);
      setNotice(`Marked ${inr(row.pendingAmount)} for ${row.partyName || "this party"} as paid.`);
    } catch (e) {
      setError(isConflict(e)
        ? `${row.partyName || "This party"} has nothing pending to mark as paid. The list has been refreshed.`
        : e?.message || "Could not mark the payment as paid.");
    }
    fetchData();
  };

  /* The statement covers every matching row, not just the page on screen. */
  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const all = await AdminService.getAllPaymentInfo({ partyName: partyFilter, status: statusFilter });
      const sheetRows = all.map((r) => Object.fromEntries(EXPORT_COLUMNS.map(([key, label]) => [
        label,
        key === "date" || key === "lastPaidAt" ? (r[key] ? r[key].split("T")[0] : "") :
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
    { field: "partyName",    headerName: "Party Name",     flex: 1.2, minWidth: 160,
      renderCell: (p) => p.value || "—" },
    { field: "swipeCount",   headerName: "Swipes",         width: 80,  align: "center", headerAlign: "center" },
    { field: "totalAmount",  headerName: "Total Amount",   width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="primary.main" /> },
    { field: "paidAmount",   headerName: "Paid",           width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "pendingAmount", headerName: "Pending",       width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone={p.value > 0 ? "warning.dark" : "text.secondary"} /> },
    {
      field: "paymentStatus", headerName: "Status", width: 105,
      renderCell: (p) => (
        <Chip size="small" variant="outlined"
          color={p.value === "Paid" ? "success" : "warning"}
          label={p.value || "—"}
        />
      ),
    },
    {
      field: "lastPaidAt", headerName: "Last Paid", width: 140,
      renderCell: (p) => p.value ? (
        <Stack justifyContent="center" sx={{ height: "100%" }}>
          <Typography variant="body2">{formatGridDate(p.value)}</Typography>
          {p.row.lastPaidByUsername && (
            <Typography variant="caption" color="text.secondary" noWrap>by {p.row.lastPaidByUsername}</Typography>
          )}
        </Stack>
      ) : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    { field: "totalProfit",  headerName: "Total Profit",   width: 125, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "date",         headerName: "Date",           width: 115, valueFormatter: (v) => formatGridDate(v) },
    { field: "swipeAmount",  headerName: "Swipe Amount",   width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "profit",       headerName: "Profit",         width: 115, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "cardName",     headerName: "Card",           flex: 1,   minWidth: 140,
      renderCell: (p) => p.value || "—" },
    { field: "merchant",     headerName: "Merchant",       width: 130, renderCell: (p) => p.value || "—" },
    { field: "swipePerson",  headerName: "Swipe Person",   width: 130, renderCell: (p) => p.value || "—" },
    { field: "remarks",      headerName: "Remarks",        flex: 1,   minWidth: 140,
      renderCell: (p) => p.value || "—" },
    ...(canSettle ? [{
      field: "actions", headerName: "Action", width: 120, sortable: false, filterable: false,
      align: "right", headerAlign: "right",
      /* Only a party with something pending can be marked paid; the rest
         say so rather than leaving the cell blank. */
      renderCell: (p) => p.row.pendingAmount > 0 ? (
        <Tooltip title={`Settle ${inr(p.row.pendingAmount)} pending for this party`}>
          <Button size="small" variant="outlined" color="success" startIcon={<PaidIcon fontSize="small" />}
            onClick={() => setConfirm({ open: true, row: p.row })}
            sx={{ py: 0.25, px: 1, minWidth: 0, whiteSpace: "nowrap" }}>
            Mark paid
          </Button>
        </Tooltip>
      ) : (
        <Typography variant="body2" color="text.secondary">All paid</Typography>
      ),
    }] : []),
  ];

  const confirmRow = confirm.row;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Card Payments</Typography>
          <Typography variant="body2" color="text.secondary">
            What each party has been paid for their swipes, and what is still pending.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}
          disabled={exporting} sx={{ whiteSpace: "nowrap" }}>
          {exporting ? "Exporting…" : "Export Statement"}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "clip" }}>
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
          <TextField select label="Status" value={statusFilter} onChange={handleStatusFilter} sx={{ minWidth: 160 }}>
            {STATUS_FILTERS.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
          </TextField>
        </Stack>
        <Divider />
        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            {...gridPagerProps}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No party payment records found.",
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      <ConfirmDialog
        open={confirm.open}
        severity="success"
        title="Mark as paid?"
        message={confirmRow
          ? `Mark ${inr(confirmRow.pendingAmount)} pending for ${confirmRow.partyName || "this party"} as paid? ` +
            "This settles all of their unsettled swipes, which can then no longer be edited or deleted."
          : ""}
        confirmLabel="Mark Paid"
        onConfirm={handleMarkPaidConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
