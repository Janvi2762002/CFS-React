import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, TextField, Typography, IconButton, Stack, Paper, Divider, Grid, Alert,
  InputAdornment, Tooltip, MenuItem, Chip, Tabs, Tab, Drawer, CircularProgress, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import PayIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiveIcon from "@mui/icons-material/SavingsOutlined";
import SettleIcon from "@mui/icons-material/TaskAltOutlined";
import ResetIcon from "@mui/icons-material/RestartAltOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import StatTile from "../components/StatTile";
import AmountField from "../components/AmountField";
import FormDrawer, { FormSection } from "../components/FormDrawer";
import StockPaymentInfoService from "../services/StockPaymentInfoService";
import { isConflict } from "../services/apiClient";
import { formatGridDate } from "../components/gridDate";
import { toLocalDateTime } from "../services/payload";
import usePaginationModel from "../common/usePaginationModel";
import { gridPagerProps } from "../components/GridPager";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => toLocalDateTime(new Date()).slice(0, 10);

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque"];

/* Payable: the business owes a supplier (IN stock). Receivable: a buyer owes
   the business (OUT stock). */
const TYPE_META = {
  Payable:    { label: "Payable",    color: "error",   action: "Pay supplier",       verb: "Paid to" },
  Receivable: { label: "Receivable", color: "success", action: "Receive from buyer", verb: "Received from" },
};

function Money({ value, tone = "text.primary" }) {
  if (value == null || value === "") return <Typography variant="body2" color="text.disabled">—</Typography>;
  return (
    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: tone }}>
      {inr(value)}
    </Typography>
  );
}

function TypeChip({ value }) {
  const meta = TYPE_META[value];
  return <Chip size="small" variant="outlined" color={meta?.color || "default"} label={meta?.label || value || "—"} />;
}

function StatusChip({ value }) {
  return (
    <Chip size="small" variant="outlined"
      color={value === "Completed" ? "success" : "warning"}
      label={value || "—"} />
  );
}

const emptySettle = (payment = null) => ({
  amount: payment?.outstandingAmount ?? "",
  transactionDate: today(),
  paymentMethod: "",
  referenceNo: "",
  remarks: "",
});

