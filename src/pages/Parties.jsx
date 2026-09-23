import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography, IconButton, useMediaQuery, MenuItem,
  CircularProgress, Stack, Chip, InputAdornment, Tooltip, Paper,
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
import AdminService from "../services/AdminService";
import { ROLE_OPTIONS } from "../services/AuthService";

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

export default function Parties() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [open,      setOpen]      = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search,    setSearch]    = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [formData,  setFormData]  = useState({ username: "", password: "", phoneNumber: "", fullName: "", nickName: "", additionalInfo: "", role: "" });
  const isMobile = useMediaQuery("(max-width:768px)");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await AdminService.getUsers());
    } catch (e) {
      setUsers([]);
      setError(e?.message || "Could not load users.");
    } finally { setLoading(false); }
  };

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

  const canSubmit =
    formData.username?.trim() && formData.fullName?.trim() && formData.role &&
    (isEditing || formData.password);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.saveUser(formData);
      setOpen(false);
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Could not create the user.");
    } finally { setSaving(false); }
  };

  /* A blank password field means "leave the existing one alone", so it is
     dropped from the payload rather than sent as an empty string. */
  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await AdminService.updateUser(formData.id, formData);
      setOpen(false);
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Could not update the user.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setError("");
    try {
      await AdminService.deleteUser(id);
      setUsers((u) => u.filter((x) => x.id !== id));
    } catch (e) {
      setError(e?.message || "Could not delete the user.");
    }
  };

  const filtered = useMemo(() =>
    users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
      return matchesSearch && matchesRole;
    }), [users, search, roleFilter]);

  const columns = [
    { field: "fullName", headerName: "User Name", flex: 1.2, minWidth: 170,
      renderCell: (p) => (
        <Stack justifyContent="center" sx={{ height: "100%" }}>
          <Typography variant="body2" noWrap>{p.value || "—"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>@{p.row.username}</Typography>
        </Stack>
      ),
    },
    { field: "nickName",       headerName: "Alias / Nickname",  flex: 1, minWidth: 130 },
    { field: "phoneNumber",    headerName: "Contact Phone",     width: 150 },
    { field: "additionalInfo", headerName: "Additional Info",   flex: 1, minWidth: 140,
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
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  /* Role summaries */
  const admins    = users.filter((u) => u.role === "admin").length;
  const employees = users.filter((u) => u.role === "employee").length;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
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
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Total Users" value={users.length} icon={BadgeIcon} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Admins"      value={admins} icon={AdminPanelSettingsIcon} color="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatTile label="Employees"   value={employees} icon={PersonIcon} color="info" /></Grid>
      </Grid>

      {/* ── Filters & Data Table ────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
          sx={{ p: 2 }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username or role"
            sx={{ minWidth: { sm: 280 }, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <TextField
            select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All roles</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <Divider />

        {loading ? (
          <Box sx={{ py: 10, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              pageSizeOptions={[10, 25, 50]}
              localeText={{ noRowsLabel: "No users match the search criteria." }}
              rowHeight={56}
            />
          </Box>
        )}
      </Paper>

      {/* ── Add / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Username" name="username" required fullWidth
                value={formData.username} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Password" name="password" type="password" fullWidth
                required={!isEditing}
                autoComplete="new-password"
                value={formData.password} onChange={handleChange}
                helperText={isEditing ? "Leave blank to keep the current password" : ""} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Full Name" name="fullName" required fullWidth
                value={formData.fullName} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nick Name / Alias" name="nickName" fullWidth
                value={formData.nickName} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Contact Phone" name="phoneNumber" fullWidth
                value={formData.phoneNumber} onChange={handleChange} />
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
                value={formData.additionalInfo} onChange={handleChange} />
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
    </Box>
  );
}
