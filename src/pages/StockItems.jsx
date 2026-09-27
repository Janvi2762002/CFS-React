import React, { useState, useEffect, useMemo } from "react";
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
import StockItemService from "../services/StockItemService";

export default function StockItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inOutFilter, setInOutFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({});
  const isMobile = useMediaQuery("(max-width:768px)");

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await StockItemService.getItems();
      setItems(data || []);
    } catch (e) {
      setItems([]);
      setError(e?.message || "Could not load stock items.");
    } finally { setLoading(false); }
  };

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
        gstMrp: item.gstMrp || "",
        amount: item.amount || "",
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
        no: "", inDate: new Date().toISOString().split("T")[0], outDate: "",
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
      await loadItems();
    } catch (e) {
      setError(e?.message || "Could not create the item.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await StockItemService.updateItem(formData.id, formData);
      setOpen(false);
      await loadItems();
    } catch (e) {
      setError(e?.message || "Could not update the item.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setError("");
    try {
      await StockItemService.deleteItem(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e?.message || "Could not delete the item.");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
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
  }, [items, search, statusFilter, inOutFilter]);

  const columns = [
    { field: "no", headerName: "No.", width: 100 },
    { field: "model", headerName: "Model", flex: 1, minWidth: 150 },
    { field: "imei", headerName: "IMEI", width: 150 },
    { field: "partyName", headerName: "Party Name", flex: 1, minWidth: 150 },
    { field: "inOut", headerName: "IN/OUT", width: 100 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "amount", headerName: "Amount", width: 120, type: "number" },
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
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label="Total Items" value={filtered.length} icon={Inventory2Icon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} icon={Inventory2Icon} color="success" /></Grid>
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

        {loading ? (
          <Box sx={{ py: 10, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              pageSizeOptions={[10, 25, 50]}
              rowHeight={56}
            />
          </Box>
        )}
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
    </Box>
  );
}
