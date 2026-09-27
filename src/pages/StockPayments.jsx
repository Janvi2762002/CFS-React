import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery,
  CircularProgress, Stack, Paper, Divider, Grid, Alert, InputAdornment, Tooltip, MenuItem
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import ReceiptIcon from "@mui/icons-material/ReceiptOutlined";
import StatTile from "../components/StatTile";
import StockPaymentInfoService from "../services/StockPaymentInfoService";
import StockItemService from "../services/StockItemService";

export default function StockPayments() {
  const [payments, setPayments] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({});
  const isMobile = useMediaQuery("(max-width:768px)");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [pmts, items] = await Promise.all([
        StockPaymentInfoService.getPayments(),
        StockItemService.getItems()
      ]);
      setPayments(pmts || []);
      setStockItems(items || []);
    } catch (e) {
      setPayments([]);
      setError(e?.message || "Could not load data.");
    } finally { setLoading(false); }
  };

  const handleOpen = (item = null) => {
    if (item) {
      setFormData({
        id: item.id,
        no: item.no || "",
        accountName: item.accountName || "",
        accountNo: item.accountNo || "",
        ifsc: item.ifsc || "",
        amount: item.amount || "",
        date: item.date ? item.date.split("T")[0] : "",
        partyName: item.partyName || "",
        bank: item.bank || "",
        remarks: item.remarks || "",
        stockItemId: item.stockItemId || ""
      });
      setIsEditing(true);
    } else {
      setFormData({
        no: "", accountName: "", accountNo: "", ifsc: "", amount: "",
        date: new Date().toISOString().split("T")[0], partyName: "", bank: "", remarks: "", stockItemId: ""
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const canSubmit = formData.no?.trim() && formData.amount && formData.stockItemId;

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await StockPaymentInfoService.savePayment(formData);
      setOpen(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Could not create payment.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await StockPaymentInfoService.updatePayment(formData.id, formData);
      setOpen(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Could not update payment.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    setError("");
    try {
      await StockPaymentInfoService.deletePayment(id);
      setPayments((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e?.message || "Could not delete payment.");
    }
  };

  const filtered = useMemo(() => {
    return payments.filter((i) => {
      const q = search.toLowerCase();
      return (i.no || "").toLowerCase().includes(q) ||
        (i.accountName || "").toLowerCase().includes(q) ||
        (i.partyName || "").toLowerCase().includes(q);
    });
  }, [payments, search]);

  const columns = [
    { field: "no", headerName: "No.", width: 100 },
    { field: "partyName", headerName: "Party Name", flex: 1, minWidth: 150 },
    { field: "accountName", headerName: "Account Name", flex: 1, minWidth: 150 },
    { field: "bank", headerName: "Bank", width: 120 },
    { field: "amount", headerName: "Amount", width: 120, type: "number" },
    { field: "date", headerName: "Date", width: 120, valueGetter: (p) => p.split("T")[0] },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit payment">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete payment">
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
          <Typography variant="h5" gutterBottom>Stock Payments</Typography>
          <Typography variant="body2" color="text.secondary">Track payments made for stock items.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
          Add Payment
        </Button>
      </Stack>

      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label="Total Payments" value={filtered.length} icon={ReceiptIcon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><StatTile label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} icon={ReceiptIcon} color="success" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by no, account, or party"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton></InputAdornment>
              ) : null,
            }}
          />
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
        <DialogTitle>{isEditing ? "Edit Payment" : "Add Payment"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="No." name="no" required fullWidth value={formData.no} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Date" name="date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.date} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Amount" name="amount" type="number" required fullWidth value={formData.amount} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Account Name" name="accountName" fullWidth value={formData.accountName} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Account No." name="accountNo" fullWidth value={formData.accountNo} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="IFSC" name="ifsc" fullWidth value={formData.ifsc} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Bank" name="bank" fullWidth value={formData.bank} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Party Name" name="partyName" fullWidth value={formData.partyName} onChange={handleChange} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField select label="Linked Stock Item" name="stockItemId" required fullWidth value={formData.stockItemId} onChange={handleChange}>
                {stockItems.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.no} - {item.model} ({item.imei})</MenuItem>
                ))}
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
            {saving ? "Saving…" : isEditing ? "Update Payment" : "Create Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
