import React from "react";
import { Box, Paper, SwipeableDrawer } from "@mui/material";
import { RailButton } from "./NavRail";
import ModulePanel from "./ModulePanel";

export const MOBILE_NAV_HEIGHT = 68;

/**
 * Phone navigation: the modules along the bottom of the screen, and a sheet
 * that slides up with the picked module's pages. Secondary modules (User
 * Management) are reached from the account menu instead.
 */
export default function MobileNav({ modules, current, sheet, open, onPick, onCloseSheet, summary }) {
  const shown = modules.filter((m) => !m.secondary);
  // `sheet` outlives `open`, so the pages stay put while the sheet slides away.

  return (
    <>
      <Paper
        component="nav"
        aria-label="Modules"
        square
        elevation={0}
        sx={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar,
          borderTop: 1, borderColor: "divider",
          pb: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Box sx={{ height: MOBILE_NAV_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-around", px: 0.5 }}>
          {shown.map((m) => (
            <RailButton
              key={m.id}
              module={m}
              selected={open && sheet ? sheet.id === m.id : current === m.id}
              current={current === m.id}
              onClick={() => onPick(m.id)}
            />
          ))}
        </Box>
      </Paper>

      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => {}}
        onClose={onCloseSheet}
        disableSwipeToOpen
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85vh",
              pb: "env(safe-area-inset-bottom, 0px)",
            },
          },
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1 }} />
        {sheet && (
          <ModulePanel module={sheet} summary={summary} onClose={onCloseSheet} onNavigate={onCloseSheet} />
        )}
      </SwipeableDrawer>
    </>
  );
}
