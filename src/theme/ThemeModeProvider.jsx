import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "./theme";

const ColorModeCtx = createContext({ mode: "light", toggle: () => {}, setMode: () => {} });
export const useColorMode = () => useContext(ColorModeCtx);

const KEY = "augroup.theme";

export default function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s === "light" || s === "dark") return s;
    } catch {}
    return "light";
  });

  const toggle = useCallback(() => {
    setModeState((p) => {
      const next = p === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  }, []);

  const setMode = useCallback((newMode) => {
    if (newMode === "light" || newMode === "dark") {
      setModeState(newMode);
      try { localStorage.setItem(KEY, newMode); } catch {}
    }
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const ctx   = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle, setMode]);

  return (
    <ColorModeCtx.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeCtx.Provider>
  );
}
