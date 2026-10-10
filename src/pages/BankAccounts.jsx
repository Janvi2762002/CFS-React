import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  Stack, Paper, Divider, Grid, Alert, InputAdornment, Tooltip, Chip,
  FormControlLabel, Switch, Avatar,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import StatTile from "../components/StatTile";
import ConfirmDialog from "../components/ConfirmDialog";
import { maskAccountNo } from "../components/BankAccountSlider";
import BankAccountService from "../services/BankAccountService";
import BankTransactionService from "../services/BankTransactionService";
import { toLocalDateTime } from "../services/payload";
import { paginationDisplayedRows } from "../components/gridPagination";
import { formatGridDate } from "../components/gridDate";
import usePagedList from "../common/usePagedList";

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const today = () => toLocalDateTime(new Date()).slice(0, 10);

const emptyForm = () => ({
  bankName: "", accountName: "", accountNo: "", isActive: true,
  openingBalance: "", openingDate: today(),
});

/* Spaces and case are ignored when comparing account numbers. */
const normalNo = (v) => String(v || "").replace(/\s+/g, "").toLowerCase();

/* Stable references, so the paging hook does not refetch on every render. */
const fetchAccountsPage = (p) => BankAccountService.getAccountsPaginated(p);
const fetchAllAccounts = () => BankAccountService.getAccounts();

