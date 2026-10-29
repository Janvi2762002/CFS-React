import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, IconButton, Tooltip, Button,
  List, ListItemButton, ListItemText, ListSubheader,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../../common/AuthContext";
import { canReadDashboard } from "../nav";

/**
 * One module's pages, its headline figure and its main action. Shown beside
 * the rail on desktop and in the bottom sheet on phones.
 *
 * @param {object}   props.module   entry from MODULES
 * @param {object}   [props.summary]  GET /Dashboard/summary, when available
 * @param {Function} [props.onHide]   desktop: hides the panel
 * @param {Function} [props.onClose]  phone: closes the sheet
 * @param {Function} [props.onNavigate] called after any link or action
 */
export default function ModulePanel({ module, summary, onHide, onClose, onNavigate }) {
  const { userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardAllowed = canReadDashboard(userRole);
  const figure = summary ? module.figure?.(summary) : null;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  /* Opens the target page with its Add dialog already up (see useCreateIntent). */
  const runAction = () => {
    navigate(module.action.path, { state: { create: true } });
    onNavigate?.();
  };

  return (
    <Stack spacing={2} sx={{ p: 2, pt: onClose ? 1 : 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 36 }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1.0625rem" }} noWrap>
          {module.name}
        </Typography>
        {onHide && (
          <Tooltip title="Hide panel">
            <IconButton size="small" onClick={onHide} aria-label="Hide panel">
              <KeyboardDoubleArrowLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onClose && (
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {figure && (
        <Box
          sx={(t) => ({
            px: 1.75, py: 1.5, borderRadius: 3, border: 1, borderColor: "divider",
            bgcolor: alpha(t.palette.text.primary, t.palette.mode === "dark" ? 0.04 : 0.025),
          })}
        >
          <Typography
            variant="caption" color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block" }}
          >
            {figure.label}
          </Typography>
          <Typography className="tabular-nums" sx={{ fontSize: "1.3rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.35 }}>
            {figure.value}
          </Typography>
          {figure.sub && (
            <Typography variant="caption" color="text.secondary">{figure.sub}</Typography>
          )}
        </Box>
      )}

      {module.action && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={runAction} fullWidth>
          {module.action.label}
        </Button>
      )}

      <List
        dense
        disablePadding
        subheader={
          <ListSubheader
            disableSticky
            sx={{
              bgcolor: "transparent", lineHeight: "28px", px: 1,
              fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            Pages
          </ListSubheader>
        }
      >
        {module.pages.map((page) => {
          const active = isActive(page.path);
          const locked = page.needsDashboard && !dashboardAllowed;
          return (
            <ListItemButton
              key={page.path}
              component={NavLink}
              to={page.path}
              onClick={onNavigate}
              selected={active}
              sx={{
                borderRadius: 2.5, mb: 0.25, py: 0.75, px: 1.25,
                "&.Mui-selected .MuiListItemText-primary": { color: "primary.main", fontWeight: 600 },
              }}
            >
              <ListItemText
                primary={page.label}
                secondary={locked ? "Admins and Master only" : page.sub}
                slotProps={{
                  primary: { sx: { fontSize: "0.875rem", fontWeight: 500 } },
                  // Wraps rather than cutting off, so the whole description reads on any width.
                  secondary: { sx: { fontSize: "0.75rem", lineHeight: 1.35, mt: 0.25 } },
                }}
                sx={{ my: 0, ...(locked && { color: "text.disabled" }) }}
              />
              {locked && <LockOutlinedIcon sx={{ fontSize: 15, color: "text.disabled", ml: 1 }} />}
            </ListItemButton>
          );
        })}
      </List>
    </Stack>
  );
}
