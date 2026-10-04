import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Card, CardActionArea, Stack, Typography, Avatar, Chip,
  IconButton, Tooltip, Skeleton, Paper, Button,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";

/* Gap between cards; must match `gap: 2` on the track (theme spacing × 8). */
const GAP_PX = 16;

/* Cards per view: four on desktop, stepping down so a card never gets cramped. */
const CARD_BASIS = {
  xs: "100%",
  sm: `calc((100% - ${GAP_PX}px) / 2)`,
  md: `calc((100% - ${GAP_PX * 2}px) / 3)`,
  lg: `calc((100% - ${GAP_PX * 3}px) / 4)`,
};

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Only the last four digits are ever shown. */
export function maskAccountNo(accountNo) {
  const digits = String(accountNo || "").replace(/\s+/g, "");
  if (!digits) return "No account number";
  return `•••• ${digits.slice(-4)}`;
}

function AccountCard({ account, selected, onSelect }) {
  const theme = useTheme();
  const current = account.summary?.currentBalance;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? `0 0 0 1px ${theme.palette.primary.main}` : "none",
        transition: "border-color 0.18s, box-shadow 0.18s",
      }}
    >
      <CardActionArea
        onClick={() => onSelect(account.id)}
        aria-pressed={selected}
        sx={{ height: "100%", p: 2, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Avatar
            variant="rounded"
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: "primary.main", width: 36, height: 36 }}
          >
            <AccountBalanceIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle2" noWrap>{account.bankName || "Unnamed bank"}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {account.accountName || "—"}
            </Typography>
          </Box>
          <Chip
            size="small"
            variant="outlined"
            color={account.isActive ? "success" : "default"}
            label={account.isActive ? "Active" : "Inactive"}
          />
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          className="tabular-nums"
          sx={{ mt: 1.5, letterSpacing: "0.08em" }}
        >
          {maskAccountNo(account.accountNo)}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
          Current balance
        </Typography>
        <Typography
          className="tabular-nums"
          sx={{
            fontWeight: 600,
            fontSize: "1.4rem",
            lineHeight: 1.3,
            color: current < 0 ? "error.main" : "text.primary",
          }}
        >
          {current == null ? "—" : inr(current)}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

/**
 * Horizontal slider of bank account cards.
 *
 * The track is a native horizontal scroller with snap points, so touch swipe
 * and keyboard focus work without extra code; Previous / Next scroll one full
 * view. Selecting a card reports its id, and selecting it again clears it.
 */
export default function BankAccountSlider({ accounts, loading, selectedId, onSelect, onAddAccount }) {
  const trackRef = useRef(null);
  const [view, setView] = useState({ prev: false, next: false, from: 0, to: 0 });
  const count = accounts.length;

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + GAP_PX : el.clientWidth;
    const perView = Math.max(1, Math.round((el.clientWidth + GAP_PX) / step));
    const first = Math.round(el.scrollLeft / step);
    setView({
      prev: el.scrollLeft > 2,
      next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      from: count ? Math.min(first + 1, count) : 0,
      to: Math.min(first + perView, count),
    });
  }, [count]);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, loading]);

  const page = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (el.clientWidth + GAP_PX), behavior: reduce ? "auto" : "smooth" });
  };

  const showControls = !loading && (view.prev || view.next);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, minHeight: 40 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Bank Accounts</Typography>
        {!loading && count > 0 && (
          <Typography variant="body2" color="text.secondary" className="tabular-nums">
            {!showControls
              ? `${count} ${count === 1 ? "account" : "accounts"}`
              : view.from === view.to
                ? `${view.from} of ${count}`
                : `${view.from}–${view.to} of ${count}`}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {showControls && (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Previous accounts">
              <span>
                <IconButton size="small" onClick={() => page(-1)} disabled={!view.prev} aria-label="Previous accounts"
                  sx={{ border: 1, borderColor: "divider" }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Next accounts">
              <span>
                <IconButton size="small" onClick={() => page(1)} disabled={!view.next} aria-label="Next accounts"
                  sx={{ border: 1, borderColor: "divider" }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {!loading && count === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <AccountBalanceIcon color="disabled" sx={{ fontSize: 36, mb: 1 }} />
          <Typography variant="subtitle2">No bank accounts found</Typography>
          <Typography variant="body2" color="text.secondary">
            Accounts set up in the system will appear here.
          </Typography>
          {onAddAccount && (
            <Button variant="outlined" size="small" onClick={onAddAccount} sx={{ mt: 2 }}>
              Add a bank account
            </Button>
          )}
        </Paper>
      ) : (
        <Box
          ref={trackRef}
          onScroll={measure}
          role="list"
          aria-label="Bank accounts"
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            // Room for the selected card's ring, which would otherwise be clipped;
            // the scroll padding keeps snapped cards clear of the edge too.
            p: "2px",
            m: "-2px",
            scrollPaddingInline: "2px",
          }}
        >
          {(loading ? Array.from({ length: 4 }, (_, i) => ({ id: `skeleton-${i}` })) : accounts).map((a) => (
            <Box key={a.id} role="listitem" sx={{ flex: "0 0 auto", flexBasis: CARD_BASIS, scrollSnapAlign: "start", minWidth: 0 }}>
              {loading ? (
                <Skeleton variant="rounded" height={150} />
              ) : (
                <AccountCard account={a} selected={a.id === selectedId} onSelect={onSelect} />
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
