import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Button, CircularProgress, Paper, Divider, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Chip,
  TextField, MenuItem, Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChart, BarPlot } from "@mui/x-charts/BarChart";
import { LinePlot, MarkPlot } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { ChartsContainer } from "@mui/x-charts/ChartsContainer";
import { ChartsXAxis } from "@mui/x-charts/ChartsXAxis";
import { ChartsYAxis } from "@mui/x-charts/ChartsYAxis";
import { ChartsGrid } from "@mui/x-charts/ChartsGrid";
import { ChartsTooltip } from "@mui/x-charts/ChartsTooltip";
import { ChartsAxisHighlight } from "@mui/x-charts/ChartsAxisHighlight";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingIcon from "@mui/icons-material/PendingOutlined";
import PaymentsIcon from "@mui/icons-material/PaymentsOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StatTile from "../components/StatTile";
import AdminService from "../services/AdminService";

/* Profit comes from each swipe's recorded `profit`. Swipes saved before that
   field existed carry none and count at the old flat rate, so earlier periods
   do not read as a collapse in profit. */
const FALLBACK_PROFIT_PER_SWIPE = 300;
const hasProfit = (r) => r.profit != null && r.profit !== "";
const profitOf  = (r) => (hasProfit(r) ? Number(r.profit) || 0 : FALLBACK_PROFIT_PER_SWIPE);

const PERIODS = [
  { id: "today",     label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d",        label: "Last 7 days" },
  { id: "30d",       label: "Last 30 days" },
  { id: "month",     label: "This month" },
  { id: "all",       label: "All time" },
];

const inr      = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inrShort = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (Math.abs(v) >= 1e3) return `₹${Math.round(v / 1e3)}K`;
  return `₹${v}`;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Half-open [start, end) window for a period id. `null` means all time. */
function rangeFor(id, now = new Date()) {
  const today = startOfDay(now);
  const back = (days) => {
    const s = new Date(today);
    s.setDate(s.getDate() - days);
    return s;
  };

  switch (id) {
    case "today":     return { start: today, end: now };
    case "yesterday": return { start: back(1), end: today };
    case "7d":        return { start: back(6), end: now };
    case "30d":       return { start: back(29), end: now };
    case "month":     return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    default:          return null;
  }
}

/* ─── Chart panel with a plain-English subtitle ──────────────────────────── */
function Panel({ title, subtitle, action, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {action}
      </Stack>
      <Divider />
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
    </Paper>
  );
}

/* Legends live here rather than in the chart, so long labels wrap instead of
   being clipped out of the plotting area. */
function Legend({ items }) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ px: 2, pt: 1.5 }}>
      {items.map((it) => (
        <Stack key={it.label} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: it.color, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">{it.label}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/* Legend doubling as a breakdown table: swatch, label, value and share. */
function LegendTable({ items, total }) {
  return (
    <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
      {items.map((it) => (
        <Stack key={it.label} direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: it.color, flexShrink: 0 }} />
          <Typography variant="body2" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>{it.label}</Typography>
          <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600 }}>
            {inrShort(it.value)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "right" }}>
            {total ? `${Math.round((it.value / total) * 100)}%` : ""}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function EmptyNote({ children }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: "100%", py: 6, px: 2 }}>
      <InfoOutlinedIcon color="disabled" />
      <Typography variant="body2" color="text.secondary" textAlign="center">{children}</Typography>
    </Stack>
  );
}

