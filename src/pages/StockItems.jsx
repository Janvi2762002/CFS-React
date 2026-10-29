import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  Stack, Paper, Chip, Divider, Grid, Alert, InputAdornment, Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";
import StatTile from "../components/StatTile";
import ConfirmDialog from "../components/ConfirmDialog";
import StockItemService from "../services/StockItemService";
import { isConflict } from "../services/apiClient";
import usePagedList, { serverSortable } from "../common/usePagedList";
import useDebouncedValue from "../common/useDebouncedValue";
import { formatGridDate } from "../components/gridDate";
import { toLocalDateTime } from "../services/payload";
import useCreateIntent from "../common/useCreateIntent";

/* Once an item's payment is completed the server refuses changes to its
   money side (409) and refuses to delete it. Descriptive fields stay open. */
const LOCKED_MESSAGE =
  "This item's payment is completed, so its amount, party and IN/OUT details can't change and it can't be deleted. " +
  "Reset the payment under Stock Payments first.";

/* A stable reference, so the paging hook does not refetch on every render. */
const fetchItemsPage = (p) => StockItemService.getItemsPaginated(p);

/* The API sorts by every data column; the field names match its sortBy. */
const SORT_FIELDS = Object.fromEntries([
  "no", "inDate", "outDate", "model", "colour", "imei", "partyName", "inOut", "status",
  "gstMrp", "amount", "payment", "soldTo", "remarks", "paymentStatus",
].map((f) => [f, f]));

/* The item's payment, as the server keeps it alongside the item. */
const isCompleted = (item) => item?.paymentStatus === "Completed";

