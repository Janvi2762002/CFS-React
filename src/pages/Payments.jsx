import React, { useEffect, useState, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box, Typography, TextField, CircularProgress, Button, Stack, Chip,
  InputAdornment, IconButton, Paper, Divider, Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";

/* Currency cell — `tone` carries the meaning of the column. */
function Money({ value, tone = "text.primary" }) {
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  return (
    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: tone }}>
      {fmt(value)}
    </Typography>
  );
}

export default function Payments() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await AdminService.getCardInfo();

      const groups = {};
      list.forEach((t) => {
        if (!groups[t.partyName]) groups[t.partyName] = [];
        groups[t.partyName].push(t);
      });

      const summaryRows = Object.keys(groups).map((party, idx) => {
        const txs = groups[party];
        const swipeCount   = txs.length;
        const amount       = txs.reduce((s, t) => s + (Number(t.deduction) || 0), 0);
        const profit       = swipeCount * 300;
        const creditAmount = txs.filter((t) => t.limitUsed).reduce((s, t) => s + (Number(t.creditAmount) || 0), 0);
        const totalAmount  = amount + profit - creditAmount;

        return {
          id: idx + 1,
          partyName: party,
          swipeCount,
          amount,
          profit,
          creditAmount,
          totalAmount,
          cards: [...new Set(txs.map((t) => t.cardName))].join(", "),
          outletName: [...new Set(txs.map((t) => t.pos))].join(", "),
          paymentStatus: "pending",
        };
      });
      setRows(summaryRows);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load payment data.");
    } finally { setLoading(false); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const filtered = useMemo(() =>
    rows.filter((r) => (r.partyName || "").toLowerCase().includes(search.toLowerCase())),
    [rows, search]);

  const handleExport = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered);
    const book  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Payments");
    saveAs(new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })]), "payments.xlsx");
  };

  const columns = [
    { field: "partyName", headerName: "Party Name", flex: 1.2, minWidth: 160 },
    { field: "swipeCount", headerName: "Swipes", width: 100, align: "center", headerAlign: "center" },
    { field: "amount", headerName: "Swipe Volume", width: 140, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "profit", headerName: "Net Profit", width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "creditAmount", headerName: "Credit Used", width: 135, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="warning.main" /> },
    { field: "totalAmount", headerName: "Net Payable", width: 145, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="primary.main" /> },
    { field: "cards", headerName: "Cards Utilized", flex: 1, minWidth: 150 },
    {
      field: "paymentStatus", headerName: "Status", width: 120,
      renderCell: (p) => (
        <Chip
          size="small"
          variant="outlined"
          color={p.value === "paid" ? "success" : "warning"}
          label={p.value ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : "—"}
        />
      ),
    },
  ];

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" gutterBottom>Party Payments</Typography>
          <Typography variant="body2" color="text.secondary">
            Party-wise payment summaries, profit settlements and balance statements.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} sx={{ whiteSpace: "nowrap" }}>
          Export Statement
        </Button>
      </Stack>

      {/* ── Filters & Data Table ────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
          sx={{ p: 2 }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
            Export
          </Button>
        </Stack>

        <Divider />

        {loading ? (
          <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 580 }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              pageSizeOptions={[10, 25, 50]}
              localeText={{ noRowsLabel: "No party payment records found." }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