/* ═══ Dashboard ═════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [txData, setTxData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const [error, setError] = useState("");

  useEffect(() => {
    AdminService.getCardInfo()
      .then(setTxData)
      .catch((e) => { setTxData([]); setError(e?.message || "Could not load swipe data."); })
      .finally(() => setLoading(false));
  }, []);

  /* Slice colours, reused by the donut and its legend table. */
  const BANK_COLORS = useMemo(() => [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ], [theme]);

  const TONES = useMemo(() => ({
    volume:  theme.palette.secondary.main,
    profit:  theme.palette.success.main,
    pending: theme.palette.warning.main,
    settled: theme.palette.success.main,
    brand:   theme.palette.primary.main,
  }), [theme]);

  /* ── Period slicing. A dated filter can only speak for dated rows, so
        rows without a usable date are counted under "All time" only. ───── */
  const { current, previous } = useMemo(() => {
    const rows = txData.map((t) => ({ ...t, _d: t.date ? new Date(t.date) : null }));
    const range = rangeFor(period);
    if (!range) return { current: rows, previous: [] };

    const { start, end } = range;
    const span = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - span);
    const dated = rows.filter((r) => r._d && !isNaN(r._d));
    const within = (r, a, b) => r._d.getTime() >= a.getTime() && r._d.getTime() < b.getTime();

    return {
      current:  dated.filter((r) => within(r, start, end)),
      previous: dated.filter((r) => within(r, prevStart, start)),
    };
  }, [txData, period]);

  const totals = (rows) => ({
    swipes:  rows.length,
    volume:  rows.reduce((s, r) => s + (Number(r.deduction) || 0), 0),
    profit:  rows.reduce((s, r) => s + profitOf(r), 0),
    pending: rows.filter((r) => !r.limitUsed).reduce((s, r) => s + (Number(r.deduction) || 0), 0),
    estimated: rows.filter((r) => !hasProfit(r)).length,
  });

  const now  = totals(current);
  const prev = totals(previous);

  /* Movement is only meaningful when there is a previous period to compare. */
  const delta = (a, b) => (previous.length && b > 0 ? ((a - b) / b) * 100 : null);

  const avgTicket  = now.swipes ? now.volume / now.swipes : 0;
  const settledPct = now.volume ? ((now.volume - now.pending) / now.volume) * 100 : 0;

  /* ── Trend grain follows the period: hours within a day, days within a
        month, months across the whole history. ─────────────────────────── */
  const grain = period === "today" || period === "yesterday" ? "hour"
              : period === "all"                             ? "month"
              : "day";

  const trend = useMemo(() => {
    const bucketOf = (d) => {
      if (grain === "hour") {
        const h = new Date(d);
        h.setMinutes(0, 0, 0);
        return { key: h.toISOString(), label: h.toLocaleTimeString("en-IN", { hour: "2-digit", hour12: true }) };
      }
      if (grain === "day") {
        return {
          key: startOfDay(d).toISOString(),
          label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        };
      }
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      };
    };

    const buckets = new Map();
    current.forEach((r) => {
      const { key, label } = bucketOf(r._d);
      const b = buckets.get(key) || { key, label, volume: 0, swipes: 0, profit: 0 };
      b.volume += Number(r.deduction) || 0;
      b.swipes += 1;
      b.profit += profitOf(r);
      buckets.set(key, b);
    });

    return [...buckets.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-14);
  }, [current, grain]);

  const grainLabel = grain === "hour" ? "hour" : grain === "day" ? "day" : "month";

  /* ── Breakdowns ──────────────────────────────────────────────────────── */
  const byParty = useMemo(() => {
    const m = new Map();
    current.forEach((r) => {
      const k = r.partyName || "Unknown";
      const e = m.get(k) || { name: k, volume: 0, swipes: 0 };
      e.volume += Number(r.deduction) || 0;
      e.swipes += 1;
      m.set(k, e);
    });
    return [...m.values()].sort((a, b) => b.volume - a.volume).slice(0, 6);
  }, [current]);

  const byBank = useMemo(() => {
    const m = new Map();
    current.forEach((r) => {
      const k = r.bankName || "Unknown";
      m.set(k, (m.get(k) || 0) + (Number(r.deduction) || 0));
    });
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((d, id) => ({ id, ...d, color: BANK_COLORS[id % BANK_COLORS.length] }));
  }, [current, BANK_COLORS]);

  const bankLegend = byBank.map((b) => ({ label: b.label, value: b.value, color: b.color }));

  const settlement = useMemo(() => {
    const settled = current.filter((r) => r.limitUsed).reduce((s, r) => s + (Number(r.deduction) || 0), 0);
    return [
      { id: 0, label: "Settled", value: settled,     color: TONES.settled },
      { id: 1, label: "Pending", value: now.pending, color: TONES.pending },
    ].filter((d) => d.value > 0);
  }, [current, now.pending, TONES]);

  const recentTx = useMemo(
    () => [...current].sort((a, b) => (b._d?.getTime() || 0) - (a._d?.getTime() || 0)).slice(0, 6),
    [current]
  );

  const periodLabel = PERIODS.find((p) => p.id === period)?.label.toLowerCase() || "";

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* ── Header & period filter ──────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" gutterBottom>Business Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            Profit, volume and settlement performance across the swipe network.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {PERIODS.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate("/transactions")} sx={{ whiteSpace: "nowrap" }}>
            New Swipe
          </Button>
          <Button variant="contained" startIcon={<AccountBalanceWalletIcon />} onClick={() => navigate("/payments")} sx={{ whiteSpace: "nowrap" }}>
            Payments
          </Button>
        </Stack>
      </Stack>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} className="stagger" sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Net Profit" value={inr(now.profit)}
            hint={now.estimated
              ? `${now.estimated.toLocaleString()} swipe${now.estimated === 1 ? "" : "s"} without a recorded profit counted at ₹${FALLBACK_PROFIT_PER_SWIPE}`
              : "From recorded swipe profits"}
            delta={delta(now.profit, prev.profit)}
            icon={TrendingUpIcon} color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Gross Volume" value={inr(now.volume)}
            hint={`Average swipe ${inr(Math.round(avgTicket))}`}
            delta={delta(now.volume, prev.volume)}
            icon={PaymentsIcon} color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Total Swipes" value={now.swipes.toLocaleString()}
            hint="Transactions recorded"
            delta={delta(now.swipes, prev.swipes)}
            icon={ReceiptLongIcon} color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Pending Settlement" value={inr(now.pending)}
            hint={`${settledPct.toFixed(0)}% of volume already settled`}
            icon={PendingIcon} color="warning"
          />
        </Grid>
      </Grid>

      {/* ── Trend + settlement split ────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel
            title="Volume & profit over time"
            subtitle={`Bars are how much was swiped each ${grainLabel}, the line is what we earned — ${periodLabel}`}
          >
            {trend.length === 0 ? (
              <EmptyNote>No swipes recorded in this period.</EmptyNote>
            ) : (
              <>
                <Legend items={[
                  { label: "Swipe volume (left axis)", color: TONES.volume },
                  { label: "Net profit (right axis)",  color: TONES.profit },
                ]} />
                <ChartsContainer
                  height={310}
                  margin={{ left: 10, right: 10, top: 16, bottom: 10 }}
                  dataset={trend}
                  xAxis={[{ id: "bucket", scaleType: "band", dataKey: "label", categoryGapRatio: 0.6 }]}
                  yAxis={[
                    { id: "vol",    width: 62, valueFormatter: inrShort },
                    { id: "profit", position: "right", width: 62, valueFormatter: inrShort },
                  ]}
                  series={[
                    { type: "bar",  dataKey: "volume", label: "Swipe volume", yAxisId: "vol",    color: TONES.volume, valueFormatter: inr },
                    { type: "line", dataKey: "profit", label: "Net profit",   yAxisId: "profit", color: TONES.profit, valueFormatter: inr, curve: "monotoneX" },
                  ]}
                  sx={{ "& .MuiChartsAxis-tickLabel": { fontSize: 12 } }}
                >
                  <ChartsGrid horizontal />
                  <BarPlot borderRadius={6} />
                  <LinePlot />
                  <MarkPlot />
                  <ChartsXAxis axisId="bucket" tickLabelStyle={trend.length > 7 ? { angle: -35, textAnchor: "end", fontSize: 11 } : undefined} />
                  <ChartsYAxis axisId="vol" />
                  <ChartsYAxis axisId="profit" position="right" />
                  <ChartsAxisHighlight x="band" />
                  <ChartsTooltip />
                </ChartsContainer>
              </>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel
            title="Settled vs pending"
            subtitle="How much of the swiped volume is still owed"
          >
            {settlement.length === 0 ? (
              <EmptyNote>Nothing to settle in this period.</EmptyNote>
            ) : (
              <Stack sx={{ height: "100%" }} justifyContent="center">
                <PieChart
                  height={230}
                  hideLegend
                  series={[{
                    data: settlement,
                    innerRadius: 58,
                    outerRadius: 92,
                    paddingAngle: 2,
                    cornerRadius: 6,
                    valueFormatter: (v) => inr(v.value),
                  }]}
                />
                <Stack direction="row" justifyContent="center" spacing={4} sx={{ pb: 2.5, pt: 1 }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" className="tabular-nums" sx={{ color: "success.main" }}>
                      {settledPct.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Settled</Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" className="tabular-nums" sx={{ color: "warning.main" }}>
                      {inrShort(now.pending)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Outstanding</Typography>
                  </Box>
                </Stack>
              </Stack>
            )}
          </Panel>
        </Grid>
      </Grid>

      {/* ── Party & bank breakdowns ─────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel
            title="Top parties by volume"
            subtitle="Who puts the most business through the network"
            action={
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/payments")}>
                Payments
              </Button>
            }
          >
            {byParty.length === 0 ? (
              <EmptyNote>No party activity in this period.</EmptyNote>
            ) : (
              <BarChart
                height={300}
                layout="horizontal"
                margin={{ left: 10, right: 24, top: 16, bottom: 10 }}
                dataset={byParty}
                yAxis={[{ scaleType: "band", dataKey: "name", width: 140, categoryGapRatio: 0.45 }]}
                xAxis={[{ valueFormatter: inrShort }]}
                series={[{ dataKey: "volume", label: "Swipe volume", color: TONES.brand, valueFormatter: inr }]}
                borderRadius={6}
                hideLegend
                sx={{ "& .MuiChartsAxis-tickLabel": { fontSize: 12 } }}
              />
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel
            title="Volume by bank"
            subtitle="Which card issuers the volume flows through"
          >
            {byBank.length === 0 ? (
              <EmptyNote>No bank data in this period.</EmptyNote>
            ) : (
              <Box>
                <PieChart
                  height={200}
                  hideLegend
                  margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  series={[{
                    data: byBank,
                    innerRadius: 44,
                    outerRadius: 82,
                    paddingAngle: 2,
                    cornerRadius: 6,
                    valueFormatter: (v) => inr(v.value),
                  }]}
                />
                <LegendTable items={bankLegend} total={now.volume} />
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>

      {/* ── Recent activity ─────────────────────────────────────────────── */}
      <Panel
        title="Latest swipes"
        subtitle="The six most recent transactions"
        action={
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/transactions")}>
            View all
          </Button>
        }
      >
        {recentTx.length === 0 ? (
          <EmptyNote>No swipe activity logged in this period.</EmptyNote>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Party</TableCell>
                  <TableCell>Card</TableCell>
                  <TableCell>Bank</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTx.map((row, i) => (
                  <TableRow key={row.id || i} hover>
                    <TableCell>{row.partyName || "—"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.cardName || "—"}</Typography>
                      {row.cardNumber && (
                        <Typography variant="caption" color="text.secondary">
                          •••• {String(row.cardNumber).slice(-4)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.bankName || "—"}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600, color: "success.main" }}>
                        {inr(row.deduction || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={row.limitUsed ? "success" : "warning"}
                        label={row.limitUsed ? "Settled" : "Pending"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>
    </Box>
  );
}
