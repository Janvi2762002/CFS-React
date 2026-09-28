import React from "react";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";

/**
 * Frosts the page behind any overlay: add/edit dialogs, confirmation
 * prompts and the mobile navigation drawer.
 *
 * NOTE ON PLACEMENT — this belongs in `theme.js` alongside the other
 * component overrides, as a single `MuiBackdrop` entry. It lives here only
 * because `src/theme/theme.js` is currently read-only to this account (its
 * ACL grants Modify to `WIN2022\CodexSandboxUsers` but not to the signed-in
 * user). Once write access is restored, move the `components` block below
 * into `theme.js` and delete this file along with its use in `App.js`.
 *
 * Menus, selects, popovers and tooltips render an *invisible* backdrop whose
 * only job is catching outside clicks. Blurring that would frost the entire
 * page behind a dropdown, so `.MuiBackdrop-invisible` is explicitly reset.
 */
export default function BackdropBlur({ children }) {
  return (
    <ThemeProvider
      theme={(outer) =>
        createTheme(outer, {
          components: {
            MuiBackdrop: {
              styleOverrides: {
                root: {
                  backdropFilter: "blur(5px)",
                  WebkitBackdropFilter: "blur(5px)",
                  backgroundColor: alpha(
                    "#0B1020",
                    outer.palette.mode === "dark" ? 0.6 : 0.35
                  ),
                  "&.MuiBackdrop-invisible": {
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                    backgroundColor: "transparent",
                  },
                },
              },
            },
          },
        })
      }
    >
      {children}
    </ThemeProvider>
  );
}
