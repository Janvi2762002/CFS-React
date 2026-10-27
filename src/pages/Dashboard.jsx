import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Alert, Box, Button, CircularProgress, Grid, Paper, Skeleton, Stack, Tooltip, Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CallMadeIcon from "@mui/icons-material/CallMade";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

/* ─── Overview board ───────────────────────────────────────────────────────
   Everything on this page comes from one response, GET /Dashboard/summary,
   which MainLayout fetches and shares through the Outlet context (the
   module rail shows the same figures). Three figures are worked out here
   from that response: total capital, net pending and stock available %.
   Spec: docs/dashboard-overview-layout-a.md */

/* A missing or non-numeric field is shown as "–", never as 0. */
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

const inr = (n) => (n == null ? "–" : `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`);
const count = (n) => (n == null ? "–" : n.toLocaleString("en-IN"));

/** Compact Indian notation for bar labels and axis ticks: ₹2.7 L, ₹1.2 Cr. */
function lakh(n) {
  if (n == null) return "–";
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a === 0) return "0";
  if (a >= 1e7) return `${sign}₹${+(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${+(a / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `${sign}₹${+(a / 1e3).toFixed(1)}K`;
  return `${sign}₹${Math.round(a)}`;
}

/* Axis end for four equal steps, with the step itself a round number
   (1, 1.5, 2, 2.5 … × 10ⁿ) so every tick reads cleanly: 0 · ₹1.5 L · ₹3 L … */
function niceMax(v) {
  // At least ₹1,000, so tiny amounts don't produce repeated tick labels.
  const raw = Math.max(v || 0, 1000) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= raw) return m * p * 4;
  return 40 * p;
}

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/* ── Building blocks ─────────────────────────────────────────────────── */

function Card({ children, sx }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, height: "100%", display: "flex", flexDirection: "column", gap: 2, ...sx }}>
      {children}
    </Paper>
  );
}

function Eyebrow({ children }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", lineHeight: 1.6 }}
    >
      {children}
    </Typography>
  );
}

function CardHeader({ title, sub, to, linkLabel }) {
  const navigate = useNavigate();
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      {to && (
        <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: "0.9rem !important" }} />} onClick={() => navigate(to)} sx={{ flexShrink: 0, py: 0.25 }}>
          {linkLabel}
        </Button>
      )}
    </Stack>
  );
}

function Tile({ label, value, caption }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 3, px: 1.75, py: 1.5, minWidth: 0 }}>
      <Eyebrow>{label}</Eyebrow>
      <Typography className="tabular-nums" sx={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
        {value}
      </Typography>
      {caption && <Typography variant="caption" color="text.secondary">{caption}</Typography>}
    </Box>
  );
}

function Swatch({ color }) {
  return <Box component="span" sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: color, flexShrink: 0, display: "inline-block" }} />;
}

/**
 * Part-to-whole bar: one segment per positive part, 2px apart, rounded only
 * at the outer ends. Negative parts (an overdraft) can't be drawn as a
 * share, so they stay out of the bar and appear in the legend with a minus.
 */
function SplitBar({ parts, label }) {
  const drawn = parts.filter((p) => p.value != null && p.value > 0);
  const total = drawn.reduce((a, p) => a + p.value, 0);

  return (
    <Stack spacing={1.25}>
      {total > 0 && (
        <Stack direction="row" spacing="2px" sx={{ height: 20 }} role="img" aria-label={label}>
          {drawn.map((p, i) => (
            <Tooltip key={p.name} title={`${p.name}: ${inr(p.value)} · ${pct(p.value, total).toFixed(1)}%`} arrow>
              <Box
                tabIndex={0}
                sx={{
                  width: `${pct(p.value, total)}%`,
                  bgcolor: p.color,
                  borderTopLeftRadius: i === 0 ? 4 : 0,
                  borderBottomLeftRadius: i === 0 ? 4 : 0,
                  borderTopRightRadius: i === drawn.length - 1 ? 4 : 0,
                  borderBottomRightRadius: i === drawn.length - 1 ? 4 : 0,
                  "&:hover, &:focus-visible": { filter: "brightness(1.08)" },
                }}
              />
            </Tooltip>
          ))}
        </Stack>
      )}
      <Stack direction="row" flexWrap="wrap" columnGap={2.5} rowGap={0.5}>
        {parts.map((p) => (
          <Stack key={p.name} direction="row" spacing={1} alignItems="center">
            <Swatch color={p.color} />
            <Typography variant="body2" color="text.secondary">
              {p.name}{" "}
              <Box component="b" className="tabular-nums" sx={{ color: "text.primary", fontWeight: 600 }}>{inr(p.value)}</Box>
              {total > 0 && p.value > 0 ? ` · ${Math.round(pct(p.value, total))}%` : ""}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function Meter({ value, label }) {
  const theme = useTheme();
  return (
    <Box role="img" aria-label={label} sx={{ height: 12, borderRadius: 99, bgcolor: theme.palette.chart.track, overflow: "hidden" }}>
      <Box sx={{ height: "100%", width: `${Math.min(Math.max(value, 0), 1) * 100}%`, borderRadius: 99, bgcolor: theme.palette.chart.bank }} />
    </Box>
  );
}

/* Room kept after the plot so the longest bar's label never squeezes the scale. */
const LABEL_ROOM = 72;

/**
 * Horizontal bars on one shared scale from 0, value at each bar's tip,
 * quarter gridlines that line up with the ticks underneath.
 */
function HBarChart({ rows, label }) {
  const theme = useTheme();
  const top = niceMax(Math.max(0, ...rows.map((r) => r.value ?? 0)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const columns = { xs: "1fr", sm: "minmax(150px, 36%) minmax(0, 1fr)" };

  return (
    <Box role="img" aria-label={label}>
      {rows.map((r) => {
        const w = pct(Math.max(r.value ?? 0, 0), top);
        const NoteIcon = r.noteIcon;
        return (
          <Box key={r.name} sx={{ display: "grid", gridTemplateColumns: columns, columnGap: 1.5, alignItems: "stretch" }}>
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", py: { xs: 0.75, sm: 0.75 }, pb: { xs: 0.25, sm: 0.75 }, minWidth: 0 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{r.name}</Typography>
              {r.note && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
                  {NoteIcon && <NoteIcon sx={{ fontSize: 13 }} />}
                  <Typography variant="caption">{r.note}</Typography>
                </Stack>
              )}
            </Box>
            <Box
              sx={{
                position: "relative", minHeight: 36, mr: `${LABEL_ROOM}px`,
                backgroundImage: `linear-gradient(to right, ${theme.palette.chart.grid} 1px, transparent 1px)`,
                backgroundSize: "25% 100%",
                borderRight: `1px solid ${theme.palette.chart.grid}`,
              }}
            >
              {r.value != null && (
                <Tooltip title={`${r.name}: ${inr(r.value)}`} arrow placement="top">
                  <Box
                    tabIndex={0}
                    sx={{
                      position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      height: 20, width: `${w}%`, minWidth: 2, bgcolor: r.color,
                      borderRadius: "0 4px 4px 0",
                      "&:hover, &:focus-visible": { filter: "brightness(1.08)" },
                    }}
                  />
                </Tooltip>
              )}
              <Typography
                variant="body2"
                className="tabular-nums"
                sx={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `calc(${w}% + 8px)`, fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {lakh(r.value)}
              </Typography>
            </Box>
          </Box>
        );
      })}

      <Box sx={{ display: "grid", gridTemplateColumns: columns, columnGap: 1.5 }}>
        <Box sx={{ display: { xs: "none", sm: "block" } }} />
        <Box sx={{ position: "relative", height: 20, mr: `${LABEL_ROOM}px` }}>
          {ticks.map((t, i) => (
            <Typography
              key={t}
              variant="caption"
              color="text.disabled"
              className="tabular-nums"
              sx={{ position: "absolute", top: 4, left: `${pct(t, top)}%`, transform: i === 0 ? "none" : "translateX(-50%)", whiteSpace: "nowrap", lineHeight: 1.2 }}
            >
              {lakh(t)}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────── */

function CapitalCard({ bank, cash }) {
  const theme = useTheme();
  // Calculated here: bank + cash.
  const capital = bank == null && cash == null ? null : (bank ?? 0) + (cash ?? 0);

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box>
        <Eyebrow>Total capital</Eyebrow>
        <Typography variant="caption" color="text.secondary">Money in bank accounts and cash in hand</Typography>
      </Box>
      <Typography
        component="p"
        className="tabular-nums"
        sx={{ fontSize: { xs: "2.25rem", sm: "3rem" }, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05 }}
      >
        {inr(capital)}
      </Typography>
      <SplitBar
        label={`Bank ${inr(bank)}, cash ${inr(cash)}`}
        parts={[
          { name: "Bank", value: bank, color: theme.palette.chart.bank },
          { name: "Cash", value: cash, color: theme.palette.chart.cash },
        ]}
      />
    </Card>
  );
}

function StockCard({ available, total, value }) {
  // Calculated here: available ÷ total.
  const share = total > 0 && available != null ? available / total : null;

  return (
    <Card>
      <CardHeader title="Stock on hand" sub="Items available to sell" to="/stock-items" linkLabel="Stock" />
      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">No stock recorded yet.</Typography>
      ) : (
        <>
          <Typography className="tabular-nums" sx={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
            {count(available)}{" "}
            <Typography component="span" variant="body2" color="text.secondary">of {count(total)} items</Typography>
          </Typography>
          {share != null && (
            <Stack spacing={0.75}>
              <Meter value={share} label={`${count(available)} of ${count(total)} items available`} />
              <Typography variant="caption" color="text.secondary">
                {Math.round(share * 100)}% of stock is still available
              </Typography>
            </Stack>
          )}
        </>
      )}
      <Tile label="Stock value" value={inr(value)} caption="Value of the items still in stock" />
    </Card>
  );
}

function PendingCard({ receivable, payable, parties }) {
  const theme = useTheme();
  // Calculated here: what you're owed minus what you owe.
  const net = receivable != null && payable != null && parties != null ? receivable - (payable + parties) : null;
  const owe = net != null && net < 0;
  const tone = owe ? theme.palette.warning : theme.palette.success;
  const NetIcon = owe ? WarningAmberRoundedIcon : CheckCircleOutlineIcon;

  return (
    <Card>
      <CardHeader title="Pending payments" sub="Not yet settled" />
      <HBarChart
        label="Pending payments by type"
        rows={[
          { name: "Receivable from buyers", note: "Owed to you", noteIcon: CallReceivedIcon, value: receivable, color: theme.palette.chart.bank },
          { name: "Payable to suppliers", note: "You owe", noteIcon: CallMadeIcon, value: payable, color: theme.palette.chart.owe },
          { name: "Pending to card parties", note: "You owe", noteIcon: CallMadeIcon, value: parties, color: theme.palette.chart.owe },
        ]}
      />
      <Stack direction="row" flexWrap="wrap" columnGap={2.5} rowGap={0.5}>
        <Stack direction="row" spacing={1} alignItems="center"><Swatch color={theme.palette.chart.bank} /><Typography variant="body2" color="text.secondary">Owed to you</Typography></Stack>
        <Stack direction="row" spacing={1} alignItems="center"><Swatch color={theme.palette.chart.owe} /><Typography variant="body2" color="text.secondary">You owe</Typography></Stack>
      </Stack>
      {net != null && (
        <Box sx={{ pt: 1.5, borderTop: 1, borderColor: "divider", mt: "auto" }}>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              display: "inline-flex", px: 1.25, py: 0.5, borderRadius: 99,
              bgcolor: alpha(tone.main, theme.palette.mode === "dark" ? 0.16 : 0.12),
              color: theme.palette.mode === "dark" ? tone.light : tone.dark,
            }}
          >
            <NetIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {owe
                ? `You owe ${inr(-net)} more than you're owed`
                : `You're owed ${inr(net)} more than you owe`}
            </Typography>
          </Stack>
        </Box>
      )}
    </Card>
  );
}

