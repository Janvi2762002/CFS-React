import React, { useState } from "react";
import {
  Box, TextField, Button, Typography, InputAdornment, IconButton,
  Stack, Alert, Paper, Divider, Avatar, Link, CircularProgress,
} from "@mui/material";
import { alpha, darken, useTheme } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import InsightsIcon from "@mui/icons-material/InsightsOutlined";
import ShieldIcon from "@mui/icons-material/VerifiedUserOutlined";
import PaymentsIcon from "@mui/icons-material/PaymentsOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import Tooltip from "@mui/material/Tooltip";
import { useAuth } from "../common/AuthContext";
import { useColorMode } from "../theme/ThemeModeProvider";

const FEATURES = [
  { icon: CreditCardIcon, title: "Card swipe tracking", desc: "Every swipe, settlement and deduction, captured as it happens." },
  { icon: PaymentsIcon,   title: "Party payments",      desc: "Profit and payment summaries calculated per party." },
  { icon: InsightsIcon,   title: "Profit analytics",    desc: "Volume, settlements and net profit at a glance." },
  { icon: ShieldIcon,     title: "Role-based access",   desc: "Master, Admin and Employee tiers on protected routes." },
];

/* Soft blurred shape used to give the brand panel depth. */
function Orb({ size, color, sx, delay = "0s" }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(60px)",
        animation: `floatSoft 16s ease-in-out infinite`,
        animationDelay: delay,
        pointerEvents: "none",
        ...sx,
      }}
    />
  );
}

export default function LoginPage({ onLogin }) {
  const theme = useTheme();
  const { mode, toggle } = useColorMode();
  const { handleLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const signIn = onLogin || handleLogin;
      const result = await signIn(username.trim(), password);
      // A successful sign-in navigates away; only failures come back here.
      if (result && result.ok === false) setError(result.message);
    } catch (err) {
      setError(err?.message || "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
        bgcolor: "background.default",
      }}
    >
      {/* Fixed Theme Toggle Button on Top Right */}
      <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: 1100 }}>
        <Tooltip title={mode === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}>
          <IconButton
            onClick={toggle}
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              boxShadow: 3,
              border: 1,
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      {/* ══ Brand panel ═══════════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          p: { md: 6, lg: 9 },
          color: "#FFFFFF",
          background: `linear-gradient(150deg, ${darken(theme.palette.primary.dark, 0.55)} 0%, ${theme.palette.primary.dark} 52%, ${theme.palette.primary.main} 100%)`,
        }}
      >
        <Orb size={420} color={alpha("#FFFFFF", 0.22)} sx={{ top: "-12%", left: "-8%" }} />
        <Orb size={300} color={alpha("#FFFFFF", 0.16)} sx={{ bottom: "-6%", right: "4%" }} delay="-6s" />
        <Orb size={220} color={alpha("#000000", 0.18)} sx={{ bottom: "24%", left: "38%" }} delay="-11s" />

        <Box sx={{ position: "relative", maxWidth: 520 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" className="fade-in" sx={{ mb: 5 }}>
            <Avatar
              variant="rounded"
              sx={{ bgcolor: alpha("#FFFFFF", 0.18), backdropFilter: "blur(8px)", width: 44, height: 44 }}
            >
              <CreditCardIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>AU Group</Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>Control Centre</Typography>
            </Box>
          </Stack>

          <Typography
            variant="h3"
            className="page-enter"
            sx={{ fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.15, mb: 2 }}
          >
            Every swipe, settlement and payment in one place.
          </Typography>

          <Typography
            className="page-enter"
            sx={{ opacity: 0.85, fontSize: "1.05rem", lineHeight: 1.7, mb: 6, animationDelay: "0.06s" }}
          >
            Track card swipe activity, reconcile party payments and review profit
            across your network — from a single control centre.
          </Typography>

          <Stack spacing={2} className="stagger">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Stack
                  key={f.title}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: alpha("#FFFFFF", 0.10),
                    border: `1px solid ${alpha("#FFFFFF", 0.16)}`,
                    backdropFilter: "blur(10px)",
                    transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), background-color 0.25s",
                    "&:hover": { transform: "translateX(6px)", bgcolor: alpha("#FFFFFF", 0.16) },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{ bgcolor: alpha("#FFFFFF", 0.18), width: 38, height: 38, color: "#FFFFFF" }}
                  >
                    <Icon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{f.title}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>{f.desc}</Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ ml: "auto", fontSize: 16, opacity: 0.5 }} />
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* ══ Sign-in panel ═════════════════════════════════════════════════ */}
      <Box sx={{ display: "grid", placeItems: "center", p: { xs: 2.5, sm: 5 } }}>
        <Paper
          elevation={0}
          className="page-enter"
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            border: 1,
            borderColor: "divider",
          }}
        >
          {/* Compact brand mark for small screens */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ display: { md: "none" }, mb: 3 }}>
            <Avatar variant="rounded" sx={{ bgcolor: "primary.main" }}>
              <CreditCardIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>AU Group</Typography>
              <Typography variant="caption" color="text.secondary">Control Centre</Typography>
            </Box>
          </Stack>

          <Typography variant="h5" gutterBottom>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            Sign in to continue to your control centre.
          </Typography>

          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.25}>
              <TextField
                label="Username / Email"
                fullWidth
                size="medium"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                autoComplete="username"
              />

              <TextField
                label="Password"
                fullWidth
                size="medium"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass((v) => !v)} edge="end" size="small">
                        {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ textAlign: "right", mt: -0.5 }}>
                <Link component="button" type="button" variant="body2" underline="hover">
                  Forgot password?
                </Link>
              </Box>

              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                endIcon={loading ? null : <ArrowForwardIcon />}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ py: 1.35 }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </Box>

        </Paper>
      </Box>
    </Box>
  );
}