export default function BankAccounts() {
  const theme = useTheme();
  const [balances,        setBalances]        = useState(new Map());
  const [knownAccounts,   setKnownAccounts]   = useState([]);
  const [error,           setError]           = useState("");
  const [notice,          setNotice]          = useState("");
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [open,            setOpen]            = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [formData,        setFormData]        = useState(emptyForm());
  const [saving,          setSaving]          = useState(false);
  const [formError,       setFormError]       = useState("");
  const [confirm,         setConfirm]         = useState({ open: false, account: null });
  const isMobile = useMediaQuery("(max-width:768px)");

  /* The grid pages on the server; a search or status filter needs every
     account, so then the full list is paged locally. */
  const filtering = search.trim() !== "" || statusFilter !== "all";
  const list = usePagedList({ fetchPage: fetchAccountsPage, fetchAll: fetchAllAccounts, filtering });

  /* Balances come from their own (also paged) summary endpoint, so they load
     once per refresh rather than on every page change. They are a
     nice-to-have here; if the call fails the column just shows a dash. */
  const [balancesVersion, setBalancesVersion] = useState(0);
  useEffect(() => {
    let live = true;
    BankAccountService.getBalanceSummaries()
      .then((rows) => { if (live) setBalances(new Map(rows.map((r) => [r.accountId, r.currentBalance]))); })
      .catch(() => { if (live) setBalances(new Map()); });
    return () => { live = false; };
  }, [balancesVersion]);

  const loadAccounts = useCallback(() => {
    list.reload();
    setBalancesVersion((v) => v + 1);
  }, [list.reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const accounts = useMemo(
    () => list.rows.map((a) => ({ ...a, currentBalance: balances.get(a.id) ?? null })),
    [list.rows, balances]
  );

  const handleOpen = (account = null) => {
    if (account) {
      setFormData({
        id: account.id,
        bankName: account.bankName || "",
        accountName: account.accountName || "",
        accountNo: account.accountNo || "",
        isActive: Boolean(account.isActive),
        openingBalance: "",
        openingDate: today(),
      });
      setIsEditing(true);
    } else {
      setFormData(emptyForm());
      setIsEditing(false);
    }
    setFormError("");
    setOpen(true);
    /* The duplicate-number check needs every account, not just this page. */
    BankAccountService.getAccounts().then(setKnownAccounts).catch(() => setKnownAccounts([]));
  };

  const handleChange = (e) => setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* The same number at the same bank is almost certainly a double entry. */
  const duplicate = useMemo(() => {
    const no = normalNo(formData.accountNo);
    if (!no) return null;
    const bank = formData.bankName.trim().toLowerCase();
    return knownAccounts.find((a) =>
      a.id !== formData.id && normalNo(a.accountNo) === no && (a.bankName || "").trim().toLowerCase() === bank
    ) || null;
  }, [knownAccounts, formData.accountNo, formData.bankName, formData.id]);

  const opening = formData.openingBalance === "" ? 0 : Number(formData.openingBalance);
  const openingValid = Number.isFinite(opening) && opening >= 0 && (opening === 0 || Boolean(formData.openingDate));

  const canSubmit =
    formData.bankName.trim() && formData.accountName.trim() && !duplicate && (isEditing || openingValid);

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    setNotice("");
    try {
      if (isEditing) {
        await BankAccountService.updateAccount(formData.id, formData);
      } else {
        const created = await BankAccountService.createAccount(formData);
        /* The API keeps an opening balance as an OPENING transaction, not on
           the account, so it is a second call. The account already exists by
           then, so a failure here is reported but does not undo the save. */
        if (opening > 0) {
          const fix = "Add it under Transactions as an Opening transaction.";
          if (created?.id == null) {
            setNotice(`The account was added, but the server did not return its ID, so the opening balance was not recorded. ${fix}`);
          } else {
            try {
              await BankTransactionService.createTransaction({
                accountId: created.id,
                transactionType: "OPENING",
                transactionDate: formData.openingDate,
                amount: opening,
                remarks: "Opening balance",
              });
            } catch (e) {
              setNotice(`The account was added, but its opening balance could not be saved (${e?.message || "unknown error"}). ${fix}`);
            }
          }
        }
      }
      setOpen(false);
      loadAccounts();
    } catch (e) {
      // Shown inside the dialog: a page-level alert would sit behind it.
      setFormError(e?.message || (isEditing ? "Could not update the account." : "Could not add the account."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.account?.id;
    setError("");
    setNotice("");
    try {
      await BankAccountService.deleteAccount(id);
      loadAccounts();
    } catch (e) {
      setError(e?.message || "Could not delete the account. If it has transactions, mark it inactive instead.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? a.isActive : !a.isActive;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [a.bankName, a.accountName, a.accountNo].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [accounts, search, statusFilter]);

  /* No extra request for the tiles: the total is the count the paged reply
     already carries, and the API reports no active / inactive counts. */
  const totalAccounts = list.rowCount || 0;

  const columns = [
    {
      field: "bankName", headerName: "Bank", flex: 1, minWidth: 180,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: "100%", minWidth: 0 }}>
          <Avatar
            variant="rounded"
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: "primary.main", width: 30, height: 30 }}
          >
            <AccountBalanceIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Typography variant="body2" noWrap>{p.value || "—"}</Typography>
        </Stack>
      ),
    },
    { field: "accountName", headerName: "Account Name", flex: 1, minWidth: 160 },
    {
      field: "accountNo", headerName: "Account No.", width: 150,
      valueFormatter: (v) => (v ? maskAccountNo(v) : "—"),
    },
    {
      field: "currentBalance", headerName: "Current Balance", type: "number", width: 160,
      renderCell: (p) => p.value == null
        ? <Typography variant="body2" color="text.disabled">—</Typography>
        : (
          <Typography variant="body2" className="tabular-nums"
            sx={{ fontWeight: 600, color: p.value < 0 ? "error.main" : "text.primary" }}>
            {inr(p.value)}
          </Typography>
        ),
    },
    {
      field: "isActive", headerName: "Status", width: 110,
      renderCell: (p) => (
        <Chip size="small" variant="outlined" color={p.value ? "success" : "default"} label={p.value ? "Active" : "Inactive"} />
      ),
    },
    { field: "createdAt", headerName: "Added On", width: 125, valueFormatter: (v) => formatGridDate(v) },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, filterable: false,
      align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit account">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete account">
            <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, account: p.row })}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const confirmName = confirm.account
    ? [confirm.account.bankName, confirm.account.accountName].filter(Boolean).join(" · ")
    : "";

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {list.error && (
        <Alert severity="error" sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={loadAccounts}>Retry</Button>}>
          {list.error}
        </Alert>
      )}
      {notice && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Bank Accounts</Typography>
          <Typography variant="body2" color="text.secondary">
            Add the bank accounts that transactions are recorded against.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
          Add Bank Account
        </Button>
      </Stack>

      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Bank Accounts" value={totalAccounts} icon={AccountBalanceIcon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Active" value={0} icon={CheckCircleIcon} color="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Inactive" value={0} icon={BlockIcon} color="warning" /></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bank, account name or number"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
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
          <TextField select label="Status" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>

        <Divider />

        {/* A flex-column parent lets the grid grow with its rows, so the page
            scrolls instead of the grid clipping rows inside a fixed box. */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            loading={list.loading}
            disableRowSelectionOnClick
            {...list.gridProps}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            localeText={{
              noRowsLabel: filtering ? "No accounts match your filters." : "No bank accounts yet. Add the first one above.",
              paginationDisplayedRows: paginationDisplayedRows(list.paginationModel),
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      {/* ── Add / Edit dialog ───────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        <Divider />
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Name" name="bankName" required fullWidth autoFocus
                placeholder="e.g. HDFC Bank"
                value={formData.bankName} onChange={handleChange} inputProps={{ maxLength: 150 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Account Name" name="accountName" required fullWidth
                placeholder="e.g. Current A/C"
                value={formData.accountName} onChange={handleChange} inputProps={{ maxLength: 150 }} />
            </Grid>
            <Grid size={12}>
              <TextField label="Account Number" name="accountNo" fullWidth
                value={formData.accountNo} onChange={handleChange} inputProps={{ maxLength: 50 }}
                error={Boolean(duplicate)}
                helperText={duplicate
                  ? `Already added as ${duplicate.bankName} · ${duplicate.accountName}`
                  : "Only the last four digits are shown elsewhere in the app."} />
            </Grid>

            {!isEditing && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Opening Balance" name="openingBalance" type="number" fullWidth
                    value={formData.openingBalance} onChange={handleChange}
                    inputProps={{ min: 0, step: "0.01" }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    error={!openingValid && formData.openingBalance !== ""}
                    helperText="Optional. Recorded as the account's Opening transaction." />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Opening Date" name="openingDate" type="date" fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={formData.openingDate} onChange={handleChange}
                    disabled={!(opening > 0)} />
                </Grid>
              </>
            )}

            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(formData.isActive)}
                    onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                }
                label="Active — inactive accounts take no new transactions"
              />
            </Grid>
            {isEditing && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">
                  To change the opening balance, edit the account's Opening transaction under Transactions.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSubmit} onClick={handleSubmit}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Account"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title="Delete bank account?"
        message={`Delete ${confirmName || "this account"}? If it has transactions, the server may refuse or delete them with it. To stop using an account but keep its history, edit it and switch Active off instead.`}
        confirmLabel="Delete Account"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
