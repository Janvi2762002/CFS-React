import { DataGrid } from "@mui/x-data-grid";
import { Typography, Box, TextField } from "@mui/material";

const rows = [
  { id: 1, date: "2025-07-27", party: "FARHAN BHAI", card: "27006000", swipes: 3, amount: 13000, profit: 300, credit: 5000, total: 39300, outlet: "Mall Plaza", status: "pending" },
  { id: 2, date: "2025-07-27", party: "FARHAN BHAI", card: "08149007", swipes: 2, amount: 19500, profit: 300, credit: 3000, total: 39300, outlet: "City Center", status: "pending" },
  { id: 3, date: "2025-09-09", party: "ALTAB", card: "SBI", swipes: 3, amount: 2500, profit: 60, credit: 100, total: 7560, outlet: "Mall Plaza", status: "pending" },
];

const columns = [
  { field: "date", headerName: "Date", flex: 1 },
  { field: "party", headerName: "Party", flex: 1 },
  { field: "card", headerName: "Card", flex: 1 },
  { field: "swipes", headerName: "Swipes", flex: 1, type: "number" },
  { field: "amount", headerName: "Amount", flex: 1, valueFormatter: (params) => `₹${params}` },
  { field: "profit", headerName: "Profit", flex: 1, valueFormatter: (params) => `₹${params}` },
  { field: "credit", headerName: "Credit", flex: 1, valueFormatter: (params) => `₹${params}` },
  { field: "total", headerName: "Total", flex: 1, valueFormatter: (params) => `₹${params}` },
  { field: "outlet", headerName: "Outlet", flex: 1 },
  { field: "status", headerName: "Status", flex: 1 },
];

export default function Transactions() {
  return (
    <Box>
      <Typography variant="h4" mb={2}>Transactions</Typography>
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
