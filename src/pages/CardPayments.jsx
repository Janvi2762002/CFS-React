import React, { useEffect, useState, useCallback, useMemo } from "react";
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

/* ── Money cell ──────────────────────────────────────────────────────────── */
function Money({ value, tone = "text.primary" }) {
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  return (
    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: tone }}>
      {fmt(value)}
    </Typography>
  );
}

export default function CardPayments() {
  const [rows,            setRows]            = useState([]);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [search,          setSearch]          = useState("");
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await AdminService.getPaymentInfo();
      const rawArr = Array.isArray(data) ? data : data?.data || [];
      const withIds = rawArr.map((r, idx) => ({ ...r, id: r.id ?? idx + 1 }));
      setRows(withIds);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load payment data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      (r.partyName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  const handleExport = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered);
    const book  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "CardPayments");
    saveAs(new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })]), "card_payments.xlsx");
  };

  const columns = [
    { field: "partyName",    headerName: "Party Name",     flex: 1.2, minWidth: 160 },
    { field: "swipeCount",   headerName: "Swipes",         width: 90,  align: "center", headerAlign: "center" },
    { field: "amount",       headerName: "Swipe Volume",   width: 135, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "profit",       headerName: "Net Profit",     width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "creditAmount", headerName: "Credit Used",    width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="warning.main" /> },
    { field: "totalAmount",  headerName: "Net Payable",    width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="primary.main" /> },
    { field: "outletName",   headerName: "Outlet",         width: 130,
      renderCell: (p) => p.value || "—" },
    { field: "cards",        headerName: "Cards Used",     flex: 1,   minWidth: 140 },
    {
      field: "paymentStatus", headerName: "Status", width: 110,
      renderCell: (p) => (
        <Chip size="small" variant="outlined"
          color={p.value === "paid" ? "success" : "warning"}
          label={p.value ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : "Pending"}
        />
      ),
    },
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
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} sx={{ whiteSpace: "nowrap" }}>
          Export Statement
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
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Export</Button>
        </Stack>
        <Divider />
        <Box sx={{ height: 580 }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            loading={loading}
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
