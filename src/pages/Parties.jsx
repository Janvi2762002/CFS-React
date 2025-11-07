import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Edit, Delete } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import AdminService from "../services/AdminService";

const Parties = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // For loader
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    phone: "",
    email: "",
    role: "",
  });

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // ✅ Fetch Users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert("Unable to load users. Please check your connection or token.");
    } finally {
      setLoading(false);
    }
  };

  // Modal open/close
  const handleOpen = (user = null) => {
    if (user) {
      setFormData(user);
      setIsEditing(true);
    } else {
      setFormData({ id: null, name: "", phone: "", email: "", role: "" });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ id: null, name: "", phone: "", email: "", role: "" });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Save or Update User (for now, local state)
  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.role)
      return alert("Please fill all fields including role.");

    if (isEditing) {
      setUsers(users.map((u) => (u.id === formData.id ? formData : u)));
    } else {
      setUsers([...users, { ...formData, id: Date.now() }]);
    }
    handleClose();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  // Table Columns
  const columns = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "phone", headerName: "Phone Number", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: (params) => (
        <Typography sx={{ textTransform: "capitalize", fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
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
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          User Management
        </Typography>
        <Button variant="contained" onClick={() => handleOpen()}>
          Add User
        </Button>
      </Box>

      {/* ✅ Loader while fetching users */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      ) : (
        <div style={{ height: 420, width: "100%" }}>
          <DataGrid
            rows={users}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            disableRowSelectionOnClick
            sx={{ borderRadius: 2, boxShadow: 2 }}
          />
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditing ? "Edit User" : "Add New User"}
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" display="flex" flexDirection="column" gap={3} mt={1}>
            <TextField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />

            <TextField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />

            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {isEditing ? "Update User" : "Add User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Parties;
