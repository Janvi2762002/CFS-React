import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, TextField, Typography, IconButton, MenuItem, Stack, Paper,
  Divider, Alert, InputAdornment, Chip, Tooltip, Grid, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import BankAccountSlider, { maskAccountNo } from "../components/BankAccountSlider";
import ConfirmDialog from "../components/ConfirmDialog";
import BankAccountService from "../services/BankAccountService";
import BankTransactionService, {
  TRANSACTION_TYPES, directionOf, isTransfer, withRunningBalance,
} from "../services/BankTransactionService";
import { toLocalDateTime } from "../services/payload";
import { paginationDisplayedRows } from "../components/gridPagination";
import { formatGridDate } from "../components/gridDate";

const ALL = "all";

/* Every transaction is held client-side (the API does not page them), so
   the grid can order the full list newest first. */
const NEWEST_FIRST = { sorting: { sortModel: [{ field: "transactionDate", sort: "desc" }] } };

const TYPE_META = {
  OPENING:      { color: "default" },
  IN:           { color: "success" },
  OUT:          { color: "error" },
  TRANSFER_IN:  { color: "secondary" },
  TRANSFER_OUT: { color: "warning" },
};
const TYPE_LABEL = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.label]));

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/* Debit and credit cells stay blank on the side a row does not touch, the
   way a bank statement reads. */
function Money({ value, tone = "text.primary" }) {
  if (value == null) return null;
  return (
    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: tone }}>
      {inr(value)}
    </Typography>
  );
}

const accountLabel = (a) =>
  a ? [a.bankName, a.accountName].filter(Boolean).join(" · ") || `Account #${a.id}` : "";

const today = () => toLocalDateTime(new Date()).slice(0, 10);

const emptyForm = (accountId = "") => ({
  accountId, transactionType: "IN", transactionDate: today(), amount: "",
  relatedAccountId: "", referenceNo: "", remarks: "",
});

