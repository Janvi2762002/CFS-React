import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, TextField, CircularProgress, Button } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AdminService from "../services/AdminService";

export default function Payments() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const tx = await AdminService.getCardInfo(); // your transactions API
            const list = tx.resultObject || [];

            // --- GROUP BY PARTY NAME ---
            const groups = {};
            list.forEach((t) => {
                if (!groups[t.partyName]) groups[t.partyName] = [];
                groups[t.partyName].push(t);
            });

            // --- BUILD PAYMENT SUMMARY PER PARTY ---
            const summaryRows = Object.keys(groups).map((party, idx) => {
                const txs = groups[party];

                const swipeCount = txs.length;

                // amount = sum of deduction, not t.amount
                const amount = txs.reduce((s, t) => s + (Number(t.deduction) || 0), 0);

                // profit = swipes × 300
                const profitRate = 300;
                const profit = swipeCount * profitRate;

                // credit amount if limit used
                const creditAmount = txs
                    .filter((t) => t.limitUsed)
                    .reduce((s, t) => s + (Number(t.creditAmount) || 0), 0);

                // total = amount + profit - creditUsed
                const totalAmount = amount + profit - creditAmount;

                return {
                    id: idx + 1,
                    partyName: party,
                    swipeCount,
                    amount,
                    profit,
                    creditAmount,
                    totalAmount,
                    cards: [...new Set(txs.map((t) => t.cardName))].join(", "),
                    outletName: [...new Set(txs.map((t) => t.pos))].join(", "),
                    paymentStatus: "pending",
                };
            });

            setRows(summaryRows);
        } catch (e) {
            console.error("Payment calc failed", e);
        }
        setLoading(false);
    };

    const filtered = rows.filter((r) =>
        r.partyName.toLowerCase().includes(search.toLowerCase())
    );

    // --- EXPORT TO EXCEL ---
    const handleExport = () => {
        const sheet = XLSX.utils.json_to_sheet(filtered);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Payments");
        const excel = XLSX.write(book, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([excel]), "payments.xlsx");
    };

    const columns = [
        { field: "partyName", headerName: "Party Name", flex: 1 },
        { field: "swipeCount", headerName: "Swipes", flex: 1 },
        { field: "amount", headerName: "Amount", flex: 1 },
        { field: "profit", headerName: "Profit", flex: 1 },
        { field: "creditAmount", headerName: "Credit Used", flex: 1 },
        { field: "totalAmount", headerName: "Total Payable", flex: 1 },
        { field: "cards", headerName: "Cards Used", flex: 1 },
        { field: "outletName", headerName: "Outlets", flex: 1 },
        { field: "paymentStatus", headerName: "Status", flex: 1 }
    ];

    return (
        <Box>
            <Typography variant="h4" mb={2}>
                Party Payments
            </Typography>

            <Box display="flex" justifyContent="space-between" mb={2}>
                <Button variant="contained" onClick={handleExport}>
                    Export
                </Button>

                <TextField
                    placeholder="Search party..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Box>

            {loading ? (
                <Box height={300} display="flex" justifyContent="center" alignItems="center">
                    <CircularProgress />
                </Box>
            ) : (
                <DataGrid
                    rows={filtered}
                    columns={columns}
                    autoHeight
                    pageSize={10}
                />
            )}
        </Box>
    );
}
