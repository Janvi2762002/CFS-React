import React from "react";
import { Box, Card, CardContent, Stack, Typography, Avatar, Chip, Tooltip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

/**
 * Headline figure for the top of a page.
 *
 * The icon and label share the first row and the number gets the full card
 * width below them — putting all three side by side leaves the number a
 * narrow column, which is what made these feel cramped at smaller widths.
 */
export default function StatTile({ label, value, hint, delta, icon: Icon, color = "primary" }) {
  const theme = useTheme();
  const tone = theme.palette[color].main;

  const up = delta != null && delta >= 0;
  const DeltaIcon = up ? ArrowUpwardIcon : ArrowDownwardIcon;
  const deltaTone = up ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Card variant="outlined" sx={{ height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Colour rail identifying the metric */}
      <Box sx={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4, bgcolor: tone }} />

      <CardContent sx={{ pl: 2.5, pr: 2, py: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
          {Icon && (
            <Avatar
              variant="rounded"
              sx={{ bgcolor: alpha(tone, 0.14), color: tone, width: 32, height: 32, flexShrink: 0 }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, lineHeight: 1.3 }}>
            {label}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography
            className="tabular-nums"
            sx={{
              color: tone,
              fontWeight: 600,
              lineHeight: 1.2,
              fontSize: { xs: "1.5rem", sm: "1.35rem", md: "1.5rem" },
            }}
          >
            {value}
          </Typography>
          {delta != null && (
            <Tooltip title="Change vs the previous period of equal length">
              <Chip
                size="small"
                variant="outlined"
                color={up ? "success" : "error"}
                icon={<DeltaIcon sx={{ fontSize: "0.8rem !important", color: `${deltaTone} !important` }} />}
                label={`${up ? "+" : ""}${delta.toFixed(0)}%`}
                sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
              />
            </Tooltip>
          )}
        </Stack>

        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
