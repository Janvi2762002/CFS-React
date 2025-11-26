import { Link, Outlet, useNavigate } from "react-router-dom";
import { Drawer, List, ListItemButton, ListItemText, Box, Toolbar, AppBar, Typography, Button } from "@mui/material";

export default function Layout({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); // optional
    navigate("/login");
  };

  const menuItems =
  role === "admin"
    ? [
        { text: "Dashboard", path: "/" },
        { text: "Transactions", path: "/transactions" },
        { text: "Payments", path: "/payments" },  
      ]
  : role === "master"
    ? [
        { text: "Dashboard", path: "/" },
        { text: "Transactions", path: "/transactions" },
        { text: "Parties", path: "/parties" },    // Admin sees Parties but no Payments
      ]
    : [
        { text: "Dashboard", path: "/dashboard" },
        { text: "Transactions", path: "/transactions" },
      ];

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            CFS System
          </Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{ width: 240, [`& .MuiDrawer-paper`]: { width: 240 } }}
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItemButton component={Link} to={item.path} key={item.text}>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
