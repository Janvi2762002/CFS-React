import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, CircularProgress, Paper, Grid, Alert, IconButton, Tooltip, Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import InventoryIcon from "@mui/icons-material/Inventory2Outlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DashboardService from "../services/DashboardService";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await DashboardService.getSummary();
      setSummary(data);
    } catch (e) {
      setError(e?.message || "Could not load dashboard summary.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const bank = summary?.totalBankBalance || 0;
  const cash = summary?.totalAvailableCash || 0;
  const totalCapital = bank + cash;
  const bankPct = totalCapital > 0 ? (bank / totalCapital) * 100 : 0;
  const cashPct = totalCapital > 0 ? (cash / totalCapital) * 100 : 0;

  const swipes = summary?.totalSwipes || 0;
  const profit = summary?.totalPartyProfit || 0;
  const stockItems = summary?.totalStockItems || 0;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Current financial and operational overview
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton size="small" onClick={() => loadSummary({ isRefresh: true })} disabled={refreshing} color="primary">
            <RefreshIcon fontSize="small" className={refreshing ? "spin" : ""} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Top Summary Card: TOTAL AVAILABLE CAPITAL */}
      {summary && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 1.5,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(46,125,50,0.12) 100%)"
                : "linear-gradient(135deg, #f0f7ff 0%, #f1f8e9 100%)",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
                TOTAL AVAILABLE CAPITAL
              </Typography>
              <Typography variant="h5" className="tabular-nums" sx={{ fontWeight: 700, color: "primary.main", my: 0.5, fontSize: { xs: "1.5rem", sm: "1.75rem" } }}>
                {inr(totalCapital)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bank: {inr(bank)} · Cash: {inr(cash)}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 7 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Bank: {inr(bank)} ({bankPct.toFixed(1)}%)</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Cash: {inr(cash)} ({cashPct.toFixed(1)}%)</Typography>
                  </Stack>
                </Stack>

                <Box sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", bgcolor: "divider" }}>
                  <Box sx={{ width: `${bankPct}%`, bgcolor: "primary.main", transition: "width 0.5s ease" }} />
                  <Box sx={{ width: `${cashPct}%`, bgcolor: "success.main", transition: "width 0.5s ease" }} />
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* FINANCIAL OVERVIEW Section */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
        FINANCIAL OVERVIEW
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Bank Balance Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 1.5,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: 1 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: "primary.50", color: "primary.main", display: "flex" }}>
                <AccountBalanceIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Bank Balance</Typography>
            </Stack>
            <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700, color: "primary.main", my: 0.5, fontSize: "1.35rem" }}>
              {inr(bank)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              Current bank ledger balance
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={() => navigate("/bank-transactions")}
            sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: "0.75rem" }}
          >
            View Bank Accounts →
          </Button>
        </Paper>

        {/* Available Cash Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 1.5,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: 1 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: "success.50", color: "success.main", display: "flex" }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Available Cash</Typography>
            </Stack>
            <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700, color: "success.main", my: 0.5, fontSize: "1.35rem" }}>
              {inr(cash)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              Current cash ledger balance
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="success"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={() => navigate("/cash-ledger")}
            sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: "0.75rem" }}
          >
            View Cash Ledger →
          </Button>
        </Paper>
      </Box>

      {/* OPERATIONS & INVENTORY Section */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
        OPERATIONS & INVENTORY
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {/* Total Swipes Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 1.5,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: 1 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: "info.50", color: "info.main", display: "flex" }}>
                <ReceiptLongIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Total Swipes</Typography>
            </Stack>
            <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700, color: "info.main", my: 0.5, fontSize: "1.35rem" }}>
              {swipes.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              All recorded swipe records
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="info"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={() => navigate("/swipes")}
            sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: "0.75rem" }}
          >
            View Card Swipes →
          </Button>
        </Paper>

        {/* Total Party Profit Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 1.5,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: 1 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: "secondary.50", color: "secondary.main", display: "flex" }}>
                <TrendingUpIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Total Party Profit</Typography>
            </Stack>
            <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700, color: "secondary.main", my: 0.5, fontSize: "1.35rem" }}>
              {inr(profit)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              Total accrued profit for parties
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={() => navigate("/payments")}
            sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: "0.75rem" }}
          >
            View Card Payments →
          </Button>
        </Paper>

        {/* Total Stock Items Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 1.5,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: 1 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: "warning.50", color: "warning.main", display: "flex" }}>
                <InventoryIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Total Stock Items</Typography>
            </Stack>
            <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700, color: "warning.main", my: 0.5, fontSize: "1.35rem" }}>
              {stockItems.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
              Count of stock records marked IN
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            endIcon={<ArrowForwardIcon sx={{ fontSize: "0.85rem !important" }} />}
            onClick={() => navigate("/stock-items")}
            sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: "0.75rem" }}
          >
            View Stock Items →
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