export default function StockPayments() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  /* ── Filters, shared by both tabs ───────────────────────────────────── */
  const [tab,          setTab]          = useState("payments");
  const [search,       setSearch]       = useState("");
  const [partyFilter,  setPartyFilter]  = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inOutFilter,  setInOutFilter]  = useState("all");

  /* ── Payments tab ───────────────────────────────────────────────────── */
  const [payments,        setPayments]        = useState([]);
  const [rowCount,        setRowCount]        = useState(0);
  const [paginationModel, setPaginationModel] = usePaginationModel("stockPayments");
  const [loading,         setLoading]         = useState(true);

  /* ── By-party tab ───────────────────────────────────────────────────── */
  const [parties,          setParties]          = useState([]);
  const [partyCount,       setPartyCount]       = useState(0);
  const [partyPagination,  setPartyPagination]  = usePaginationModel("stockPaymentParties");
  const [partiesLoading,   setPartiesLoading]   = useState(false);

  const [totals,  setTotals]  = useState(null);
  const [error,   setError]   = useState("");
  const [notice,  setNotice]  = useState("");

  /* ── Settle / reset / history ───────────────────────────────────────── */
  const [settleFor,   setSettleFor]   = useState(null);
  const [settleForm,  setSettleForm]  = useState(emptySettle());
  const [resetFor,    setResetFor]    = useState(null);
  const [resetReason, setResetReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [historyFor,  setHistoryFor]  = useState(null);
  const [history,     setHistory]     = useState({ loading: false, rows: [], error: "" });

  const firstPage = (m) => (m.page === 0 ? m : { ...m, page: 0 });

  /* The API filters by party, so wait for typing to settle before asking it,
     and start both tabs again from their first page. */
  useEffect(() => {
    const t = setTimeout(() => {
      setPartyFilter(search.trim());
      setPaginationModel(firstPage);
      setPartyPagination(firstPage);
    }, 350);
    return () => clearTimeout(t);
  }, [search, setPaginationModel, setPartyPagination]);

  const setFilter = (setter) => (e) => {
    setter(e.target.value);
    setPaginationModel(firstPage);
    setPartyPagination(firstPage);
  };

  const loadTotals = useCallback(async () => {
    try {
      setTotals(await StockPaymentInfoService.getTotals());
    } catch {
      setTotals(null); // the tiles say so; the list still works
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, total } = await StockPaymentInfoService.getPaymentsPaginated({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        partyName: partyFilter,
        paymentType: typeFilter,
        status: statusFilter,
        inOut: inOutFilter,
      });
      setPayments(Array.isArray(data) ? data : []);
      setRowCount(total || 0);
    } catch (e) {
      setPayments([]);
      setRowCount(0);
      setError(e?.message || "Could not load stock payments.");
    } finally { setLoading(false); }
  }, [paginationModel, partyFilter, typeFilter, statusFilter, inOutFilter]);

  const loadParties = useCallback(async () => {
    setPartiesLoading(true);
    setError("");
    try {
      const { data, total } = await StockPaymentInfoService.getPartySummariesPaginated({
        page: partyPagination.page + 1,
        pageSize: partyPagination.pageSize,
        partyName: partyFilter,
        paymentType: typeFilter,
        status: statusFilter,
      });
      setParties(Array.isArray(data) ? data : []);
      setPartyCount(total || 0);
    } catch (e) {
      setParties([]);
      setPartyCount(0);
      setError(e?.message || "Could not load party totals.");
    } finally { setPartiesLoading(false); }
  }, [partyPagination, partyFilter, typeFilter, statusFilter]);

  useEffect(() => { loadTotals(); }, [loadTotals]);
  useEffect(() => { if (tab === "payments") loadPayments(); }, [tab, loadPayments]);
  useEffect(() => { if (tab === "parties") loadParties(); }, [tab, loadParties]);

  /* A settlement or reset moves the totals and the party figures too. */
  const reloadAll = () => {
    loadTotals();
    if (tab === "payments") loadPayments(); else loadParties();
  };

  /* Clicking a party opens its payments. */
  const openParty = (row) => {
    setSearch(row.partyName || "");
    setPartyFilter(row.partyName || "");
    setTypeFilter(row.paymentType || "all");
    setPaginationModel(firstPage);
    setTab("payments");
  };

  /* ── Settle ─────────────────────────────────────────────────────────── */
  const openSettle = (row) => {
    setSettleFor(row);
    setSettleForm(emptySettle(row));
    setActionError("");
  };

  const handleSettleChange = (e) => setSettleForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* Only a full settlement is accepted: the amount must equal what is outstanding. */
  const outstanding = Number(settleFor?.outstandingAmount) || 0;
  const amountMatches = settleForm.amount !== "" && Math.abs(Number(settleForm.amount) - outstanding) < 0.005;
  const canSettle = amountMatches && settleForm.transactionDate && settleForm.paymentMethod;

  const handleSettle = async () => {
    setSaving(true);
    setActionError("");
    try {
      await StockPaymentInfoService.settle(settleFor.id, settleForm);
      const meta = TYPE_META[settleFor.paymentType];
      setNotice(`${meta?.verb || "Settled with"} ${settleFor.partyName || "party"}: ${inr(settleForm.amount)} for ${settleFor.no}.`);
      setSettleFor(null);
      reloadAll();
    } catch (e) {
      setActionError(isConflict(e)
        ? "This payment is already settled. Close this form to see its current state."
        : e?.message || "Could not settle the payment.");
    } finally { setSaving(false); }
  };

  /* ── Reset ──────────────────────────────────────────────────────────── */
  const openReset = (row) => {
    setResetFor(row);
    setResetReason("");
    setActionError("");
  };

  const handleReset = async () => {
    setSaving(true);
    setActionError("");
    try {
      await StockPaymentInfoService.reset(resetFor.id, resetReason);
      setNotice(`Payment ${resetFor.no} is pending again. The reset is recorded in its history.`);
      setResetFor(null);
      reloadAll();
    } catch (e) {
      setActionError(isConflict(e)
        ? "This payment is already pending, so there is nothing to reset."
        : e?.message || "Could not reset the payment.");
    } finally { setSaving(false); }
  };

  /* ── History ────────────────────────────────────────────────────────── */
  const openHistory = async (row) => {
    setHistoryFor(row);
    setHistory({ loading: true, rows: [], error: "" });
    try {
      const rows = await StockPaymentInfoService.getHistory(row.id);
      rows.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
      setHistory({ loading: false, rows, error: "" });
    } catch (e) {
      setHistory({ loading: false, rows: [], error: e?.message || "Could not load the history." });
    }
  };

  /* ── Grids ──────────────────────────────────────────────────────────── */
  const paymentColumns = [
    { field: "date",        headerName: "Date",        width: 110, valueFormatter: (v) => formatGridDate(v) },
    { field: "no",          headerName: "No.",         width: 170 },
    { field: "paymentType", headerName: "Type",        width: 115, renderCell: (p) => <TypeChip value={p.value} /> },
    { field: "partyName",   headerName: "Party",       flex: 1, minWidth: 140, renderCell: (p) => p.value || "—" },
    { field: "amount",      headerName: "Amount",      width: 120, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "outstandingAmount", headerName: "Outstanding", width: 125, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone={p.value > 0 ? "warning.dark" : "text.secondary"} /> },
    { field: "paymentStatus", headerName: "Status",    width: 115, renderCell: (p) => <StatusChip value={p.value} /> },
    {
      field: "completedAt", headerName: "Completed", width: 140,
      renderCell: (p) => p.value ? (
        <Stack justifyContent="center" sx={{ height: "100%" }}>
          <Typography variant="body2">{formatGridDate(p.value)}</Typography>
          {p.row.completedByUsername && (
            <Typography variant="caption" color="text.secondary" noWrap>by {p.row.completedByUsername}</Typography>
          )}
        </Stack>
      ) : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    { field: "inOut",       headerName: "IN/OUT",       width: 85 },
    { field: "remarks",     headerName: "Remarks",      flex: 1, minWidth: 140, renderCell: (p) => p.value || "—" },
    { field: "accountName", headerName: "Account Name", width: 140 },
    { field: "accountNo",   headerName: "Account No.",  width: 140 },
    { field: "ifsc",        headerName: "IFSC",         width: 110 },
    { field: "bank",        headerName: "Bank",         width: 110 },
    {
      field: "actions", headerName: "", width: 150, sortable: false, filterable: false,
      align: "right", headerAlign: "right",
      renderCell: (p) => {
        const pending = p.row.paymentStatus !== "Completed";
        const meta = TYPE_META[p.row.paymentType];
        return (
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
            {pending ? (
              <Button size="small" variant="outlined" color="success" startIcon={<SettleIcon fontSize="small" />}
                onClick={() => openSettle(p.row)} sx={{ py: 0.25, px: 1, minWidth: 0, whiteSpace: "nowrap" }}>
                {p.row.paymentType === "Receivable" ? "Receive" : "Pay"}
              </Button>
            ) : (
              <Tooltip title="Reset to pending (admin correction)">
                <IconButton size="small" color="warning" aria-label="Reset payment" onClick={() => openReset(p.row)}>
                  <ResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={`History${meta ? ` · ${meta.label}` : ""}`}>
              <IconButton size="small" aria-label="Payment history" onClick={() => openHistory(p.row)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  const partyColumns = [
    { field: "partyName",   headerName: "Party",      flex: 1.2, minWidth: 160, renderCell: (p) => p.value || "—" },
    { field: "paymentType", headerName: "Type",       width: 120, renderCell: (p) => <TypeChip value={p.value} /> },
    { field: "itemCount",   headerName: "Items",      width: 90, align: "center", headerAlign: "center" },
    { field: "totalAmount", headerName: "Total",      width: 140, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} /> },
    { field: "completedAmount", headerName: "Settled", width: 140, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone="success.main" /> },
    { field: "outstandingAmount", headerName: "Outstanding", width: 140, align: "right", headerAlign: "right",
      renderCell: (p) => <Money value={p.value} tone={p.value > 0 ? "warning.dark" : "text.secondary"} /> },
  ];

  const settleMeta = TYPE_META[settleFor?.paymentType];

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Stock Payments</Typography>
        <Typography variant="body2" color="text.secondary">
          Created automatically from stock items: IN stock is owed to the supplier, OUT stock is owed by the buyer.
        </Typography>
      </Box>

      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatTile label="To pay suppliers" icon={PayIcon} color="error"
            value={totals ? inr(totals.pendingPayable) : "—"}
            hint={totals ? "Pending payables" : "Totals could not be loaded"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatTile label="To receive from buyers" icon={ReceiveIcon} color="success"
            value={totals ? inr(totals.pendingReceivable) : "—"}
            hint={totals ? "Pending receivables" : "Totals could not be loaded"} />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "clip" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tab value="payments" label="Payments" />
          <Tab value="parties" label="By party" />
        </Tabs>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by party name"
            sx={{ minWidth: { md: 260 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search"><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField select label="Type" value={typeFilter} onChange={setFilter(setTypeFilter)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="Payable">Payable</MenuItem>
            <MenuItem value="Receivable">Receivable</MenuItem>
          </TextField>
          <TextField select label="Status" value={statusFilter} onChange={setFilter(setStatusFilter)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </TextField>
          {tab === "payments" && (
            <TextField select label="IN/OUT" value={inOutFilter} onChange={setFilter(setInOutFilter)} sx={{ minWidth: 120 }}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="IN">IN</MenuItem>
              <MenuItem value="OUT">OUT</MenuItem>
            </TextField>
          )}
        </Stack>

        <Divider />

        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {tab === "payments" ? (
            <DataGrid
              rows={payments}
              columns={paymentColumns}
              rowCount={rowCount}
              loading={loading}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              {...gridPagerProps}
              getRowId={(r) => r.id}
              initialState={{ columns: { columnVisibilityModel: { accountName: false, accountNo: false, ifsc: false, bank: false } } }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: "No stock payments match your filters.",
              }}
              rowHeight={56}
            />
          ) : (
            <DataGrid
              rows={parties}
              columns={partyColumns}
              rowCount={partyCount}
              loading={partiesLoading}
              paginationMode="server"
              paginationModel={partyPagination}
              onPaginationModelChange={setPartyPagination}
              {...gridPagerProps}
              getRowId={(r) => `${r.partyName}|${r.paymentType}`}
              onRowClick={(p) => openParty(p.row)}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: "No parties match your filters.",
              }}
              rowHeight={52}
              sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
          )}
        </Box>
      </Paper>

      {/* ── Settle ──────────────────────────────────────────────────────── */}
      <FormDrawer
        open={Boolean(settleFor)}
        onClose={() => setSettleFor(null)}
        title={settleMeta?.action || "Settle payment"}
        subtitle={settleFor ? `${settleFor.no} · ${settleFor.partyName || "No party"}` : ""}
        icon={SettleIcon}
        onSave={handleSettle}
        saving={saving}
        disableSave={!canSettle}
        saveText="Settle Payment"
      >
        {actionError && <Alert severity="error" sx={{ mb: 2.5 }}>{actionError}</Alert>}
        {settleFor && (
          <>
            <FormSection title="Outstanding" subtitle="Only the full amount can be settled">
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.5}>
                  <TypeChip value={settleFor.paymentType} />
                  <Typography variant="body2" color="text.secondary">{settleFor.partyName || "—"}</Typography>
                </Stack>
                <Typography variant="h6" className="tabular-nums" sx={{ fontWeight: 700 }}>
                  {inr(settleFor.outstandingAmount)}
                </Typography>
              </Stack>
            </FormSection>

            <FormSection title="Settlement">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AmountField
                    label="Amount"
                    name="amount"
                    required
                    fullWidth
                    value={settleForm.amount}
                    onChange={handleSettleChange}
                    error={settleForm.amount !== "" && !amountMatches}
                    helperText={settleForm.amount !== "" && !amountMatches
                      ? `Must be exactly ${inr(outstanding)}, the full outstanding amount`
                      : undefined}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Date" name="transactionDate" type="date" required fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={settleForm.transactionDate} onChange={handleSettleChange} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select label="Payment Method" name="paymentMethod" required fullWidth
                    value={settleForm.paymentMethod} onChange={handleSettleChange}>
                    {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Reference No." name="referenceNo" fullWidth
                    placeholder="UTR, cheque or receipt no."
                    value={settleForm.referenceNo} onChange={handleSettleChange}
                    inputProps={{ maxLength: 100 }} />
                </Grid>
                <Grid size={12}>
                  <TextField label="Remarks" name="remarks" fullWidth multiline minRows={2}
                    value={settleForm.remarks} onChange={handleSettleChange}
                    inputProps={{ maxLength: 500 }} />
                </Grid>
              </Grid>
            </FormSection>
          </>
        )}
      </FormDrawer>

      {/* ── Reset ───────────────────────────────────────────────────────── */}
      <FormDrawer
        open={Boolean(resetFor)}
        onClose={() => setResetFor(null)}
        title="Reset payment"
        subtitle={resetFor ? `${resetFor.no} · ${resetFor.partyName || "No party"}` : ""}
        icon={ResetIcon}
        onSave={handleReset}
        saving={saving}
        disableSave={!resetReason.trim()}
        saveText="Reset to Pending"
      >
        {actionError && <Alert severity="error" sx={{ mb: 2.5 }}>{actionError}</Alert>}
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          This reopens a completed payment of {inr(resetFor?.amount)}. The settlement stays in the history and the
          reset is recorded with your name and reason.
        </Alert>
        <TextField label="Reason" required fullWidth multiline minRows={3}
          placeholder="Why is this payment being reopened?"
          value={resetReason} onChange={(e) => setResetReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText={`${resetReason.length}/500`} />
      </FormDrawer>

      {/* ── History ─────────────────────────────────────────────────────── */}
      <Drawer anchor="right" open={Boolean(historyFor)} onClose={() => setHistoryFor(null)}
        PaperProps={{ sx: { width: isMobile ? "100vw" : 480, maxWidth: "100vw" } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>Payment history</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {historyFor ? `${historyFor.no} · ${historyFor.partyName || "No party"}` : ""}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setHistoryFor(null)} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Box sx={{ p: 3, overflowY: "auto" }}>
          {history.loading && <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress size={28} /></Box>}
          {history.error && <Alert severity="error">{history.error}</Alert>}
          {!history.loading && !history.error && history.rows.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No settlements or resets yet. This payment has been pending since it was created.
            </Typography>
          )}
          <Stack spacing={1.5}>
            {history.rows.map((h) => {
              const isReset = /reset/i.test(h.eventType || "");
              return (
                <Paper key={h.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Chip size="small" variant="outlined" color={isReset ? "warning" : "success"} label={h.eventType || "Event"} />
                    {!isReset && <Typography variant="subtitle2" className="tabular-nums">{inr(h.amount)}</Typography>}
                  </Stack>
                  <Typography variant="body2">
                    {formatGridDate(h.transactionDate || h.createdAt)}
                    {h.paymentMethod ? ` · ${h.paymentMethod}` : ""}
                    {h.referenceNo ? ` · Ref ${h.referenceNo}` : ""}
                  </Typography>
                  {h.remarks && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{h.remarks}</Typography>}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    By {h.performedByUsername || "unknown"} · recorded {formatGridDate(h.createdAt)}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
