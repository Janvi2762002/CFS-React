# Dashboard: backend changes

The new Overview dashboard reads only `GET /api/Dashboard/summary`, and the existing response already covers it. These are the extra changes needed from the backend.

## 1. Confirm (no code change)

| # | Question | Why it matters |
|---|---|---|
| 1 | Does `totalStockItems` count **every** stock item, with `availableStockCount` a subset of it? | The page shows "38 of 112 items available". |
| 2 | Are `totalSwipes` and `totalPartyProfit` **all-time** totals, or for a period? | The page labels them "All time". |
| 3 | Which roles can call `/Dashboard/summary`? Admin, or Master only? | The navigation shows module figures from this response. |

## 2. Add to `DashboardSummary`

These are calculated in the browser today. Returning them from the API keeps all business logic on the server.

| Field | Type | Calculation |
|---|---|---|
| `totalCapital` | number | `totalBankBalance + totalAvailableCash` |
| `totalOwedToYou` | number | `pendingStockReceivable` |
| `totalYouOwe` | number | `pendingStockPayable + totalPendingPartyPayment` |
| `netPosition` | number | `totalOwedToYou − totalYouOwe` (negative means you owe more) |
| `stockAvailablePct` | number | `availableStockCount ÷ totalStockItems × 100`, or `0` when the total is 0 |

Example `resultObject` (sample values):

```json
{
  "totalBankBalance": 1842300,
  "totalAvailableCash": 576350,
  "totalSwipes": 1284,
  "totalPartyProfit": 48620,
  "totalStockItems": 112,
  "totalPendingPartyPayment": 326400,
  "availableStockCount": 38,
  "availableStockValue": 1194000,
  "pendingStockPayable": 412500,
  "pendingStockReceivable": 268900,

  "totalCapital": 2418650,
  "totalOwedToYou": 268900,
  "totalYouOwe": 738900,
  "netPosition": -470000,
  "stockAvailablePct": 33.9
}
```

## 3. New endpoints for charts over time (later)

The summary has no history, so these charts can't be built yet. Each needs a new endpoint under `/api/Dashboard`, wrapped in the usual `resultObject` envelope.

| Chart | Endpoint | `resultObject` |
|---|---|---|
| Money in vs out, by month | `GET /Dashboard/monthly-flow?months=12` | `[{ "month": "2026-09", "bankIn": 0, "bankOut": 0, "cashIn": 0, "cashOut": 0 }]` |
| Swipes per day | `GET /Dashboard/swipes-daily?days=30` | `[{ "date": "2026-10-27", "count": 0, "amount": 0, "profit": 0 }]` |
| Top parties you owe | `GET /Dashboard/top-parties?limit=5` | `[{ "partyName": "", "type": "CardParty" \| "Supplier", "pending": 0 }]` |
| Balance by bank account | add `accounts` to `/Dashboard/summary` | `"accounts": [{ "accountId": 0, "bankName": "", "accountName": "", "currentBalance": 0 }]` |

Notes for these endpoints:
- Return every month or day in the range, with zeros for empty ones, so the charts have no gaps.
- Use local (IST) dates, the same as the rest of the API.
- Apply the same role rule as `/Dashboard/summary`.
