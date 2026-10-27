import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";
import SavingsIcon from "@mui/icons-material/SavingsOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import ReceiptIcon from "@mui/icons-material/ReceiptOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const has = (v) => v !== undefined && v !== null;

/* ─── App navigation ───────────────────────────────────────────────────────
   One entry per module in the rail. Each module's panel shows its figure
   (from GET /Dashboard/summary, when the role may read it), its main action
   and its pages. The Topbar reads page titles from here too, so a route
   added here gets its title for free.

   `roles` decides who sees a module or page at all. `masterOnly` pages stay
   visible to everyone but locked, so the feature remains discoverable. */
export const MODULES = [
  {
    id: "home", label: "Home", name: "Overview", icon: DashboardIcon,
    roles: ["master", "admin", "employee"],
    figure: (s) => has(s?.totalBankBalance) || has(s?.totalAvailableCash)
      ? { label: "Total capital", value: inr((s.totalBankBalance || 0) + (s.totalAvailableCash || 0)), sub: "Bank and cash together" }
      : null,
    pages: [
      { label: "Dashboard", path: "/dashboard", sub: "Real-time operational overview", masterOnly: true },
    ],
  },
  {
    id: "bank", label: "Bank", name: "Bank", icon: AccountBalanceIcon,
    roles: ["master", "admin"],
    figure: (s) => has(s?.totalBankBalance)
      ? { label: "Bank balance", value: inr(s.totalBankBalance), sub: "Across all active accounts" }
      : null,
    action: { label: "New transaction", path: "/bank-transactions" },
    pages: [
      { label: "Transactions",  path: "/bank-transactions", sub: "Bank account balances & transactions", icon: AccountBalanceIcon },
      { label: "Bank Accounts", path: "/bank-accounts",     sub: "Add and manage bank accounts",          icon: SavingsIcon },
    ],
  },
  {
    id: "cards", label: "Cards", name: "Cards", icon: CreditCardIcon,
    roles: ["master", "admin", "employee"],
    figure: (s) => has(s?.totalPendingPartyPayment)
      ? {
          label: "Pending to parties",
          value: inr(s.totalPendingPartyPayment),
          sub: has(s.totalSwipes) ? `${Number(s.totalSwipes).toLocaleString("en-IN")} swipes in total` : "",
        }
      : null,
    action: { label: "New swipe", path: "/swipes" },
    pages: [
      { label: "Card Swipes",   path: "/swipes",   sub: "Swipe transaction register",            icon: CreditCardIcon },
      { label: "Card Payments", path: "/payments", sub: "Party payment summaries & settlements", icon: ReceiptIcon },
    ],
  },
  {
    id: "stock", label: "Stock", name: "Stock", icon: Inventory2Icon,
    roles: ["master", "admin"],
    figure: (s) => has(s?.availableStockCount)
      ? {
          label: "In stock",
          value: `${Number(s.availableStockCount).toLocaleString("en-IN")} ${s.availableStockCount === 1 ? "item" : "items"}`,
          sub: has(s.availableStockValue) ? `${inr(s.availableStockValue)} stock value` : "",
        }
      : null,
    action: { label: "Add stock item", path: "/stock-items" },
    pages: [
      { label: "Stock Items",    path: "/stock-items",    sub: "Inventory & stock movement", icon: Inventory2Icon },
      { label: "Stock Payments", path: "/stock-payments", sub: "Payments for stock items",   icon: ReceiptIcon },
    ],
  },
  {
    id: "cash", label: "Cash", name: "Cash", icon: AccountBalanceWalletIcon,
    roles: ["master", "admin"],
    figure: (s) => has(s?.totalAvailableCash)
      ? { label: "Cash in hand", value: inr(s.totalAvailableCash), sub: "Current cash ledger balance" }
      : null,
    action: { label: "New cash entry", path: "/cash-ledger" },
    pages: [
      { label: "Cash Ledger", path: "/cash-ledger", sub: "Incoming and outgoing cash register", icon: AccountBalanceWalletIcon },
    ],
  },
  {
    id: "admin", label: "Admin", name: "Administration", icon: GroupsIcon,
    roles: ["master"],
    // Sits at the foot of the rail; on phones it lives in the account menu.
    secondary: true,
    action: { label: "Add user", path: "/users" },
    pages: [
      { label: "User Management", path: "/users", sub: "System access & role control", icon: GroupsIcon },
    ],
  },
];

/** Modules the role can see. */
export const modulesFor = (role) => MODULES.filter((m) => m.roles.includes(role));

const matches = (path, pathname) =>
  pathname === path || pathname.startsWith(`${path}/`);

/** The module and page for a route, or nulls when the route isn't in the nav. */
export function findRoute(pathname) {
  for (const module of MODULES) {
    const page = module.pages.find((p) => matches(p.path, pathname));
    if (page) return { module, page };
  }
  return { module: null, page: null };
}
