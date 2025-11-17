import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Typography, Box, TextField, Button } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const rows = [
  { id: 1, date: "2025-07-27", party: "FARHAN BHAI", card: "27006000", swipes: 3, amount: 13000, profit: 300, credit: 5000, total: 39300, outlet: "Mall Plaza", status: "pending" },
  { id: 2, date: "2025-07-27", party: "FARHAN BHAI", card: "08149007", swipes: 2, amount: 19500, profit: 300, credit: 3000, total: 39300, outlet: "City Center", status: "pending" },
  { id: 3, date: "2025-09-09", party: "ALTAB", card: "SBI", swipes: 3, amount: 2500, profit: 60, credit: 100, total: 7560, outlet: "Mall Plaza", status: "pending" },
];

const columns = [
  { field: "date", headerName: "Date", flex: 1 },
  { field: "party", headerName: "Party", flex: 1 },
  { field: "card", headerName: "Card", flex: 1 },
  { field: "swipes", headerName: "Swipes", flex: 1 },
  { field: "amount", headerName: "Amount", flex: 1 },
  { field: "profit", headerName: "Profit", flex: 1 },
  { field: "credit", headerName: "Credit", flex: 1 },
  { field: "total", headerName: "Total", flex: 1 },
  { field: "outlet", headerName: "Outlet", flex: 1 },
  { field: "status", headerName: "Status", flex: 1 },
];

export default function Transactions() {
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "transactions.xlsx");
  };

  return (
    <Box>
      <Typography variant="h4" mb={2}>Transactions</Typography>

      <Button variant="contained" onClick={handleExport} sx={{ mb: 2 }}>
        Export to Excel
      </Button>

      <TextField fullWidth placeholder="Search by party name or card number..." sx={{ mb: 2 }} />

      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        autoHeight
        disableRowSelectionOnClick
      />
    </Box>
  );
}
