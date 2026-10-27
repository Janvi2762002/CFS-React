import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import NavRail from "./parts/NavRail";
import ModulePanel from "./parts/ModulePanel";
import MobileNav, { MOBILE_NAV_HEIGHT } from "./parts/MobileNav";
import Topbar from "./parts/Topbar";
import { modulesFor, findRoute } from "./nav";
import { PANEL_WIDTH } from "../theme/theme";
import { useAuth } from "../common/AuthContext";
import useDashboardSummary from "../common/useDashboardSummary";

const PANEL_KEY = "cfs.navPanelOpen";

/* Storage can be missing or throw (private mode, blocked site data). */
function readPanelOpen() {
  try { return window.localStorage.getItem(PANEL_KEY) !== "0"; } catch { return true; }
}
function writePanelOpen(open) {
  try { window.localStorage.setItem(PANEL_KEY, open ? "1" : "0"); } catch { /* not remembered */ }
}

export default function MainLayout() {
  const { userRole } = useAuth();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const { pathname } = useLocation();

  const modules = useMemo(() => modulesFor(userRole), [userRole]);
  const current = findRoute(pathname).module?.id ?? null;

  /* Desktop: which module's panel is showing, and whether it is showing.
     The panel follows the page whenever the route moves to another module. */
  const [picked, setPicked] = useState(current);
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  useEffect(() => { if (current) setPicked(current); }, [current]);
  useEffect(() => { writePanelOpen(panelOpen); }, [panelOpen]);

  /* Phone: the module whose sheet is up. Kept after closing so the sheet's
     content doesn't vanish while it slides away. */
  const [sheetId, setSheetId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => { setSheetOpen(false); }, [pathname, isPhone]);

  /* Module figures come from the dashboard summary, which only the Master
     may see. Refreshed on every page change so they track new entries; a
     failure keeps the last figures, or none. The Dashboard page reads the
     same response through the Outlet context instead of fetching it again. */
  const dashboard = useDashboardSummary(userRole === "master");
  const refreshSummary = dashboard.refresh;
  useEffect(() => { refreshSummary(); }, [refreshSummary, pathname]);
  const summary = dashboard.data;

  const pickDesktop = (id) => {
    if (panelOpen && picked === id) { setPanelOpen(false); return; }
    setPicked(id);
    setPanelOpen(true);
  };
  const pickPhone = (id) => {
    setSheetId(id);
    setSheetOpen(true);
  };

  const panelModule = modules.find((m) => m.id === picked) || modules.find((m) => m.id === current) || modules[0];
  const sheetModule = modules.find((m) => m.id === sheetId) || null;
  const bottomInset = isPhone ? `calc(${MOBILE_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` : "0px";

  return (
    <Box
      sx={{
        display: "flex", minHeight: "100vh", bgcolor: "background.default",
        // Lets sticky footers (grid pagers) clear the phone's bottom bar.
        "--app-bottom-inset": bottomInset,
      }}
    >
      {/* ── Desktop: module rail + the picked module's panel ─────────── */}
      {!isPhone && (
        <Box sx={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexShrink: 0, zIndex: (t) => t.zIndex.appBar + 1 }}>
          <NavRail
            modules={modules}
            selected={panelOpen ? panelModule?.id : null}
            current={current}
            onPick={pickDesktop}
          />
          <Box
            aria-hidden={!panelOpen}
            inert={!panelOpen ? true : undefined}
            sx={(t) => ({
              width: panelOpen ? PANEL_WIDTH : 0,
              overflow: "hidden",
              bgcolor: "background.paper",
              borderRight: panelOpen ? 1 : 0,
              borderColor: "divider",
              transition: t.transitions.create("width", { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }),
            })}
          >
            <Box sx={{ width: PANEL_WIDTH, height: "100%", overflowY: "auto" }}>
              {panelModule && (
                <ModulePanel module={panelModule} summary={summary} onHide={() => setPanelOpen(false)} />
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Main view ─────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>
        <Topbar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3 },
            pt: 3,
            pb: isPhone ? `calc(${MOBILE_NAV_HEIGHT}px + 24px + env(safe-area-inset-bottom, 0px))` : 3,
            width: "100%",
          }}
        >
          <Outlet context={{ dashboard }} />
        </Box>
      </Box>

      {isPhone && (
        <MobileNav
          modules={modules}
          current={current}
          sheet={sheetModule}
          open={sheetOpen}
          onPick={pickPhone}
          onCloseSheet={() => setSheetOpen(false)}
          summary={summary}
        />
      )}
    </Box>
  );
}
