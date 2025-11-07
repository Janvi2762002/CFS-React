import React, { useState } from "react";
import {
  Box, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const Users = () => {
  const [users, setUsers] = useState([
    { id: 1, name: "John Doe", phone: "9876543210" },
    { id: 2, name: "Jane Smith", phone: "8765432109" },
  ]);

  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });

  const handleOpen = (user = null) => {
    setEditUser(user);
    setForm(user || { name: "", phone: "" });
    setOpen(true);
  };

  const handleClose = () => {
    setForm({ name: "", phone: "" });
    setEditUser(null);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (editUser) {
      setUsers(users.map(u => (u.id === editUser.id ? { ...u, ...form } : u)));
    } else {
      setUsers([...users, { id: Date.now(), ...form }]);
    }
    handleClose();
  };

  const handleDelete = (id) => setUsers(users.filter(u => u.id !== id));

  const columns = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "phone", headerName: "Phone", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => handleOpen(params.row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Manage Users
      </Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => handleOpen()}>
        Add User
      </Button>
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid rows={users} columns={columns} pageSize={5} />
      </div>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editUser ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
