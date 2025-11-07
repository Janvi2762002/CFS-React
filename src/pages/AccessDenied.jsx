import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Typography variant="h3" color="error" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        You do not have permission to access this page.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/login")}>
        Back to Login
      </Button>
    </Box>
  );
};

export default AccessDenied;
