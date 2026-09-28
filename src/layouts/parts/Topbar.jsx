import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, IconButton, Typography, Box, Stack, Tooltip,
  Menu, MenuItem, ListItemIcon, Divider, Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import PersonIcon from "@mui/icons-material/PersonOutline";
import { useAuth } from "../../common/AuthContext";
import { useColorMode } from "../../theme/ThemeModeProvider";

const PAGE_TITLES = {
  "/dashboard":     { title: "Dashboard",         sub: "Real-time operational overview" },
  "/transactions":  { title: "Card Swipes",       sub: "Swipe transaction register" },
  "/payments":      { title: "Card Payments",     sub: "Party payment summaries & settlements" },
  "/users":         { title: "User Management",   sub: "System access & role control" },
  "/stock-items":   { title: "Stock Items",       sub: "Inventory & stock movement" },
  "/stock-payments":{ title: "Stock Payments",    sub: "Payments for stock items" },
  "/cash-ledger":   { title: "Cash Ledger",       sub: "Incoming and outgoing cash register" },
};

const ROLE_LABEL = { master: "Master Administrator", admin: "Admin Controller", employee: "Employee Staff" };

export default function Topbar({ onToggleSidebar, onToggleMobile, collapsed }) {
  const { userRole, handleLogout } = useAuth();
  const { mode, toggle } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  const page  = PAGE_TITLES[location.pathname] || { title: "AU Group", sub: "Control Centre" };
  const label = ROLE_LABEL[userRole] || userRole || "";
  const initials = (userRole || "?").charAt(0).toUpperCase();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60, md: 64 }, px: { xs: 2, md: 3 } }}>

        {/* Mobile menu button */}
        <IconButton onClick={onToggleMobile} edge="start" sx={{ display: { md: "none" } }}>
          <MenuIcon />
        </IconButton>

        {/* Desktop sidebar toggle button */}
        <IconButton onClick={onToggleSidebar} edge="start" sx={{ display: { xs: "none", md: "inline-flex" } }}>
          {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>

        {/* Page Title */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 500, lineHeight: 1.25 }}>
            {page.title}
          </Typography>
          {page.sub && (
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              {page.sub}
            </Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Controls */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={toggle}>
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

          <Tooltip title={`${label} account`}>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "primary.main" }}>
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Stack>

        {/* User Account Dropdown Menu */}
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { width: 230, mt: 1 } } }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="caption" color="text.secondary">Role: {userRole}</Typography>
          </Box>
          <Divider />
          {userRole === "master" && (
            <MenuItem onClick={() => { setAnchor(null); navigate("/parties"); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              User Management
            </MenuItem>
          )}
          <MenuItem onClick={() => { setAnchor(null); handleLogout(); }}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
