import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Drawer, List, ListItem, ListItemText, AppBar, Toolbar, Button, Box } from "@mui/material";

const drawerWidth = 200;

const MainLayout = ({ role, onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { text: "Dashboard", path: "/dashboard" },
    { text: "Transactions", path: "/transactions" },
  ];

  if (role === "admin") {
    menuItems.push({ text: "Users", path: "/Parties" });
  }

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem button key={item.text} onClick={() => navigate(item.path)}>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <Box sx={{ flexGrow: 1 }}>Welcome, {role}</Box>
            <Button color="inherit" onClick={onLogout}>Logout</Button>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
