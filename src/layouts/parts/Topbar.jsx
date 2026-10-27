import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, IconButton, Typography, Box, Stack, Tooltip,
  Menu, MenuItem, ListItemIcon, Divider, Avatar,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import { useAuth } from "../../common/AuthContext";
import { useColorMode } from "../../theme/ThemeModeProvider";
import { findRoute } from "../nav";

const ROLE_LABEL = { master: "Master Administrator", admin: "Admin Controller", employee: "Employee Staff" };

export default function Topbar() {
  const { user, userRole, handleLogout } = useAuth();
  const { mode, toggle } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  // Titles come from the nav config, so every routed page has one.
  const { module, page } = findRoute(location.pathname);
  const title = page?.label || "AU Group";
  const sub = module ? module.name : "Control Centre";

  const roleLabel = ROLE_LABEL[userRole] || userRole || "";
  const name = user?.fullName || user?.username || roleLabel;
  const initials = (name || "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60, md: 64 }, px: { xs: 2, md: 3 } }}>

        {/* Phones have no rail, so the brand mark sits here */}
        <Avatar variant="rounded" sx={{ display: { md: "none" }, bgcolor: "primary.main", width: 34, height: 34, borderRadius: 2.5 }}>
          <CreditCardIcon fontSize="small" />
        </Avatar>

        {/* Module › page */}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", lineHeight: 1.3 }}>
            {sub}
          </Typography>
          <Typography variant="h6" noWrap sx={{ fontWeight: 600, lineHeight: 1.25 }}>
            {title}
          </Typography>
        </Box>

        {/* Action Controls */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={toggle}>
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

          <Tooltip title="Account">
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }} aria-label="Account menu">
              <Avatar sx={{ width: 32, height: 32, fontSize: "0.8125rem", bgcolor: "primary.main" }}>
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Account menu: the one place for the user's details and sign out */}
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { width: 240, mt: 1 } } }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap>{name}</Typography>
            <Typography variant="caption" color="text.secondary">{roleLabel}</Typography>
          </Box>
          <Divider />
          {userRole === "master" && (
            <MenuItem onClick={() => { setAnchor(null); navigate("/users"); }}>
              <ListItemIcon><GroupsIcon fontSize="small" /></ListItemIcon>
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
