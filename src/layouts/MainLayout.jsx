import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Drawer } from "@mui/material";
import Sidebar from "./parts/Sidebar";
import Topbar from "./parts/Topbar";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "../theme/theme";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const desktopWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>

      {/* ── Left Sidebar Navigation ──────────────────────────────────── */}
      <Box
        component="nav"
        sx={{ width: { md: desktopWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Temporary Drawer (< 900px) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH },
          }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        {/* Desktop Permanent Collapsible Sidebar (>= 900px) */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: desktopWidth,
              borderRight: "none",
              overflowX: "hidden",
            },
          }}
        >
          <Sidebar collapsed={collapsed} />
        </Drawer>
      </Box>

      {/* ── Main View Container ─────────────────────────────────────── */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        <Topbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          onToggleMobile={() => setMobileOpen(true)}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3 },
            py: 3,
            width: "100%",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