function SwipesCard({ swipes, profit, parties }) {
  return (
    <Card>
      <CardHeader title="Card swipes" sub="All time" to="/swipes" linkLabel="Cards" />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
        <Tile label="Swipes" value={count(swipes)} caption="Entries recorded" />
        <Tile label="Party profit" value={inr(profit)} caption="Earned on swipes" />
      </Box>
      <Tile label="Pending to parties" value={inr(parties)} caption="Swipe amounts not yet paid out" />
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

function BoardSkeleton() {
  const sizes = [7, 5, 7, 5];
  return (
    <Grid container spacing={2} aria-busy="true" aria-label="Loading the dashboard">
      {sizes.map((md, i) => (
        <Grid key={i} size={{ xs: 12, md }}>
          <Skeleton variant="rounded" height={i < 2 ? 220 : 260} sx={{ borderRadius: 4 }} />
        </Grid>
      ))}
    </Grid>
  );
}

const timeOf = (d) => d?.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function Dashboard() {
  const { dashboard } = useOutletContext() || {};
  const { data, loading = false, error = "", updatedAt = null, refresh } = dashboard || {};

  const s = data
    ? {
        bank: num(data.totalBankBalance),
        cash: num(data.totalAvailableCash),
        swipes: num(data.totalSwipes),
        profit: num(data.totalPartyProfit),
        stockTotal: num(data.totalStockItems),
        parties: num(data.totalPendingPartyPayment),
        stockAvailable: num(data.availableStockCount),
        stockValue: num(data.availableStockValue),
        payable: num(data.pendingStockPayable),
        receivable: num(data.pendingStockReceivable),
      }
    : null;

  return (
    <Box className="page-enter">
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: error ? "warning.main" : "success.main", flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {updatedAt ? `Updated ${timeOf(updatedAt)}` : loading ? "Loading…" : "Not loaded yet"}
          </Typography>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          onClick={() => refresh?.()}
          disabled={loading || !refresh}
          startIcon={loading && data ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
        >
          Refresh
        </Button>
      </Stack>

      {/* Never show ₹0 figures in place of data that didn't load. */}
      {!s && loading && <BoardSkeleton />}

      {!s && !loading && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="subtitle1" gutterBottom>
            {error ? "The dashboard couldn't be loaded" : "No dashboard figures yet"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error || "The summary came back empty."}
          </Typography>
          <Button variant="contained" onClick={() => refresh?.()} disabled={!refresh}>Try again</Button>
        </Paper>
      )}

      {s && (
        <>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Couldn't refresh: {error} Showing the figures from {timeOf(updatedAt) || "earlier"}.
            </Alert>
          )}
          <Grid container spacing={2} className="stagger">
            <Grid size={{ xs: 12, md: 7 }}>
              <CapitalCard bank={s.bank} cash={s.cash} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <StockCard available={s.stockAvailable} total={s.stockTotal} value={s.stockValue} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <PendingCard receivable={s.receivable} payable={s.payable} parties={s.parties} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <SwipesCard swipes={s.swipes} profit={s.profit} parties={s.parties} />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
