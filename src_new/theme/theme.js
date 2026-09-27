import { createTheme, alpha } from "@mui/material/styles";

export const SIDEBAR_WIDTH           = 264;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

/* Shared motion curve — used for every hover / state transition. */
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Material UI theme with a modern surface language: rounded corners, soft
 * layered shadows and consistent motion. Colours stay on the standard MUI
 * palette so nothing here is brand-specific.
 */
export function createAppTheme(mode = "light") {
  const dark = mode === "dark";

  const shadowSoft = dark
    ? "0 1px 2px rgba(0,0,0,0.4), 0 4px 16px -4px rgba(0,0,0,0.5)"
    : "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px -6px rgba(16,24,40,0.10)";

  const shadowLift = dark
    ? "0 4px 12px rgba(0,0,0,0.45), 0 16px 32px -12px rgba(0,0,0,0.6)"
    : "0 4px 10px rgba(16,24,40,0.06), 0 16px 32px -12px rgba(16,24,40,0.16)";

  const base = createTheme({
    palette: {
      mode,
      primary:   { main: "#4F46E5", light: "#818CF8", dark: "#3730A3", contrastText: "#FFFFFF" },
      secondary: { main: "#0EA5E9", light: "#38BDF8", dark: "#0369A1", contrastText: "#FFFFFF" },
      success:   { main: "#16A34A", light: "#4ADE80", dark: "#15803D" },
      warning:   { main: "#F59E0B", light: "#FBBF24", dark: "#B45309" },
      error:     { main: "#E11D48", light: "#FB7185", dark: "#BE123C" },
      info:      { main: "#0284C7", light: "#38BDF8", dark: "#075985" },
      background: dark
        ? { default: "#0E1017", paper: "#171A23" }
        : { default: "#F4F6FC", paper: "#FFFFFF" },
      divider: dark ? "rgba(255,255,255,0.10)" : "rgba(16,24,40,0.10)",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600, letterSpacing: "-0.02em" },
      h5: { fontWeight: 600, letterSpacing: "-0.015em" },
      h6: { fontWeight: 600, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 500 },
    },
  });

  base.components = {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": { boxSizing: "border-box" },
        "::selection": { background: alpha(base.palette.primary.main, 0.2) },
        "::-webkit-scrollbar": { width: 10, height: 10 },
        "::-webkit-scrollbar-thumb": {
          background: dark ? "rgba(255,255,255,0.14)" : "rgba(16,24,40,0.16)",
          borderRadius: 99,
          border: "3px solid transparent",
          backgroundClip: "content-box",
        },
        "::-webkit-scrollbar-thumb:hover": {
          background: dark ? "rgba(255,255,255,0.24)" : "rgba(16,24,40,0.28)",
          backgroundClip: "content-box",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderRadius: 16 },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0, variant: "outlined" },
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: shadowSoft,
          transition: `transform 0.25s ${EASE}, box-shadow 0.25s ${EASE}, border-color 0.25s ${EASE}`,
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: shadowLift,
            borderColor: alpha(base.palette.primary.main, 0.35),
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          paddingBlock: 8,
          transition: `transform 0.2s ${EASE}, box-shadow 0.2s ${EASE}, background-color 0.2s ${EASE}`,
          "&:active": { transform: "scale(0.97)" },
        },
        contained: {
          boxShadow: `0 2px 8px ${alpha(base.palette.primary.main, 0.28)}`,
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: `0 6px 18px ${alpha(base.palette.primary.main, 0.36)}`,
          },
        },
        outlined: {
          "&:hover": { transform: "translateY(-1px)" },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `transform 0.2s ${EASE}, background-color 0.2s ${EASE}`,
          "&:hover": { transform: "scale(1.08)" },
          "&:active": { transform: "scale(0.94)" },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          transition: `all 0.2s ${EASE}`,
        },
        clickable: { "&:hover": { transform: "translateY(-1px)" } },
        /* Outlined chips carry a soft wash of their own colour so status
           reads at a glance instead of as a hairline outline. */
        outlinedPrimary:   { backgroundColor: alpha(base.palette.primary.main,   dark ? 0.18 : 0.10) },
        outlinedSecondary: { backgroundColor: alpha(base.palette.secondary.main, dark ? 0.18 : 0.10) },
        outlinedSuccess:   { backgroundColor: alpha(base.palette.success.main,   dark ? 0.18 : 0.10) },
        outlinedWarning:   { backgroundColor: alpha(base.palette.warning.main,   dark ? 0.18 : 0.12) },
        outlinedError:     { backgroundColor: alpha(base.palette.error.main,     dark ? 0.18 : 0.10) },
        outlinedInfo:      { backgroundColor: alpha(base.palette.info.main,      dark ? 0.18 : 0.10) },
      },
    },

    MuiTextField:   { defaultProps: { size: "small" } },
    MuiSelect:      { defaultProps: { size: "small" } },
    MuiFormControl: { defaultProps: { size: "small" } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `box-shadow 0.2s ${EASE}, background-color 0.2s ${EASE}`,
          "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha(base.palette.primary.main, 0.14)}`,
          },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `background-color 0.2s ${EASE}, color 0.2s ${EASE}, padding-left 0.2s ${EASE}`,
          "&:hover": { backgroundColor: alpha(base.palette.primary.main, dark ? 0.12 : 0.06) },
          "&.Mui-selected": {
            backgroundColor: alpha(base.palette.primary.main, dark ? 0.22 : 0.11),
            color: dark ? base.palette.primary.light : base.palette.primary.dark,
            fontWeight: 600,
            "& .MuiListItemIcon-root": { color: "inherit" },
            "& .MuiListItemText-primary": { fontWeight: 600 },
            "&:hover": { backgroundColor: alpha(base.palette.primary.main, dark ? 0.3 : 0.17) },
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 18 },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 14, boxShadow: shadowLift },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 8, marginInline: 6, transition: `background-color 0.18s ${EASE}` },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { borderRadius: 8, fontSize: "0.75rem" },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 6 },
        bar: { borderRadius: 99 },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: { transition: `background-color 0.18s ${EASE}` },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: base.palette.text.secondary,
          backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(16,24,40,0.035)",
        },
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          "--DataGrid-rowBorderColor": base.palette.divider,
        },
        columnHeader: {
          backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(16,24,40,0.035)",
        },
        columnHeaders: { borderRadius: 0 },
        columnHeaderTitle: { fontWeight: 600, color: base.palette.text.secondary },
        /* Cells default to block layout, which top-aligns anything a
           renderCell returns. Flex keeps custom cell content vertically
           centred, with the alignment classes driving the horizontal axis. */
        cell: {
          outline: "none !important",
          display: "flex",
          alignItems: "center",
          "&.MuiDataGrid-cell--textRight":  { justifyContent: "flex-end" },
          "&.MuiDataGrid-cell--textCenter": { justifyContent: "center" },
        },
        row: {
          transition: `background-color 0.18s ${EASE}`,
          "&:hover": {
            backgroundColor: `${alpha(base.palette.primary.main, dark ? 0.12 : 0.05)} !important`,
          },
        },
        footerContainer: {
          backgroundColor: dark ? "rgba(255,255,255,0.02)" : "rgba(16,24,40,0.015)",
        },
      },
    },
  };

  return base;
}

export default createAppTheme;
