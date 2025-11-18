import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  useMediaQuery
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = React.useRef();
  // --- Dialog States ---
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const fullScreen = useMediaQuery("(max-width:600px)");

  // Fetch backend data
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getCardInfo();
      setRows(data.resultObject || []);
    } catch (error) {
      console.error("Failed to fetch:", error);
      alert("Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // OPEN modal
  const handleOpen = (row = null) => {
    if (row) {
      setFormData(row);
      setIsEditing(true);
    } else {
      setFormData({
        date: "",
        partyName: "",
        cardName: "",
        cardNumber: "",
        bankName: "",
        deduction: "",
        pos: "",
        remarks: "",
        limitUsed: false,
        additionalInfo: "",
        createdat: "",
        updatedat: "",
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // SAVE card
  const handleSave = async () => {
    try {
      const now = new Date().toISOString();

      const payload = {
        date: formData.date,
        partyName: formData.partyName,
        cardName: formData.cardName,
        cardNumber: formData.cardNumber,
        deduction: Number(formData.deduction) || 0,
        pos: formData.pos,
        remarks: formData.remarks,
        limitUsed: formData.limitUsed,
        // metadata: formData.metadata, // OR formData.metadata
        bankName: formData.bankName,
        additionalInfo: formData.additionalInfo,
        createdat: now,
        updatedat: now
      };

      await AdminService.saveCard(payload);
      fetchData();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save record.");
    }
  };


  const handleUpdate = async () => {
    try {
      const now = new Date().toISOString();

      const { id, ...rest } = formData;

      const payload = {
        ...rest,
        updatedat: now,
        id
      };

      await AdminService.updateCard(id, payload);

      fetchData();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update record.");
    }
  };



  // DELETE user
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await AdminService.deleteCard(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete record.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatForInput = (value) => {
    if (!value) return "";
    const d = new Date(value);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${min}`;
  };


  // SEARCH
  const filteredRows = rows.filter(
    (r) =>
      r.partyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.cardNumber?.toString().includes(search)
  );

  // EXPORT
  const handleExport = () => {
    const sheet = XLSX.utils.json_to_sheet(filteredRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Transactions");

    const excel = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excel]), "transactions.xlsx");
  };
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
  
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
  
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
  
      const importedData = XLSX.utils.sheet_to_json(worksheet);
  
      const now = new Date().toISOString();
  
      const validRows = importedData.filter(
        (row) => row.partyName && row.cardNumber
      );
  
      const payloads = validRows.map((row) => ({
        date: row.date ? new Date(row.date).toISOString() : null,
        partyName: row.partyName,
        cardName: row.cardName || "",
        cardNumber: row.cardNumber,
        bankName: row.bankName || "",
        deduction: Number(row.deduction) || 0,
        pos: row.pos || "",
        remarks: row.remarks || "",
        limitUsed: row.limitUsed || false,
        additionalInfo: row.additionalInfo || "",
        createdat: now,
        updatedat: now,
      }));
  
      // Append to grid with temporary IDs for display
      const rowsWithTempId = payloads.map((p, idx) => ({
        ...p,
        id: `temp-${Date.now()}-${idx}`,
      }));
      setRows((prev) => [...prev, ...rowsWithTempId]);
  
      // Post to backend
      await Promise.all(
        payloads.map((payload) =>
          AdminService.saveCard(payload).catch((err) =>
            console.error("Failed row:", payload, err)
          )
        )
      );
  
      alert("Import completed!");
    };
  
    reader.readAsArrayBuffer(file);
  };
  

  const columns = [
    {
      field: "date",
      headerName: "Date",
      flex: 1,
      valueFormatter: (params) => formatDate(params),
    },
    { field: "partyName", headerName: "Party Name", flex: 1 },
    { field: "cardName", headerName: "Card Name", flex: 1 },
    { field: "cardNumber", headerName: "Card Number", flex: 1 },
    { field: "bankName", headerName: "Bank Name", flex: 1 },
    { field: "deduction", headerName: "Deduction", flex: 1 },
    { field: "pos", headerName: "POS", flex: 1 },
    { field: "remarks", headerName: "Remarks", flex: 1 },
    // { field: "metadata", headerName: "Metadata", flex: 1 },
    { field: "limitUsed", headerName: "Limit Used", flex: 1 },
    { field: "additionalInfo", headerName: "Additional Info", flex: 1 },

    // formatted created date
    {
      field: "createdat",
      headerName: "Created At",
      flex: 1,
      valueFormatter: (params) => formatDate(params),
    },

    // formatted updated date
    {
      field: "updatedat",
      headerName: "Updated At",
      flex: 1,
      valueFormatter: (params) => formatDate(params),
    },

    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleOpen(params.row)}>
            <Edit />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" mb={2}>
        Transactions
      </Typography>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        {/* LEFT SIDE BUTTONS */}
        <Box display="flex" alignItems="center" gap={2}>
          <Button variant="contained" onClick={handleExport}>
            Export to Excel
          </Button>

          <Button
            variant="contained"
            onClick={() => fileInputRef.current.click()}
          >
            Import to Grid
          </Button>

          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImport}
          />


        </Box>

        {/* RIGHT SIDE BUTTON */}
        <Button
          variant="contained"
          onClick={() => handleOpen()}
          sx={{ whiteSpace: "nowrap" }}
        >
          Add New Card
        </Button>
      </Box>



      <TextField
        fullWidth
        placeholder="Search by party name or card number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }} // margin-bottom: 16px
      />



      {loading ? (
        <Box height={300} display="flex" justifyContent="center" alignItems="center">
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={filteredRows}
          columns={columns}
          pageSize={10}
          autoHeight
          disableRowSelectionOnClick
        />
      )}

      {/* --- Modal --- */}
      <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>

        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Date" name="date" type="datetime-local" value={formatForInput(formData.date) || ""} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Party Name" name="partyName" value={formData.partyName || ""} onChange={handleChange} fullWidth />
            <TextField label="Card Name" name="cardName" value={formData.cardName || ""} onChange={handleChange} fullWidth />
            <TextField label="Card Number" name="cardNumber" value={formData.cardNumber || ""} onChange={handleChange} fullWidth />
            <TextField label="Bank Name" name="bankName" value={formData.bankName || ""} onChange={handleChange} fullWidth />
            <TextField label="Deduction" name="deduction" value={formData.deduction || ""} onChange={handleChange} fullWidth />
            <TextField label="POS" name="pos" value={formData.pos || ""} onChange={handleChange} fullWidth />
            <TextField label="Remarks" name="remarks" value={formData.remarks || ""} onChange={handleChange} fullWidth />
            {/* <TextField label="Metadata" name="metadata" value={formData.metadata || ""} onChange={handleChange} fullWidth /> */}
            <Box display="flex" alignItems="center">
              <Checkbox
                checked={formData.limitUsed || false}
                onChange={(e) =>
                  setFormData({ ...formData, limitUsed: e.target.checked })
                }
              />
              <Typography>Limit Used</Typography>
            </Box>

            <TextField label="Additional Info" name="additionalInfo" value={formData.additionalInfo || ""} onChange={handleChange} fullWidth />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {isEditing ? (
            <Button variant="contained" onClick={handleUpdate}>Update</Button>
          ) : (
            <Button variant="contained" onClick={handleSave}>Add</Button>
          )}


        </DialogActions>
      </Dialog>
    </Box>
  );
}
