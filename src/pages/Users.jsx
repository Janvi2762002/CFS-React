import React, { useState, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  Stack, Chip, InputAdornment, Tooltip, Paper,
  Divider, Grid, Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import StatTile from "../components/StatTile";
import ConfirmDialog from "../components/ConfirmDialog";
import { PASSWORD_MIN, PASSWORD_MAX, isValidPassword, isValidPhone } from "../common/userValidation";
import AdminService from "../services/AdminService";
import usePagedList from "../common/usePagedList";
import { ROLE_OPTIONS } from "../services/AuthService";
import { paginationDisplayedRows } from "../components/gridPagination";

const ROLE_COLORS = { master: "primary", admin: "success", employee: "info" };
const ROLES = ROLE_OPTIONS.map((r) => ({ ...r, color: ROLE_COLORS[r.value] || "default" }));

function RoleChip({ role }) {
  const r = ROLES.find((x) => x.value === role);
  return (
    <Chip
      size="small"
      variant="outlined"
      color={r?.color || "default"}
      label={r?.label || role || "User"}
    />
  );
}

/* Stable references, so the paging hook does not refetch on every render. */
const fetchUsersPage = (p) => AdminService.getUsersPaginated(p);
const fetchAllUsers = () => AdminService.getUsers();

export default function Users() {
  const [open,       setOpen]       = useState(false);
  const [isEditing,  setIsEditing]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [formData,   setFormData]   = useState({
    username: "", password: "", phoneNumber: "", fullName: "",
    nickName: "", additionalInfo: "", role: "",
  });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const isMobile = useMediaQuery("(max-width:768px)");

  /* The grid pages on the server; a search or role filter needs every user. */
  const filtering = search.trim() !== "" || roleFilter !== "all";
  const list = usePagedList({
    fetchPage: fetchUsersPage,
    fetchAll: fetchAllUsers,
    filtering,
  });

  const handleOpen = (user = null) => {
    if (user) {
      setFormData({
        id: user.id,
        username: user.username || "",
        password: "",
        phoneNumber: user.phoneNumber || "",
        fullName: user.fullName || "",
        nickName: user.nickName || "",
        additionalInfo: user.additionalInfo || "",
        role: user.role || "",
      });
      setIsEditing(true);
    } else {
      setFormData({ username: "", password: "", phoneNumber: "", fullName: "", nickName: "", additionalInfo: "", role: "" });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  /* Mirrors the API's rules (username 3+ characters, password 8–128,
     a valid phone) so the form says what is wrong instead of a 400. */
  const usernameValid = (formData.username?.trim().length || 0) >= 3;
  const passwordEntered = Boolean(formData.password);
  const passwordValid = isEditing && !passwordEntered ? true : isValidPassword(formData.password);
  const phoneValid = isValidPhone(formData.phoneNumber);

  const canSubmit =
    usernameValid && formData.fullName?.trim() && formData.role && passwordValid && phoneValid;

  const passwordHelp =
    isEditing && !passwordEntered ? "Leave blank to keep the current password" :
    passwordEntered && !passwordValid
      ? (formData.password.length < PASSWORD_MIN
        ? `At least ${PASSWORD_MIN} characters (${PASSWORD_MIN - formData.password.length} more)`
        : `At most ${PASSWORD_MAX} characters`)
      : `${PASSWORD_MIN}–${PASSWORD_MAX} characters`;

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.saveUser(formData);
      setOpen(false);
      list.reload();
    } catch (e) {
      setError(e?.message || "Could not create the user.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.updateUser(formData.id, formData);
      setOpen(false);
      list.reload();
    } catch (e) {
      setError(e?.message || "Could not update the user.");
    } finally { setSaving(false); }
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setError("");
    try {
      await AdminService.deleteUser(id);
      list.reload();
    } catch (e) {
      setError(e?.message || "Could not delete the user.");
    }
  };

  const filtered = useMemo(() =>
    list.rows.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
      return matchesSearch && matchesRole;
    }), [list.rows, search, roleFilter]);

  const columns = [
    {
      field: "fullName", headerName: "User Name", flex: 1.2, minWidth: 170,
      renderCell: (p) => (
        <Stack justifyContent="center" sx={{ height: "100%" }}>
          <Typography variant="body2" noWrap>{p.value || "—"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>@{p.row.username}</Typography>
        </Stack>
      ),
    },
    { field: "nickName",       headerName: "Alias / Nickname", flex: 1, minWidth: 130 },
    { field: "phoneNumber",    headerName: "Contact Phone",    width: 150 },
    { field: "additionalInfo", headerName: "Additional Info",  flex: 1, minWidth: 140,
      renderCell: (p) => p.value || "—" },
    { field: "role", headerName: "Role", width: 130,
      renderCell: (p) => <RoleChip role={p.value} /> },
    {
      field: "actions", headerName: "Actions", width: 100, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit user">
            <IconButton size="small" onClick={() => handleOpen(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete user">
            <IconButton size="small" color="error"
              onClick={() => setConfirm({ open: true, id: p.row.id })}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  /* No extra request for the tiles: the total is the count the paged reply
     already carries, and the API reports no per-role counts, so those show 0. */
  const totalUsers = list.rowCount || 0;
  const admins     = 0;
  const employees  = 0;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {list.error && (
        <Alert severity="error" sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={list.reload}>Retry</Button>}>
          {list.error}
        </Alert>
      )}

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Provision and manage Admin and Employee account access.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ whiteSpace: "nowrap" }}>
          Add New User
        </Button>
      </Stack>

      {/* ── Summary Tiles ───────────────────────────────────────────── */}
      <Grid container spacing={2} className="stagger" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Total Users" value={totalUsers} icon={BadgeIcon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Admins"      value={admins}      icon={AdminPanelSettingsIcon} color="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Employees"   value={employees}   icon={PersonIcon} color="info" /></Grid>
      </Grid>

      {/* ── Filters & Data Table ────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ p: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username or role"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField select label="Role" value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">All roles</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
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
              noRowsLabel: "No users match the search criteria.",
              paginationDisplayedRows: paginationDisplayedRows(list.paginationModel),
            }}
            rowHeight={56}
          />
        </Box>
      </Paper>

      {/* ── Add / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Username" name="username" required fullWidth
                value={formData.username} onChange={handleChange}
                inputProps={{ maxLength: 100 }}
                error={formData.username !== "" && !usernameValid}
                helperText={formData.username !== "" && !usernameValid ? "At least 3 characters" : ""} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Password" name="password" type="password" fullWidth
                required={!isEditing} autoComplete="new-password"
                value={formData.password} onChange={handleChange}
                inputProps={{ maxLength: PASSWORD_MAX }}
                error={passwordEntered && !passwordValid}
                helperText={passwordHelp} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Full Name" name="fullName" required fullWidth
                value={formData.fullName} onChange={handleChange} inputProps={{ maxLength: 150 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nick Name / Alias" name="nickName" fullWidth
                value={formData.nickName} onChange={handleChange} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Contact Phone" name="phoneNumber" type="tel" fullWidth
                value={formData.phoneNumber} onChange={handleChange}
                inputProps={{ maxLength: 30, inputMode: "tel" }}
                placeholder="+91 98765 43210"
                error={!phoneValid}
                helperText={!phoneValid ? "Use digits, spaces, + - ( ) only" : ""} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Role" name="role" required fullWidth
                value={formData.role} onChange={handleChange}>
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField label="Additional Info" name="additionalInfo" fullWidth multiline minRows={2}
                value={formData.additionalInfo} onChange={handleChange} inputProps={{ maxLength: 1000 }} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !canSubmit} onClick={isEditing ? handleUpdate : handleSave}>
            {saving ? "Saving…" : isEditing ? "Update Account" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        open={confirm.open}
        title="Delete user?"
        message="This will permanently remove the user account and all associated access. This action cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirm((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
