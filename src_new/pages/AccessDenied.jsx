import React from "react";
import { Box, Typography, Button, Stack, Paper, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../common/AuthContext";

export default function AccessDenied() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  /* Someone already signed in has simply hit a page above their role — send
     them back to their own landing page rather than to the login screen. */
  const signedIn = userRole === "master" || userRole === "admin" || userRole === "employee";

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", p: 2 }}>
      <Paper variant="outlined" className="page-enter" sx={{ p: 4, maxWidth: 440, width: "100%" }}>
        <Stack alignItems="center" spacing={2} sx={{ textAlign: "center" }}>
          <Avatar sx={{ bgcolor: "error.main", width: 56, height: 56 }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography variant="h5">Access Denied</Typography>
          <Typography variant="body2" color="text.secondary">
            {signedIn
              ? "This page is restricted to Master administrators. Your account doesn't have access to it."
              : "You don't have permission to view this page. Please sign in with an authorized account."}
          </Typography>
          {signedIn ? (
            <Button variant="contained" onClick={() => navigate("/transactions")}>
              Back to Card Swipes
            </Button>
          ) : (
            <Button variant="contained" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