export default function StockItems() {
  const [open,            setOpen]            = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [inOutFilter,     setInOutFilter]     = useState("all");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [formData,        setFormData]        = useState({});
  const [confirm,         setConfirm]         = useState({ open: false, id: null });
  /* The item being edited has a completed payment, so its money fields are locked. */
  const [paymentLocked,   setPaymentLocked]   = useState(false);
  const isMobile = useMediaQuery("(max-width:768px)");

  /* Search, status, IN/OUT and sorting are all done by the API, page by page. */
  const debouncedSearch = useDebouncedValue(search);
  const filtering = debouncedSearch.trim() !== "" || statusFilter !== "all" || inOutFilter !== "all";
  const list = usePagedList({
    fetchPage: fetchItemsPage,
    filters: { search: debouncedSearch, status: statusFilter, inOut: inOutFilter },
    sortFields: SORT_FIELDS,
    gridKey: "stockItems",
  });
  const loadItems = list.reload;

  const handleOpen = (item = null) => {
    if (item) {
      setFormData({
        id: item.id,
        no: item.no || "",
        inDate: item.inDate ? item.inDate.split("T")[0] : "",
        outDate: item.outDate ? item.outDate.split("T")[0] : "",
        imei: item.imei || "",
        colour: item.colour || "",
        model: item.model || "",
        gstMrp: item.gstMrp ?? "",
        amount: item.amount ?? "",
        partyName: item.partyName || "",
        payment: item.payment || "",
        inOut: item.inOut || "IN",
        status: item.status || "Available",
        soldTo: item.soldTo || "",
        remarks: item.remarks || ""
      });
      setIsEditing(true);
      setPaymentLocked(isCompleted(item));
    } else {
      setFormData({
        no: "", inDate: toLocalDateTime(new Date()).slice(0, 10), outDate: "",
        imei: "", colour: "", model: "", gstMrp: "", amount: "", partyName: "",
        payment: "Cash", inOut: "IN", status: "Available", soldTo: "", remarks: ""
      });
      setIsEditing(false);
      setPaymentLocked(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /* The server opens a payment for each item: IN is owed to the supplier
     (Party Name), OUT is owed by the buyer (Sold To), so that party is needed. */
  const isOut = formData.inOut === "OUT";
  const counterpartyMissing = isOut ? !formData.soldTo?.trim() : !formData.partyName?.trim();
  const canSubmit = formData.no?.trim() && formData.model?.trim() && formData.amount &&
    !counterpartyMissing;

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await StockItemService.saveItem(formData);
      setOpen(false);
      loadItems();
    } catch (e) {
      setError(e?.message || "Could not create the item.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await StockItemService.updateItem(formData.id, formData);
      setOpen(false);
      loadItems();
    } catch (e) {
      setError(isConflict(e) ? LOCKED_MESSAGE : e?.message || "Could not update the item.");
    } finally { setSaving(false); }
  };

  /* A pending payment is deleted along with its item, so the prompt names
     it: IN is owed to the supplier, OUT is owed by the buyer. (A completed
     one can't get here; its Delete button is disabled.) */
  const handleDelete = (item) => {
    setError("");
    const pending = item.paymentStatus === "Pending"
      ? {
          paymentType: item.inOut === "OUT" ? "Receivable" : "Payable",
          partyName: item.inOut === "OUT" ? item.soldTo : item.partyName,
          outstandingAmount: item.amount,
        }
      : null;
    setConfirm({ open: true, id: item.id, pending });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setError("");
    try {
      await StockItemService.deleteItem(id);
      loadItems();
    } catch (e) {
      setError(isConflict(e) ? LOCKED_MESSAGE : e?.message || "Could not delete the item.");
    }
  };

  const columns = serverSortable([
    { field: "no",        headerName: "No.",        width: 100 },
    { field: "inDate",    headerName: "IN Date",    width: 120, valueFormatter: (v) => formatGridDate(v) },
    { field: "outDate",   headerName: "OUT Date",   width: 120, valueFormatter: (v) => formatGridDate(v) },
    { field: "model",     headerName: "Model",      flex: 1, minWidth: 150 },
    { field: "colour",    headerName: "Colour",     width: 100 },
    { field: "imei",      headerName: "IMEI",       width: 150 },
    { field: "partyName", headerName: "Party Name", flex: 1, minWidth: 150 },
    { field: "inOut",     headerName: "IN/OUT",     width: 100 },
    { field: "status",    headerName: "Status",     width: 120 },
    { field: "gstMrp",    headerName: "GST MRP",    width: 120, type: "number" },
    { field: "amount",    headerName: "Amount",     width: 120, type: "number" },
    { field: "payment",   headerName: "Payment",    width: 110 },
    { field: "soldTo",    headerName: "Sold To",    width: 140 },
    {
      field: "paymentStatus", headerName: "Settlement", width: 120,
      renderCell: (p) => p.value ? (
        <Chip size="small" variant="outlined" color={p.value === "Completed" ? "success" : "warning"} label={p.value} />
      ) : "—",
    },
    { field: "remarks",   headerName: "Remarks",    flex: 1, minWidth: 150 },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit item">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title={isCompleted(p.row) ? "Payment completed — reset it under Stock Payments to delete" : "Delete item"}>
            <span>
              <IconButton size="small" color="error" disabled={isCompleted(p.row)} onClick={() => handleDelete(p.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ], SORT_FIELDS);

  const totalAmount = list.rows.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

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
          <Typography variant="h5" gutterBottom>Stock Items</Typography>
          <Typography variant="body2" color="text.secondary">Manage your inventory and stock movement.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
          Add Stock Item
        </Button>
      </Stack>

      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label={filtering ? "Matching Items" : "Total Items"} value={list.rowCount} icon={Inventory2Icon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label="Page Total Amount" value={`₹${totalAmount.toLocaleString()}`} icon={Inventory2Icon} color="success" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "clip" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search no., model, IMEI, party or buyer"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton></InputAdornment>
              ) : null,
            }}
          />
          <TextField select label="IN/OUT" value={inOutFilter} onChange={(e) => setInOutFilter(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="IN">IN</MenuItem>
            <MenuItem value="OUT">OUT</MenuItem>
          </TextField>
          <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="Available">Available</MenuItem>
            <MenuItem value="Sold">Sold</MenuItem>
            <MenuItem value="Returned">Returned</MenuItem>
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
              noRowsLabel: "No stock items match your filters.",
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Stock Item" : "Add Stock Item"}</DialogTitle>
        <Divider />
        <DialogContent>
          {paymentLocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This item's payment is completed, so Amount, GST MRP, Party, Sold To, Payment, IN/OUT and Status
              are locked. Reset the payment under Stock Payments to change them.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="No." name="no" required fullWidth value={formData.no} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Model" name="model" required fullWidth value={formData.model} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="IMEI" name="imei" fullWidth value={formData.imei} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="IN Date" name="inDate" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.inDate} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="OUT Date" name="outDate" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.outDate} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Colour" name="colour" fullWidth value={formData.colour} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Party Name (supplier)" name="partyName" fullWidth
                required={!isOut} disabled={paymentLocked}
                value={formData.partyName} onChange={handleChange}
                helperText={isOut ? "Who it was bought from (optional)" : "A payment to this supplier is created automatically"} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Sold To (buyer)" name="soldTo" fullWidth
                required={isOut} disabled={paymentLocked}
                value={formData.soldTo} onChange={handleChange}
                helperText={isOut ? "A payment to receive from this buyer is created automatically" : "Only needed for OUT items"} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="GST MRP" name="gstMrp" type="number" fullWidth disabled={paymentLocked} value={formData.gstMrp} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Amount" name="amount" type="number" required fullWidth disabled={paymentLocked} value={formData.amount} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Payment" name="payment" fullWidth disabled={paymentLocked} value={formData.payment} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="IN/OUT" name="inOut" fullWidth disabled={paymentLocked} value={formData.inOut} onChange={handleChange}>
                <MenuItem value="IN">IN</MenuItem>
                <MenuItem value="OUT">OUT</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Status" name="status" fullWidth disabled={paymentLocked} value={formData.status} onChange={handleChange}>
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Sold">Sold</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
              </TextField>
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
            {saving ? "Saving…" : isEditing ? "Update Item" : "Create Item"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title="Delete item?"
        message={confirm.pending
          ? `Its pending ${confirm.pending.paymentType === "Receivable" ? "receivable from" : "payable to"} ` +
            `${confirm.pending.partyName || "the party"} (₹${Number(confirm.pending.outstandingAmount || 0).toLocaleString("en-IN")}) ` +
            "will be deleted with it. This cannot be undone."
          : "This action cannot be undone. Are you sure you want to delete this stock item?"}
        confirmLabel="Delete Item"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
