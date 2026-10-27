import React from "react";
import { Avatar, Box, ButtonBase, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import { RAIL_WIDTH } from "../../theme/theme";

/**
 * A module button: icon in a pill, label underneath. Shared by the desktop
 * rail and the phone's bottom bar.
 */
export function RailButton({ module, selected, current, onClick }) {
  const Icon = module.icon;
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      aria-current={current ? "page" : undefined}
      sx={(t) => ({
        flexDirection: "column", gap: 0.375, width: 68, py: 0.75, borderRadius: 3,
        fontSize: "0.6875rem", fontWeight: selected ? 600 : 500,
        color: selected ? "text.primary" : "text.secondary",
        "& .rail-pill": {
          width: 48, height: 30, borderRadius: 99, display: "grid", placeItems: "center",
          transition: t.transitions.create("background-color", { duration: t.transitions.duration.shorter }),
          bgcolor: selected ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.2 : 0.1) : "transparent",
          color: selected ? "primary.main" : "inherit",
        },
        "&:hover .rail-pill": selected ? {} : { bgcolor: "action.hover" },
        "&.Mui-focusVisible .rail-pill": { outline: `2px solid ${t.palette.primary.main}` },
      })}
    >
      <Box className="rail-pill"><Icon sx={{ fontSize: 21 }} /></Box>
      {module.label}
    </ButtonBase>
  );
}

/**
 * Desktop module rail. Picking a module shows its panel; picking the open
 * module again hides the panel.
 *
 * @param {object[]} props.modules   modules for the signed-in role
 * @param {string}   props.selected  id of the module whose panel is showing (or null)
 * @param {string}   props.current   id of the module the current page belongs to
 * @param {(id: string) => void} props.onPick
 */
export default function NavRail({ modules, selected, current, onPick }) {
  const primary = modules.filter((m) => !m.secondary);
  const secondary = modules.filter((m) => m.secondary);

  const button = (m) => (
    <RailButton
      key={m.id}
      module={m}
      selected={selected === m.id || (!selected && current === m.id)}
      current={current === m.id}
      onClick={() => onPick(m.id)}
    />
  );

  return (
    <Stack
      component="nav"
      aria-label="Modules"
      alignItems="center"
      spacing={0.5}
      // Flex gap instead of child margins, so the logo's own margin isn't reset.
      useFlexGap
      sx={{
        width: RAIL_WIDTH, flexShrink: 0, py: 1.5, height: "100%",
        bgcolor: "background.paper", borderRight: 1, borderColor: "divider",
      }}
    >
      {/* Same space below the logo as between one module's label and the next icon */}
      <Avatar variant="rounded" sx={{ bgcolor: "primary.main", width: 38, height: 38, borderRadius: 2.5, mb: 1.25 }}>
        <CreditCardIcon fontSize="small" />
      </Avatar>
      {primary.map(button)}
      <Box sx={{ flexGrow: 1 }} />
      {secondary.map(button)}
    </Stack>
  );
}