export default function BankTransactions() {
  const navigate = useNavigate();

  /* ── Accounts & balances ────────────────────────────────────────────── */
  const [accounts,        setAccounts]        = useState([]);
  const [totalBalance,    setTotalBalance]    = useState(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError,   setAccountsError]   = useState("");
  const [balancesError,   setBalancesError]   = useState("");

  /* ── Transactions ───────────────────────────────────────────────────── */
  const [selected,         setSelected]         = useState(ALL);
  const [transactions,     setTransactions]     = useState([]);
  const [txLoading,        setTxLoading]        = useState(true);
  const [txError,          setTxError]          = useState("");
  const [search,           setSearch]           = useState("");
  const [typeFilter,       setTypeFilter]       = useState(ALL);
  const [paginationModel,  setPaginationModel]  = useState({ page: 0, pageSize: 25 });
  const [columnVisibility, setColumnVisibility] = useState({});
  const txRequest = useRef(0);

  /* ── Add / edit dialog ──────────────────────────────────────────────── */
  const [open,      setOpen]      = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData,  setFormData]  = useState(emptyForm());
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [confirm,   setConfirm]   = useState({ open: false, id: null });
  const isMobile = useMediaQuery("(max-width:768px)");

  /* `quiet` refreshes balances after a save without flashing the cards
     back to skeletons. */
  const loadAccounts = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setAccountsLoading(true);
    setAccountsError("");
    setBalancesError("");

    /* The account list is essential; balances are not. If only the summary
       calls fail, the cards still render and say their balances are missing. */
    const [list, summaries, total] = await Promise.allSettled([
      BankAccountService.getAccounts(),
      BankAccountService.getBalanceSummaries(),
      BankAccountService.getTotalBalance(),
    ]);

    if (list.status === "rejected") {
      setAccounts([]);
      setTotalBalance(null);
      setAccountsError(list.reason?.message || "Could not load bank accounts.");
      setAccountsLoading(false);
      return;
    }

    const byId = new Map(
      (summaries.status === "fulfilled" ? summaries.value : []).map((s) => [s.accountId, s])
    );
    setAccounts(list.value.map((a) => ({ ...a, summary: byId.get(a.id) || null })));
    setTotalBalance(total.status === "fulfilled" && typeof total.value === "number" ? total.value : null);

    const failed = [summaries, total].find((r) => r.status === "rejected");
    if (failed) setBalancesError(failed.reason?.message || "Account balances could not be loaded.");
    setAccountsLoading(false);
  }, []);

  const loadTransactions = useCallback(async () => {
    // Switching accounts quickly must not let a slower, older reply win.
    const request = ++txRequest.current;
    setTxLoading(true);
    setTxError("");
    try {
      const rows = selected === ALL
        ? await BankTransactionService.getTransactions()
        : await BankTransactionService.getByAccount(selected);
      if (request !== txRequest.current) return;
      const withBalance = withRunningBalance(rows);
      /* An account's own rows are its full history; any row of another
         account here is a fragment, so its running balance would be wrong. */
      setTransactions(selected === ALL
        ? withBalance
        : withBalance.map((r) => (r.accountId === selected ? r : { ...r, balance: null })));
    } catch (e) {
      if (request !== txRequest.current) return;
      setTransactions([]);
      setTxError(e?.message || "Could not load transactions.");
    } finally {
      if (request === txRequest.current) setTxLoading(false);
    }
  }, [selected]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const selectAccount = (id) => {
    setSelected(id);
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  };

  /* Clicking the selected card again goes back to every account. */
  const handleCardSelect = (id) => selectAccount(id === selected ? ALL : id);

  const handleRefresh = () => {
    loadAccounts();
    loadTransactions();
  };

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  /* Rows carry `account` / `relatedAccount` only when the API includes them,
     so fall back to the account list for names. */
  const accountOf = useCallback((r) => r.account || accountsById.get(r.accountId), [accountsById]);
  const relatedOf = useCallback(
    (r) => r.relatedAccountId == null ? null : (r.relatedAccount || accountsById.get(r.relatedAccountId) || { id: r.relatedAccountId }),
    [accountsById]
  );

  /* ── Add / edit / delete ────────────────────────────────────────────── */

  const handleOpen = (row = null) => {
    if (row) {
      setFormData({
        id: row.id,
        accountId: row.accountId ?? "",
        transactionType: String(row.transactionType || "").toUpperCase(),
        transactionDate: row.transactionDate ? row.transactionDate.split("T")[0] : "",
        amount: row.amount ?? "",
        relatedAccountId: row.relatedAccountId ?? "",
        referenceNo: row.referenceNo || "",
        remarks: row.remarks || "",
      });
      setIsEditing(true);
    } else {
      // Start on the account being viewed, or the only active one.
      const active = accounts.filter((a) => a.isActive);
      const preset = selected !== ALL ? selected : active.length === 1 ? active[0].id : "";
      setFormData(emptyForm(preset));
      setIsEditing(false);
    }
    setFormError("");
    setOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => {
      const next = { ...f, [name]: value };
      // A related account only means something on a transfer, and never the same account.
      if (name === "transactionType" && !isTransfer(value)) next.relatedAccountId = "";
      if (name === "accountId" && value === f.relatedAccountId) next.relatedAccountId = "";
      return next;
    });
  };

  const transfer = isTransfer(formData.transactionType);
  const canSubmit =
    formData.accountId !== "" &&
    formData.transactionType &&
    formData.transactionDate &&
    Number(formData.amount) > 0 &&
    (!transfer || (formData.relatedAccountId !== "" && formData.relatedAccountId !== formData.accountId));

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    try {
      if (isEditing) {
        await BankTransactionService.updateTransaction(formData.id, formData);
      } else if (isTransfer(formData.transactionType)) {
        const fromAccountId = formData.transactionType === "TRANSFER_IN" ? formData.relatedAccountId : formData.accountId;
        const toAccountId = formData.transactionType === "TRANSFER_IN" ? formData.accountId : formData.relatedAccountId;
        await BankTransactionService.createTransfer({
          fromAccountId,
          toAccountId,
          transactionDate: formData.transactionDate,
          amount: formData.amount,
          referenceNo: formData.referenceNo,
          remarks: formData.remarks,
        });
      } else {
        await BankTransactionService.createTransaction(formData);
      }
      setOpen(false);
      // Balances move with every transaction, so the cards refresh too.
      await Promise.all([loadAccounts({ quiet: true }), loadTransactions()]);
    } catch (e) {
      // Shown inside the dialog: a page-level alert would sit behind it.
      setFormError(e?.message || (isEditing ? "Could not update the transaction." : "Could not add the transaction."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setTxError("");
    try {
      await BankTransactionService.deleteTransaction(id);
      await Promise.all([loadAccounts({ quiet: true }), loadTransactions()]);
    } catch (e) {
      setTxError(e?.message || "Could not delete the transaction.");
    }
  };

  /* ── Grid ───────────────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((r) => {
      const matchesType = typeFilter === ALL || String(r.transactionType).toUpperCase() === typeFilter;
      if (!matchesType) return false;
      if (!q) return true;
      return [r.remarks, r.referenceNo, accountLabel(accountOf(r)), accountLabel(relatedOf(r))]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [transactions, search, typeFilter, accountOf, relatedOf]);

  const columns = [
    { field: "transactionDate", headerName: "Date", width: 108, valueFormatter: (v) => formatGridDate(v) },
    {
      field: "accountId", headerName: "Account", flex: 1, minWidth: 110,
      valueGetter: (v, row) => accountLabel(accountOf(row)) || (v != null ? `Account #${v}` : ""),
    },
    {
      field: "transactionType", headerName: "Type", width: 115, type: "singleSelect",
      valueOptions: TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label })),
      renderCell: (p) => (
        <Chip
          size="small"
          variant="outlined"
          color={TYPE_META[p.value]?.color || "default"}
          label={TYPE_LABEL[p.value] || p.value || "—"}
        />
      ),
    },
    {
      /* The other side of a transfer rides under the description rather than
         in its own column, which kept Debit / Credit / Balance off-screen. */
      field: "remarks", headerName: "Description", flex: 1.4, minWidth: 125,
      renderCell: (p) => {
        const other = relatedOf(p.row);
        const name = other ? accountLabel(other) || `Account #${other.id}` : "";
        return (
          <Stack justifyContent="center" sx={{ height: "100%", minWidth: 0 }}>
            <Typography variant="body2" noWrap>{p.value || "—"}</Typography>
            {name && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {directionOf(p.row) === "debit" ? "To" : "From"} {name}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    { field: "referenceNo", headerName: "Reference", width: 95, renderCell: (p) => p.value || "—" },
    {
      field: "debit", headerName: "Debit", type: "number", width: 105,
      valueGetter: (v, row) => (directionOf(row) === "debit" ? Number(row.amount) || 0 : null),
      renderCell: (p) => <Money value={p.value} tone="error.main" />,
    },
    {
      field: "credit", headerName: "Credit", type: "number", width: 105,
      valueGetter: (v, row) => (directionOf(row) === "credit" ? Number(row.amount) || 0 : null),
      renderCell: (p) => <Money value={p.value} tone="success.main" />,
    },
    {
      field: "balance", headerName: "Balance", type: "number", width: 115,
      description: "Running balance of the account after this transaction",
      renderCell: (p) => <Money value={p.value} tone={p.value < 0 ? "error.main" : "text.primary"} />,
    },
    {
      field: "actions", headerName: "Actions", width: 80, sortable: false, filterable: false,
      align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit transaction">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete transaction">
            <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, id: p.row.id })}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const selectedAccount = selected === ALL ? null : accountsById.get(selected);

  return (
    <Box className="page-enter">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" gutterBottom>Transactions</Typography>
          <Typography variant="body2" color="text.secondary">
            Bank account balances and the transactions behind them.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          {totalBalance != null && (
            <Box sx={{ textAlign: { sm: "right" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Total balance
              </Typography>
              <Typography
                variant="h6"
                className="tabular-nums"
                sx={{ fontWeight: 600, lineHeight: 1.2, color: totalBalance < 0 ? "error.main" : "primary.main" }}
              >
                {inr(totalBalance)}
              </Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={accountsLoading || txLoading}
            sx={{ whiteSpace: "nowrap" }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* ── Account cards ───────────────────────────────────────────────── */}
      {accountsError ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={() => loadAccounts()}>Retry</Button>}
        >
          {accountsError}
        </Alert>
      ) : (
        <Box sx={{ mb: 3 }}>
          {balancesError && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setBalancesError("")}>
              Balances could not be loaded: {balancesError}
            </Alert>
          )}
          <BankAccountSlider
            accounts={accounts}
            loading={accountsLoading}
            selectedId={selected === ALL ? null : selected}
            onSelect={handleCardSelect}
            onAddAccount={() => navigate("/bank-accounts")}
          />
        </Box>
      )}

      {/* ── Transactions ────────────────────────────────────────────────── */}
      {txError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={loadTransactions}>Retry</Button>}
        >
          {txError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1.5}
          sx={{ px: 2, pt: 2 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Transactions</Typography>
            {selectedAccount ? (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${accountLabel(selectedAccount)} · ${maskAccountNo(selectedAccount.accountNo)}`}
                onDelete={() => selectAccount(ALL)}
                sx={{ mt: 0.5, maxWidth: "100%" }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                All accounts · select a card above to see one account
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={accounts.length === 0}
            sx={{ whiteSpace: "nowrap", alignSelf: { xs: "flex-start", sm: "center" } }}
          >
            Add Transaction
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, reference or account"
            sx={{ minWidth: { md: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField
            select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: { md: 160 } }}
          >
            <MenuItem value={ALL}>All types</MenuItem>
            {TRANSACTION_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
        </Stack>

        <Divider />

        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            loading={txLoading}
            initialState={NEWEST_FIRST}
            columnVisibilityModel={{ ...columnVisibility, accountId: selected === ALL }}
            onColumnVisibilityModelChange={setColumnVisibility}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: transactions.length
                ? "No transactions match your filters."
                : selectedAccount ? "No transactions for this account yet." : "No transactions recorded yet.",
              paginationDisplayedRows: paginationDisplayedRows(paginationModel),
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      {/* ── Add / Edit dialog ───────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        <Divider />
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={12}>
              <TextField
                select
                label="Bank Account"
                name="accountId"
                required
                fullWidth
                value={formData.accountId}
                onChange={handleChange}
              >
                {accounts.map((a) => (
                  // Inactive accounts take no new entries, but an existing one stays editable.
                  <MenuItem key={a.id} value={a.id} disabled={!a.isActive && a.id !== formData.accountId}>
                    {accountLabel(a)}{a.accountNo ? ` (${maskAccountNo(a.accountNo)})` : ""}
                    {!a.isActive ? " — inactive" : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Type"
                name="transactionType"
                required
                fullWidth
                value={formData.transactionType}
                onChange={handleChange}
              >
                {TRANSACTION_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Date"
                name="transactionDate"
                type="date"
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.transactionDate}
                onChange={handleChange}
              />
            </Grid>
            {transfer && (
              <Grid size={12}>
                <TextField
                  select
                  label={formData.transactionType === "TRANSFER_OUT" ? "To Account" : "From Account"}
                  name="relatedAccountId"
                  required
                  fullWidth
                  value={formData.relatedAccountId}
                  onChange={handleChange}
                  helperText="The other account in this transfer"
                >
                  {accounts.filter((a) => a.id !== formData.accountId).map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {accountLabel(a)}{a.accountNo ? ` (${maskAccountNo(a.accountNo)})` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Amount"
                name="amount"
                type="number"
                required
                fullWidth
                value={formData.amount}
                onChange={handleChange}
                inputProps={{ min: 0.01, step: "0.01" }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reference No."
                name="referenceNo"
                fullWidth
                value={formData.referenceNo}
                onChange={handleChange}
                inputProps={{ maxLength: 100 }}
                placeholder="UTR, cheque or transfer ID"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                name="remarks"
                fullWidth
                multiline
                minRows={2}
                value={formData.remarks}
                onChange={handleChange}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSubmit} onClick={handleSubmit}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Transaction"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title="Delete transaction?"
        message="This permanently removes the transaction and changes the account's balance. This cannot be undone."
        confirmLabel="Delete Transaction"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
