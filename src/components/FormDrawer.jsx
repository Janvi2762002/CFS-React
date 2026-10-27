import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  useMediaQuery,
  Paper,
  Stack,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/SaveOutlined";

/**
 * Modern Slide-Over Drawer component for forms.
 * Replaces standard centered Dialogs with a sleek right side sheet.
 */
export default function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon: IconComponent,
  children,
  onSave,
  saving = false,
  saveText = "Save Changes",
  cancelText = "Cancel",
  maxWidth = 560,
  disableSave = false,
  headerAction,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        sx: {
          width: isMobile ? "100vw" : maxWidth,
          maxWidth: "100vw",
          boxShadow: isDark
            ? "-8px 0 32px rgba(0,0,0,0.6)"
            : "-8px 0 32px rgba(16,24,40,0.12)",
          display: "flex",
          flexDirection: "column",
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(4px)",
          backgroundColor: isDark
            ? "rgba(10, 12, 18, 0.65)"
            : "rgba(15, 23, 42, 0.35)",
        },
      }}
    >
      {/* ── Header Section ────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: isDark
            ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, rgba(0,0,0,0) 100%)`
            : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, rgba(255,255,255,0) 100%)`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {IconComponent && (
            <Paper
              elevation={0}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1),
                color: theme.palette.primary.main,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <IconComponent sx={{ fontSize: 24 }} />
            </Paper>
          )}
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.3, fontSize: "0.825rem" }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {headerAction}
          <IconButton
            onClick={onClose}
            disabled={saving}
            size="small"
            sx={{
              color: "text.secondary",
              bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Scrollable Content Area ───────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: { xs: 2.5, sm: 3 },
        }}
      >
        {children}
      </Box>

      {/* ── Sticky Action Footer ─────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: isDark
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(8px)",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={saving}
          sx={{
            px: 2.5,
            borderColor: theme.palette.divider,
            color: "text.secondary",
          }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || disableSave}
          startIcon={
            saving ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          sx={{
            px: 3,
            py: 1,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
          }}
        >
          {saving ? "Saving..." : saveText}
        </Button>
      </Box>
    </Drawer>
  );
}

/**
 * Reusable Form Section Card for grouping inputs neatly inside the drawer
 */
export function FormSection({ title, subtitle, icon: SectionIcon, children, sx = {} }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 3,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(16,24,40,0.08)",
        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,0.6)",
        ...sx,
      }}
    >
      {title && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {SectionIcon && (
              <SectionIcon
                sx={{ fontSize: 18, color: theme.palette.primary.main }}
              />
            )}
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {title}
            </Typography>
          </Stack>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
              {subtitle}
            </Typography>
          )}
          <Divider sx={{ mt: 1.5 }} />
        </Box>
      )}
      {children}
    </Paper>
  );
}
