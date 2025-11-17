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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: null, // only used for edit
    username: "",
    password: "",
    phoneNumber: "",
    fullName: "",
    nickName: "",
    additionalInfo: "",
    role: "",
  });

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Load Users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getUsers();
      setUsers(data.resultObject || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  // Open modal
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
      setFormData({
        id: null,
        username: "",
        password: "",
        phoneNumber: "",
        fullName: "",
        nickName: "",
        additionalInfo: "",
        role: "",
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!formData.username || !formData.phoneNumber || !formData.fullName || !formData.nickName || !formData.role) {
      return alert("Please fill all required fields.");
    }

    const payload = isEditing ? formData : { ...formData, id: undefined };

    try {
      await AdminService.saveUser(payload);
      await loadUsers();
      handleClose();
    } catch (error) {
      console.error("Failed to save user:", error);
      alert("Unable to save user.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await AdminService.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user.");
    }
  };

  const columns = [
    { field: "username", headerName: "Username", flex: 1 },
    { field: "phoneNumber", headerName: "Phone Number", flex: 1 },
    { field: "fullName", headerName: "Full Name", flex: 1 },
    { field: "nickName", headerName: "Nick Name", flex: 1 },
    { field: "additionalInfo", headerName: "Additional Info", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: (params) => <Typography sx={{ textTransform: "capitalize", fontWeight: 100 }}>{params.value}</Typography>,
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

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      ) : (
        <div style={{ height: 420, width: "100%" }}>
          <DataGrid rows={users} columns={columns} pageSize={5} disableRowSelectionOnClick getRowId={(row) => row.id} />
        </div>
      )}

      <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: "bold" }}>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <TextField label="Username" name="username" value={formData.username} onChange={handleChange} required fullWidth />
            <TextField label="Password" name="password" value={formData.password} onChange={handleChange} fullWidth />
            <TextField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required fullWidth />
            <TextField label="Nick Name" name="nickName" value={formData.nickName} onChange={handleChange} required fullWidth />
            <TextField label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required fullWidth />
            <TextField label="Additional Info" name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} fullWidth />
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select name="role" value={formData.role} onChange={handleChange} label="Role">
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
