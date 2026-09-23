import React, { useEffect, useState, useRef, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography, Box, TextField, Button, CircularProgress, IconButton,
  Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, FormControlLabel,
  useMediaQuery, Stack, Chip, InputAdornment, Tooltip, Paper, Divider,
  MenuItem, Grid, Alert,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import UploadIcon from "@mui/icons-material/FileUploadOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";
import { useAuth } from "../common/AuthContext";

const STATUS_FILTERS = [
  { id: "all",     label: "All statuses" },
  { id: "used",    label: "Limit used" },
  { id: "pending", label: "Pending" },
];

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function Transactions() {
  const { userRole } = useAuth();
  const canEdit = userRole === "master" || userRole === "admin";

  const [rows,         setRows]         = useState([]);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [open,         setOpen]         = useState(false);
  const [isEditing,    setIsEditing]    = useState(false);
  const [formData,     setFormData]     = useState({});
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const fileInputRef = useRef();
  const isMobile = useMediaQuery("(max-width:768px)");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await AdminService.getCardInfo());
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load card swipes.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpen = (row = null) => {
    if (row) { setFormData(row); setIsEditing(true); }
    else {
      setFormData({ date: "", partyName: "", cardName: "", cardNumber: "", bankName: "", deduction: "", pos: "", remarks: "", limitUsed: false, additionalInfo: "" });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /* createdat / updatedat are server-managed, so they are not sent. */
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.saveCard(formData);
      setOpen(false);
      await fetchData();
    } catch (e) {
      setError(e?.message || "Could not create the swipe entry.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.updateCard(formData.id, formData);
      setOpen(false);
      await fetchData();
    } catch (e) {
      setError(e?.message || "Could not update the swipe entry.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this swipe transaction record?")) return;
    setError("");
    try {
      await AdminService.deleteCard(id);
      setRows((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      setError(e?.message || "Could not delete the swipe entry.");
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const filteredRows = useMemo(() =>
    rows.filter((r) => {
      const matchesSearch =
        (r.partyName || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.cardNumber || "").toString().includes(search) ||
        (r.bankName || "").toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ? true :
        filterStatus === "used" ? Boolean(r.limitUsed) :
        filterStatus === "pending" ? !r.limitUsed : true;

      return matchesSearch && matchesFilter;
    }), [rows, search, filterStatus]);

  /* Export / Import */
  const handleExport = () => {
    const sheet = XLSX.utils.json_to_sheet(filteredRows);
    const book  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "CardSwipes");
    saveAs(new Blob([XLSX.write(book, { bookType: "xlsx", type: "array" })]), "card_swipes.xlsx");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const valid = data.filter((r) => r.cardName && r.cardNumber);

      let failed = 0;
      for (const row of valid) {
        try { await AdminService.saveCard(row); } catch { failed += 1; }
      }
      if (failed) setError(`${failed} of ${valid.length} imported rows could not be saved.`);
      await fetchData();
    };
    e.target.value = "";   // let the same file be picked again
    reader.readAsArrayBuffer(file);
  };

  const columns = [
    { field: "date", headerName: "Date", width: 120, valueFormatter: (v) => formatDate(v) },
    { field: "partyName", headerName: "Party Name", flex: 1.2, minWidth: 150,
      renderCell: (p) => p.value || "—" },
    { field: "cardName", headerName: "Card Name", flex: 1.1, minWidth: 140,
      renderCell: (p) => (
        <Stack justifyContent="center" sx={{ height: "100%" }}>
          <Typography variant="body2" noWrap>{p.value || "—"}</Typography>
          {p.row.cardNumber && (
            <Typography variant="caption" color="text.secondary" noWrap>
              ···· {String(p.row.cardNumber).slice(-4)}
            </Typography>
          )}
        </Stack>
      ),
    },
    { field: "bankName", headerName: "Bank", width: 130 },
    { field: "deduction", headerName: "Amount", width: 130, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: "success.main" }}>
          {fmt(p.value)}
        </Typography>
      ),
    },
    { field: "pos", headerName: "POS Outlet", width: 130 },
    {
      field: "limitUsed", headerName: "Status", width: 120,
      renderCell: (p) => (
        <Chip
          size="small"
          variant="outlined"
          color={p.value ? "success" : "warning"}
          label={p.value ? "Used" : "Pending"}
        />
      ),
    },
    ...(canEdit ? [{
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit record">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><Edit fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete record">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}><Delete fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      ),
    }] : []),
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
          <Typography variant="h5" gutterBottom>Card Swipes</Typography>
          <Typography variant="body2" color="text.secondary">
            Swipe transaction register.
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
            Add Swipe Entry
          </Button>
        )}
      </Stack>

      {/* ── Filters & Data Table ────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          sx={{ p: 2 }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party, card or bank"
            sx={{ minWidth: { sm: 260 }, flexGrow: 1 }}
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

          <TextField
            select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {STATUS_FILTERS.map((f) => (
              <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
              Export
            </Button>
            {canEdit && (
              <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
                Import
              </Button>
            )}
            <input type="file" accept=".xlsx,.xls" ref={fileInputRef} style={{ display: "none" }} onChange={handleImport} />
          </Stack>
        </Stack>

        <Divider />

        {loading ? (
          <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 580 }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              localeText={{ noRowsLabel: "No card swipes match your filters." }}
              rowHeight={56}
            />
          </Box>
        )}
      </Paper>

      {/* ── Add / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Card Swipe Entry" : "New Card Swipe Entry"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Transaction Date" name="date" type="datetime-local" fullWidth
                value={formData.date ? new Date(formData.date).toISOString().slice(0, 16) : ""}
                onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Party Name" name="partyName" fullWidth
                value={formData.partyName || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Card Name" name="cardName" required fullWidth placeholder="e.g. HDFC Regalia"
                value={formData.cardName || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Card Number" name="cardNumber" required fullWidth
                value={formData.cardNumber || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Name" name="bankName" fullWidth placeholder="e.g. ICICI Bank"
                value={formData.bankName || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Amount (₹)" name="deduction" type="number" fullWidth
                value={formData.deduction || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="POS / Outlet" name="pos" fullWidth
                value={formData.pos || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Additional Info" name="additionalInfo" fullWidth
                value={formData.additionalInfo || ""} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <TextField label="Remarks" name="remarks" fullWidth multiline minRows={2}
                value={formData.remarks || ""} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(formData.limitUsed)}
                    onChange={(e) => setFormData({ ...formData, limitUsed: e.target.checked })}
                  />
                }
                label="Limit used / settled"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving || !formData.cardName || !formData.cardNumber}
            onClick={isEditing ? handleUpdate : handleSave}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Swipe"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
