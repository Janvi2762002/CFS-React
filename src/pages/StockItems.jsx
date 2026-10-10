import React, { useState, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  CircularProgress, Stack, Paper, Divider, Grid, Alert, InputAdornment, Tooltip
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
import usePagedList from "../common/usePagedList";
import { paginationDisplayedRows } from "../components/gridPagination";
import { formatGridDate } from "../components/gridDate";
import { toLocalDateTime } from "../services/payload";

/* Stable references, so the paging hook does not refetch on every render. */
const fetchItemsPage = (p) => StockItemService.getItemsPaginated(p);
const fetchAllItems = () => StockItemService.getItems();

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
  const isMobile = useMediaQuery("(max-width:768px)");

  /* The grid pages on the server. Search and the status / IN-OUT filters
     need every item, so while any is set the full list is paged locally. */
  const filtering = search.trim() !== "" || statusFilter !== "all" || inOutFilter !== "all";
  const list = usePagedList({ fetchPage: fetchItemsPage, fetchAll: fetchAllItems, filtering });
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
    } else {
      setFormData({
        no: "", inDate: toLocalDateTime(new Date()).slice(0, 10), outDate: "",
        imei: "", colour: "", model: "", gstMrp: "", amount: "", partyName: "",
        payment: "Cash", inOut: "IN", status: "Available", soldTo: "", remarks: ""
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const canSubmit = formData.no?.trim() && formData.model?.trim() && formData.amount;

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
      setError(e?.message || "Could not update the item.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setConfirm({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setError("");
    try {
      await StockItemService.deleteItem(id);
      loadItems();
    } catch (e) {
      setError(e?.message || "Could not delete the item.");
    }
  };

  /* While searching or filtering, this covers every item, not one page. */
  const filtered = useMemo(() => {
    return list.rows.filter((i) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (i.no || "").toLowerCase().includes(q) ||
        (i.model || "").toLowerCase().includes(q) ||
        (i.imei || "").toLowerCase().includes(q) ||
        (i.partyName || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" ? true : i.status === statusFilter;
      const matchesInOut = inOutFilter === "all" ? true : i.inOut === inOutFilter;
      return matchesSearch && matchesStatus && matchesInOut;
    });
  }, [list.rows, search, statusFilter, inOutFilter]);

  const columns = [
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
    { field: "remarks",   headerName: "Remarks",    flex: 1, minWidth: 150 },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit item">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete item">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const totalAmount = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

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
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label={filtering ? "Matching Items" : "Total Items"} value={filtering ? filtered.length : list.rowCount} icon={Inventory2Icon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label={filtering ? "Matching Total Amount" : "Page Total Amount"} value={`₹${totalAmount.toLocaleString()}`} icon={Inventory2Icon} color="success" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model, IMEI, or party"
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
            rows={filtered}
            columns={columns}
            loading={list.loading}
            {...list.gridProps}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No stock items match your filters.",
              paginationDisplayedRows: paginationDisplayedRows(list.paginationModel),
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Stock Item" : "Add Stock Item"}</DialogTitle>
        <Divider />
        <DialogContent>
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
              <TextField label="Party Name" name="partyName" fullWidth value={formData.partyName} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Sold To" name="soldTo" fullWidth value={formData.soldTo} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="GST MRP" name="gstMrp" type="number" fullWidth value={formData.gstMrp} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Amount" name="amount" type="number" required fullWidth value={formData.amount} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Payment" name="payment" fullWidth value={formData.payment} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="IN/OUT" name="inOut" fullWidth value={formData.inOut} onChange={handleChange}>
                <MenuItem value="IN">IN</MenuItem>
                <MenuItem value="OUT">OUT</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Status" name="status" fullWidth value={formData.status} onChange={handleChange}>
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
        message="This action cannot be undone. Are you sure you want to delete this stock item?"
        confirmLabel="Delete Item"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
