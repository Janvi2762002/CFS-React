import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

/**
 * Custom confirmation dialog — replaces browser window.confirm().
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", onConfirm: null });
 *
 *   // Trigger:
 *   setConfirmState({ open: true, title: "Delete entry?", message: "This action cannot be undone.", onConfirm: () => doDelete(id) });
 *
 *   // Render:
 *   <ConfirmDialog
 *     open={confirmState.open}
 *     title={confirmState.title}
 *     message={confirmState.message}
 *     onConfirm={confirmState.onConfirm}
 *     onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
 *   />
 *
 * Props:
 *   open        — boolean
 *   title       — string (dialog heading)
 *   message     — string (body text)
 *   confirmLabel — string (default "Delete")
 *   cancelLabel  — string (default "Cancel")
 *   severity    — "error" | "warning" (default "error", controls confirm button colour)
 *   onConfirm   — () => void — called when the user clicks confirm
 *   onClose     — () => void — called when the user cancels or closes
 */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  severity = "error",
  onConfirm,
  onClose,
}) {
  const handleConfirm = () => {
    onClose?.();
    onConfirm?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* Icon + Title row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, pt: 3, pb: 1 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: "50%",
            display: "grid", placeItems: "center", flexShrink: 0,
            bgcolor: severity === "error" ? "error.light" : "warning.light",
            color:   severity === "error" ? "error.dark"  : "warning.dark",
          }}
        >
          <WarningAmberRoundedIcon fontSize="small" />
        </Box>
        <DialogTitle sx={{ p: 0, fontSize: "1rem", fontWeight: 600 }}>
          {title}
        </DialogTitle>
      </Box>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>

      <Divider sx={{ mx: 3, mt: 1 }} />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={{ minWidth: 80 }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={severity}
          size="small"
          sx={{ minWidth: 80 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
