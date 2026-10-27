import React, { useState, useRef, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography, Box, TextField, Button, IconButton,
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
import { isConflict } from "../services/apiClient";
import usePagedList from "../common/usePagedList";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../common/AuthContext";
import { paginationDisplayedRows } from "../components/gridPagination";
import { formatGridDate } from "../components/gridDate";
import { toLocalDateTime } from "../services/payload";

/* Sorting is in the browser, so while paging on the server this orders the
   page on screen; during a search it orders every match. */
const NEWEST_FIRST = { sorting: { sortModel: [{ field: "date", sort: "desc" }] } };

const STATUS_FILTERS = [
  { id: "all",       label: "All swipes" },
  { id: "unsettled", label: "Unsettled" },
  { id: "settled",   label: "Settled" },
  { id: "used",      label: "Card limit used" },
  { id: "notUsed",   label: "Card limit not used" },
];

/* A settled swipe has been paid out to its party; the server refuses to
   change or delete it (409). */
const SETTLED_MESSAGE = "This swipe is settled, so it can't be changed or deleted.";

/* Stable references, so the paging hook does not refetch on every render. */
const fetchSwipesPage = (p) => AdminService.getCardInfoPaginated(p);
const fetchAllSwipes = () => AdminService.getCardInfo();

export default function CardSwipes() {
  const { userRole } = useAuth();
  const canEdit = userRole === "master" || userRole === "admin";

  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [open,            setOpen]            = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [formData,        setFormData]        = useState({});
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [confirm,         setConfirm]         = useState({ open: false, id: null });
  const [exporting,       setExporting]       = useState(false);
  const fileInputRef = useRef();
  const isMobile = useMediaQuery("(max-width:768px)");

  /* The grid pages on the server; the API has no search parameters, so a
     search or status filter loads the whole register and pages it locally. */
  const filtering = search.trim() !== "" || filterStatus !== "all";
  const list = usePagedList({ fetchPage: fetchSwipesPage, fetchAll: fetchAllSwipes, filtering });
  const fetchData = list.reload;

  const handleOpen = (row = null) => {
    if (row) { setFormData(row); setIsEditing(true); }
    else {
      setFormData({
        date: "", partyName: "", cardName: "", cardNumber: "", bankName: "",
        deduction: "", pos: "", remarks: "", limitUsed: false, additionalInfo: "",
        imei: "", model: "", merchant: "", swipePerson: "", profit: "",
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /* The API requires card name and number, party and bank. */
  const canSubmit = Boolean(
    formData.cardName?.trim() && formData.cardNumber?.toString().trim() &&
    formData.partyName?.trim() && formData.bankName?.trim()
  );

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.saveCard(formData);
      setOpen(false);
      fetchData();
    } catch (e) {
      setError(e?.message || "Could not create the swipe entry.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.updateCard(formData.id, formData);
      setOpen(false);
      fetchData();
    } catch (e) {
      setError(isConflict(e) ? SETTLED_MESSAGE : e?.message || "Could not update the swipe entry.");
    } finally { setSaving(false); }
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setError("");
    try {
      await AdminService.deleteCard(id);
      fetchData();
    } catch (e) {
      setError(isConflict(e) ? SETTLED_MESSAGE : e?.message || "Could not delete the swipe entry.");
    }
  };

  /* datetime-local shows local wall-clock time, so feed it exactly that. */
  const toInputValue = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? toLocalDateTime(d).slice(0, 16) : "";
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const filteredRows = useMemo(() => {
    return list.rows.filter((r) => {
      const matchesSearch =
        (r.partyName || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.cardNumber || "").toString().includes(search) ||
        (r.bankName || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ? true :
        filterStatus === "settled" ? Boolean(r.isSettled) :
        filterStatus === "unsettled" ? !r.isSettled :
        filterStatus === "used" ? Boolean(r.limitUsed) :
        filterStatus === "notUsed" ? !r.limitUsed : true;
      return matchesSearch && matchesFilter;
    });
  }, [list.rows, search, filterStatus]);

  /* The export covers every matching record, not just the page on screen. */
  const handleExport = async () => {
    setExporting(true);
    setError("");
    let all;
    try {
      all = filtering ? filteredRows : await AdminService.getCardInfo();
    } catch (e) {
      setError(e?.message || "Could not load card swipes for export.");
      return;
    } finally { setExporting(false); }
    const sheet = XLSX.utils.json_to_sheet(all);
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
      /* The API rejects a swipe without card name, number, party or bank. */
      const valid = data.filter((r) => r.cardName && r.cardNumber && r.partyName && r.bankName);
      const skipped = data.length - valid.length;
      let failed = 0;
      for (const row of valid) {
        try { await AdminService.saveCard(row); } catch { failed += 1; }
      }
      const problems = [
        skipped ? `${skipped} row${skipped === 1 ? " was" : "s were"} skipped for missing card name, card number, party or bank` : "",
        failed ? `${failed} of ${valid.length} rows could not be saved` : "",
      ].filter(Boolean);
      if (problems.length) setError(`Import finished: ${problems.join("; ")}.`);
      fetchData();
    };
    e.target.value = "";
    reader.readAsArrayBuffer(file);
  };

  const columns = [
    { field: "date",      headerName: "Date",       width: 120, valueFormatter: (v) => formatGridDate(v) },
    { field: "partyName", headerName: "Party Name", flex: 1.2, minWidth: 150,
      renderCell: (p) => p.value || "—" },
    {
      field: "cardName", headerName: "Card Name", flex: 1.1, minWidth: 140,
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
    { field: "bankName",     headerName: "Bank",         width: 120 },
    {
      field: "deduction", headerName: "Swipe Amount", width: 135, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: "success.main" }}>
          {fmt(p.value)}
        </Typography>
      ),
    },
    {
      field: "profit", headerName: "Profit", width: 115, align: "right", headerAlign: "right",
      renderCell: (p) => p.value ? (
        <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: "primary.main" }}>
          {fmt(p.value)}
        </Typography>
      ) : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    { field: "merchant",    headerName: "Merchant",     width: 130, renderCell: (p) => p.value || "—" },
    { field: "swipePerson", headerName: "Swipe Person", width: 130, renderCell: (p) => p.value || "—" },
    { field: "model",       headerName: "Model",        width: 120, renderCell: (p) => p.value || "—" },
    { field: "imei",        headerName: "IMEI",         width: 150, renderCell: (p) => p.value || "—" },
    { field: "pos",          headerName: "POS Outlet",   width: 120 },
    { field: "additionalInfo", headerName: "Info",       width: 120,
      renderCell: (p) => p.value || "—" },
    {
      field: "isSettled", headerName: "Payment", width: 120,
      renderCell: (p) => (
        <Tooltip title={p.value && p.row.settledAt ? `Settled on ${formatGridDate(p.row.settledAt)}` : ""}>
          <Chip size="small" variant="outlined"
            color={p.value ? "success" : "warning"}
            label={p.value ? "Settled" : "Unsettled"}
          />
        </Tooltip>
      ),
    },
    {
      field: "limitUsed", headerName: "Card Limit", width: 110,
      renderCell: (p) => (
        <Chip size="small" variant="outlined"
          color={p.value ? "info" : "default"}
          label={p.value ? "Used" : "Not used"}
        />
      ),
    },
    ...(canEdit ? [{
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => {
        const locked = Boolean(p.row.isSettled);
        const lockedTip = `Settled${p.row.settledAt ? ` on ${formatGridDate(p.row.settledAt)}` : ""} — can't be changed`;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={locked ? lockedTip : "Edit record"}>
              <span>
                <IconButton size="small" disabled={locked} onClick={() => handleOpen(p.row)}><Edit fontSize="small" /></IconButton>
              </span>
            </Tooltip>
            <Tooltip title={locked ? lockedTip : "Delete record"}>
              <span>
                <IconButton size="small" color="error" disabled={locked}
                  onClick={() => setConfirm({ open: true, id: p.row.id })}>
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    }] : []),
  ];

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {list.error && (
        <Alert severity="error" sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={list.reload}>Retry</Button>}>
          {list.error}
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Card Swipes</Typography>
          <Typography variant="body2" color="text.secondary">Swipe transaction register.</Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
            Add Swipe Entry
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party, card or bank"
            sx={{ minWidth: { sm: 260 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField select label="Status" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 190 }}>
            {STATUS_FILTERS.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
          </TextField>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Export"}
            </Button>
            {canEdit && (
              <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>Import</Button>
            )}
            <input type="file" accept=".xlsx,.xls" ref={fileInputRef} style={{ display: "none" }} onChange={handleImport} />
          </Stack>
        </Stack>
        <Divider />
        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            initialState={NEWEST_FIRST}
            loading={list.loading}
            {...list.gridProps}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No card swipes match your filters.",
              paginationDisplayedRows: paginationDisplayedRows(list.paginationModel),
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Card Swipe Entry" : "New Card Swipe Entry"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Transaction Date" name="date" type="datetime-local" fullWidth
                value={toInputValue(formData.date)}
                onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Party Name" name="partyName" required fullWidth value={formData.partyName || ""} onChange={handleChange}
                inputProps={{ maxLength: 150 }} helperText="Who this swipe is paid out to" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Card Name" name="cardName" required fullWidth placeholder="e.g. HDFC Regalia"
                value={formData.cardName || ""} onChange={handleChange} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Card Number" name="cardNumber" required fullWidth value={formData.cardNumber || ""} onChange={handleChange}
                inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Name" name="bankName" required fullWidth placeholder="e.g. ICICI Bank"
                value={formData.bankName || ""} onChange={handleChange} inputProps={{ maxLength: 50 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Swipe Amount (₹)" name="deduction" type="number" fullWidth value={formData.deduction || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Profit (₹)" name="profit" type="number" fullWidth
                value={formData.profit ?? ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Merchant" name="merchant" fullWidth
                value={formData.merchant || ""} onChange={handleChange} inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Swipe Person" name="swipePerson" fullWidth
                value={formData.swipePerson || ""} onChange={handleChange} inputProps={{ maxLength: 150 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Device Model" name="model" fullWidth
                value={formData.model || ""} onChange={handleChange} inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="IMEI" name="imei" fullWidth
                value={formData.imei || ""} onChange={handleChange} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="POS / Outlet" name="pos" fullWidth value={formData.pos || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Additional Info" name="additionalInfo" fullWidth value={formData.additionalInfo || ""} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <TextField label="Remarks" name="remarks" fullWidth multiline minRows={2} value={formData.remarks || ""} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={Boolean(formData.limitUsed)} onChange={(e) => setFormData({ ...formData, limitUsed: e.target.checked })} />}
                label="Card limit used"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSubmit}
            onClick={isEditing ? handleUpdate : handleSave}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Swipe"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirm.open}
        title="Delete swipe record?"
        message="This will permanently remove the swipe transaction record. This action cannot be undone."
        confirmLabel="Delete Record"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
