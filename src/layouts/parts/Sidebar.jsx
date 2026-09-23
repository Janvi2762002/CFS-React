import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Tooltip, Stack, Chip, Divider, Avatar, ListSubheader, IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "../../theme/theme";
import { useAuth } from "../../common/AuthContext";

/* ─── Navigation Structure ─────────────────────────────────────────────────
   Every role sees the Dashboard entry. Roles below Master land on the
   "access required" notice when they open it, so the feature stays
   discoverable without exposing the figures. */
const OVERVIEW = {
  tabId: "dashboard", label: "Overview",
  items: [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon, masterOnly: true },
  ],
};

const CARDS = {
  tabId: "cards", label: "Card Management",
  items: [
    { label: "Card Swipes", path: "/transactions", icon: CreditCardIcon },
  ],
};

const CASH = {
  tabId: "cash", label: "Cash Management",
  items: [
    { label: "Payments", path: "/payments", icon: AccountBalanceWalletIcon },
  ],
};

const ADMINISTRATION = {
  tabId: "users", label: "Administration",
  items: [
    { label: "User Management", path: "/parties", icon: GroupsIcon },
  ],
};

const NAV = {
  master:   [OVERVIEW, CARDS, CASH, ADMINISTRATION],
  admin:    [OVERVIEW, CARDS, CASH],
  employee: [OVERVIEW, CARDS],
};

const ROLE_LABEL = {
  master:   "Master Administrator",
  admin:    "Admin Controller",
  employee: "Employee Staff",
};

export default function Sidebar({ collapsed = false, onNavigate }) {
  const { userRole, handleLogout } = useAuth();
  const location = useLocation();

  const sections = NAV[userRole] || [];
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
  const isMaster = userRole === "master";

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path));

  const label = ROLE_LABEL[userRole] || userRole || "User";
  const initials = (userRole || "?").charAt(0).toUpperCase();

  const subheaderSx = { bgcolor: "transparent", lineHeight: "32px", fontSize: "0.75rem" };

  return (
    <Box
      sx={{
        width,
        height: "100%",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      {/* ── Brand Header ────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: collapsed ? 1.5 : 2, py: 1.75, minHeight: 64 }}
      >
        <Avatar variant="rounded" sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
          <CreditCardIcon fontSize="small" />
        </Avatar>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500, lineHeight: 1.2 }}>
              AU Group
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Control Centre
            </Typography>
          </Box>
        )}
      </Stack>

      <Divider />

      {/* ── Navigation List ───────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", py: 1 }}>
        {sections.map((section) => (
          <List
            key={section.tabId}
            dense
            disablePadding
            sx={{ px: 1, pb: 0.5 }}
            subheader={collapsed ? null : <ListSubheader disableSticky sx={subheaderSx}>{section.label}</ListSubheader>}
          >
            {section.items.map((item) => {
              const active = isActive(item.path);
              const locked = item.masterOnly && !isMaster;
              const Icon = item.icon;

              const btn = (
                <ListItemButton
                  key={item.path}
                  component={NavLink}
                  to={item.path}
                  onClick={onNavigate}
                  selected={active}
                  sx={{
                    borderRadius: 1,
                    mb: 0.25,
                    minHeight: 40,
                    px: collapsed ? 1 : 2,
                    justifyContent: collapsed ? "center" : "flex-start",
                    ...(locked && { color: "text.disabled" }),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: "center" }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!collapsed && (
                    <>
                      <ListItemText primary={item.label} />
                      {locked && <LockOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />}
                    </>
                  )}
                </ListItemButton>
              );

              const tip = collapsed
                ? (locked ? `${item.label} — Master only` : item.label)
                : (locked ? "Master administrators only" : "");

              return tip ? (
                <Tooltip key={item.path} title={tip} placement="right">
                  <span>{btn}</span>
                </Tooltip>
              ) : btn;
            })}
          </List>
        ))}

        {/* Stock Management — not built yet */}
        {(userRole === "master" || userRole === "admin") && (
          <List
            dense
            disablePadding
            sx={{ px: 1 }}
            subheader={collapsed ? null : <ListSubheader disableSticky sx={subheaderSx}>Stock Management</ListSubheader>}
          >
            <Tooltip title={collapsed ? "Stock — coming soon" : ""} placement="right">
              <ListItemButton
                disabled
                sx={{
                  borderRadius: 1,
                  minHeight: 40,
                  px: collapsed ? 1 : 2,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: "center" }}>
                  <Inventory2Icon fontSize="small" />
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText primary="Stock Items" />
                    <Chip label="Soon" size="small" />
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          </List>
        )}
      </Box>

      {/* ── Profile footer, with sign out ─────────────────────────────── */}
      <Divider />
      {collapsed ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 1.75 }}>
          <Tooltip title={label} placement="right">
            <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "primary.main" }}>
              {initials}
            </Avatar>
          </Tooltip>
          <Tooltip title="Sign out" placement="right">
            <IconButton size="small" color="error" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.75 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "primary.main" }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" noWrap>{label}</Typography>
            <Typography variant="caption" color="text.secondary">Active session</Typography>
          </Box>
          <Tooltip title="Sign out">
            <IconButton size="small" color="error" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}
