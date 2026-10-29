import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  Stack, Paper, Divider, Grid, Alert, InputAdornment, Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import StatTile from "../components/StatTile";
import ConfirmDialog from "../components/ConfirmDialog";
import CashLedgerService from "../services/CashLedgerService";
import { useAuth } from "../common/AuthContext";
import { formatGridDate } from "../components/gridDate";
import { toLocalDateTime } from "../services/payload";
import usePagedList, { serverSortable } from "../common/usePagedList";
import useDebouncedValue from "../common/useDebouncedValue";
import useCreateIntent from "../common/useCreateIntent";

/* A stable reference, so the paging hook does not refetch on every render. */
const fetchEntriesPage = (p) => CashLedgerService.getEntriesPaginated(p);

/* Grid columns the API can sort by (column field → sortBy). */
const SORT_FIELDS = {
  transactionDate: "transactionDate", transactionType: "transactionType", name: "name",
  amount: "amount", remarks: "remarks", createdBy: "createdBy",
};

export default function CashLedger() {
  const { user } = useAuth();
  const [totals,          setTotals]          = useState({ opening: 0, in: 0, out: 0, current: 0 });
  const [open,            setOpen]            = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [search,          setSearch]          = useState("");
  const [typeFilter,      setTypeFilter]      = useState("all");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [formData,        setFormData]        = useState({});
  const [confirm,         setConfirm]         = useState({ open: false, id: null });
  const isMobile = useMediaQuery("(max-width:768px)");

  /* Search, type and sorting are all done by the API, page by page; the
     server lists newest first unless a column is sorted. */
  const debouncedSearch = useDebouncedValue(search);
  const list = usePagedList({
    fetchPage: fetchEntriesPage,
    filters: { search: debouncedSearch, transactionType: typeFilter },
    sortFields: SORT_FIELDS,
    gridKey: "cashLedger",
  });

  /* The four totals come from their own summary endpoints, once per change. */
  const loadTotals = useCallback(async () => {
    try {
      const [op, tin, tout, cur] = await Promise.all([
        CashLedgerService.getOpeningTotal(),
        CashLedgerService.getInTotal(),
        CashLedgerService.getOutTotal(),
        CashLedgerService.getCurrentBalance(),
      ]);
      setTotals({ opening: op || 0, in: tin || 0, out: tout || 0, current: cur || 0 });
    } catch (e) {
      setError(e?.message || "Could not load the cash totals.");
    }
  }, []);

  useEffect(() => { loadTotals(); }, [loadTotals]);

  const loadData = () => {
    list.reload();
    loadTotals();
  };

  const handleOpen = (item = null) => {
    if (item) {
      setFormData({
        id: item.id,
        transactionDate: item.transactionDate ? item.transactionDate.split("T")[0] : "",
        transactionType: item.transactionType || "IN",
        name: item.name || "",
        amount: item.amount ?? "",
        remarks: item.remarks || "",
        createdBy: item.createdBy || ""
      });
      setIsEditing(true);
    } else {
      setFormData({
        transactionDate: toLocalDateTime(new Date()).slice(0, 10),
        transactionType: "IN", name: "", amount: "", remarks: "", createdBy: user?.username || ""
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const canSubmit = formData.name?.trim() && formData.amount && formData.transactionType;

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await CashLedgerService.saveEntry(formData);
      setOpen(false);
      loadData();
    } catch (e) {
      setError(e?.message || "Could not create entry.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await CashLedgerService.updateEntry(formData.id, formData);
      setOpen(false);
      loadData();
    } catch (e) {
      setError(e?.message || "Could not update entry.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setConfirm({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setError("");
    try {
      await CashLedgerService.deleteEntry(id);
      loadData();
    } catch (e) {
      setError(e?.message || "Could not delete entry.");
    }
  };

  const columns = serverSortable([
    { field: "transactionDate", headerName: "Date",         width: 120, valueFormatter: (v) => formatGridDate(v) },
    { field: "transactionType", headerName: "Type",         width: 120 },
    { field: "name",            headerName: "Name / Party", flex: 1, minWidth: 150 },
    { field: "amount",          headerName: "Amount",       width: 120, type: "number" },
    { field: "remarks",         headerName: "Remarks",      flex: 1, minWidth: 150 },
    { field: "createdBy",       headerName: "Created By",   width: 120 },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit entry">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete entry">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], SORT_FIELDS);

  // A module's "New …" button lands here with the Add dialog requested.
  useCreateIntent(() => handleOpen());

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {list.error && (
        <Alert severity="error" sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={list.reload}>Retry</Button>}>
          {list.error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Cash Ledger</Typography>
          <Typography variant="body2" color="text.secondary">Track opening, incoming, and outgoing cash.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
          Add Entry
        </Button>
      </Stack>

      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatTile label="Opening Balance" value={`₹${totals.opening.toLocaleString()}`} icon={AccountBalanceWalletIcon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatTile label="Total IN"        value={`₹${totals.in.toLocaleString()}`}      icon={AccountBalanceWalletIcon} color="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatTile label="Total OUT"       value={`₹${totals.out.toLocaleString()}`}     icon={AccountBalanceWalletIcon} color="error" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatTile label="Current Balance" value={`₹${totals.current.toLocaleString()}`} icon={AccountBalanceWalletIcon} color="info" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "clip" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or remarks"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton></InputAdornment>
              ) : null,
            }}
          />
          <TextField select label="Transaction Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="OPENING">OPENING</MenuItem>
            <MenuItem value="IN">IN</MenuItem>
            <MenuItem value="OUT">OUT</MenuItem>
          </TextField>
        </Stack>

        <Divider />

        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={list.rows}
            columns={columns}
            loading={list.loading}
            {...list.gridProps}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No cash ledger entries found.",
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Entry" : "Add Entry"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Date" name="transactionDate" type="date" required fullWidth InputLabelProps={{ shrink: true }} value={formData.transactionDate} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Type" name="transactionType" required fullWidth value={formData.transactionType} onChange={handleChange}>
                <MenuItem value="OPENING">OPENING</MenuItem>
                <MenuItem value="IN">IN</MenuItem>
                <MenuItem value="OUT">OUT</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField label="Name / Party" name="name" required fullWidth value={formData.name} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <TextField label="Amount" name="amount" type="number" required fullWidth value={formData.amount} onChange={handleChange} />
            </Grid>
            <Grid size={12}>
              <TextField label="Remarks" name="remarks" fullWidth multiline minRows={2} value={formData.remarks} onChange={handleChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSubmit} onClick={isEditing ? handleUpdate : handleSave}>
            {saving ? "Saving…" : isEditing ? "Update Entry" : "Create Entry"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title="Delete cash ledger entry?"
        message="This action cannot be undone. Are you sure you want to delete this cash ledger entry?"
        confirmLabel="Delete Entry"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
