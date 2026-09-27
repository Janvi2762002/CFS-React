import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCardOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";

// Card sub-items
import BoltIcon from "@mui/icons-material/BoltOutlined";
import ReceiptIcon from "@mui/icons-material/ReceiptLongOutlined";
import HandshakeIcon from "@mui/icons-material/HandshakeOutlined";
import UndoIcon from "@mui/icons-material/ReplayOutlined";
import LimitsIcon from "@mui/icons-material/TuneOutlined";

// Cash sub-items
import PaymentsIcon from "@mui/icons-material/PaymentsOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";

// Admin / Master sub-items
import ManageAccountsIcon from "@mui/icons-material/ManageAccountsOutlined";
import ShieldIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import SavingsIcon from "@mui/icons-material/SavingsOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import TableChartIcon from "@mui/icons-material/TableChartOutlined";

import { PERMISSIONS as P } from "../auth/permissions";

/**
 * 4 primary tabs as per spec:
 *  1. Dashboard  (Master only)
 *  2. Card Management (All users)
 *  3. Cash Management (Master & Admin)
 *  4. Stock Management (Coming Soon)
 *
 * Sub-pages are grouped under each tab. The sidebar shows sections,
 * the topbar shows the current page title.
 */
export const NAV_SECTIONS = [
  // ── 1. Dashboard ──────────────────────────────────────────────────────────
  {
    id: "overview",
    label: "Overview",
    tabId: "dashboard",
    items: [
      { label: "Dashboard",       path: "/dashboard",         icon: DashboardIcon,  permission: P.DASHBOARD_VIEW },
    ],
  },

  // ── 2. Card Management ────────────────────────────────────────────────────
  {
    id: "swipe",
    label: "Swipe",
    tabId: "cards",
    items: [
      { label: "New Swipe",       path: "/swipes/new",        icon: BoltIcon,        permission: P.SWIPE_CREATE, highlight: true },
      { label: "Swipe Register",  path: "/swipes",            icon: ReceiptIcon,     permission: P.SWIPE_VIEW },
      { label: "Settlements",     path: "/swipes/settlements",icon: HandshakeIcon,   permission: P.SWIPE_SETTLE },
      { label: "Refunds",         path: "/swipes/refunds",    icon: UndoIcon,        permission: P.SWIPE_REFUND },
    ],
  },
  {
    id: "cards",
    label: "Cards",
    tabId: "cards",
    items: [
      { label: "Card Master",      path: "/cards",            icon: CreditCardIcon,           permission: P.CARD_VIEW },
      { label: "Limits & Usage",   path: "/cards/limits",     icon: LimitsIcon,               permission: P.CARD_VIEW },
    ],
  },

  // ── 3. Cash Management ────────────────────────────────────────────────────
  {
    id: "cash",
    label: "Cash",
    tabId: "cash",
    items: [
      { label: "Cash Book",       path: "/cash",              icon: PaymentsIcon,   permission: P.CASH_VIEW },
      { label: "Bank Accounts",   path: "/cash/accounts",     icon: AccountBalanceIcon, permission: P.CASH_VIEW },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    tabId: "cash",
    items: [
      { label: "Capital",             path: "/accounts/capital", icon: SavingsIcon,    permission: P.ACCOUNT_VIEW },
      { label: "Profit & Loss",       path: "/accounts/profit",  icon: TrendingUpIcon, permission: P.ACCOUNT_VIEW },
      { label: "Party Ledger",        path: "/accounts/ledger",  icon: MenuBookIcon,   permission: P.LEDGER_VIEW },
    ],
  },

  // ── 4. Stock Management (Coming Soon) ─────────────────────────────────────
  {
    id: "stock",
    label: "Stock",
    tabId: "stock",
    items: [
      { label: "Stock Items",     path: "/stock",             icon: Inventory2Icon, permission: P.STOCK_VIEW },
    ],
  },

  // ── Master / Admin only ───────────────────────────────────────────────────
  {
    id: "masters",
    label: "Masters",
    tabId: "cash",
    items: [
      { label: "Parties",         path: "/parties",           icon: GroupsIcon,     permission: P.PARTY_VIEW },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    tabId: "admin",
    items: [
      { label: "Users",           path: "/admin/users",       icon: ManageAccountsIcon, permission: P.USER_MANAGE },
      { label: "Roles & Access",  path: "/admin/roles",       icon: ShieldIcon,         permission: P.ROLE_MANAGE },
      { label: "Excel Center",    path: "/reports/excel",     icon: TableChartIcon,     permission: P.REPORT_VIEW },
    ],
  },
];

/** Primary tabs for the sidebar header (the 4 main modules). */
export const PRIMARY_TABS = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon, permission: P.DASHBOARD_VIEW },
  { id: "cards",     label: "Cards",     icon: CreditCardIcon, permission: P.CARD_VIEW },
  { id: "cash",      label: "Cash",      icon: AccountBalanceWalletIcon, permission: P.CASH_VIEW },
  { id: "stock",     label: "Stock",     icon: Inventory2Icon, permission: P.STOCK_VIEW },
];

/** Flattened lookup used for breadcrumbs and the page title. */
export const NAV_INDEX = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label, tabId: section.tabId }))
);

export function visibleSections(can) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0);
}
