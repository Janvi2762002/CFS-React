import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "./theme";

const ColorModeCtx = createContext({ mode: "light", toggle: () => {} });
export const useColorMode = () => useContext(ColorModeCtx);

const KEY = "augroup.theme";

export default function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { const s = localStorage.getItem(KEY); if (s === "light" || s === "dark") return s; } catch {}
    return "light";
  });

  const toggle = useCallback(() => {
    setMode((p) => {
      const next = p === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const ctx   = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ColorModeCtx.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeCtx.Provider>
  );
}
