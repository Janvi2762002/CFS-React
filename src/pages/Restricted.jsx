import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Stack, Typography, Button, Avatar, Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAuth } from "../common/AuthContext";

const ROLE_LABEL = {
  master:   "Master Administrator",
  admin:    "Admin Controller",
  employee: "Employee Staff",
};

/**
 * Shown in place of a page the signed-in role cannot open. Rendered inside
 * the main layout so the navigation stays put — the tab is visible to
 * everyone, it just asks for a higher role when opened.
 */
export default function Restricted({ page = "This page", requiredRole = "Master Administrator" }) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  return (
    <Box className="page-enter" sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 460, width: "100%", textAlign: "center" }}>
        <Stack alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: "warning.main", width: 56, height: 56 }}>
            <LockOutlinedIcon />
          </Avatar>

          <Typography variant="h6">Access required</Typography>

          <Typography variant="body2" color="text.secondary">
            {page} is available to <strong>{requiredRole}</strong> accounts only.
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">Signed in as</Typography>
            <Chip size="small" variant="outlined" color="primary" label={ROLE_LABEL[userRole] || userRole || "User"} />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Ask a Master administrator if you need this access.
          </Typography>

          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/transactions")}>
            Go to Card Swipes
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
