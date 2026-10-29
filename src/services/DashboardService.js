import apiClient, { unwrap } from "./apiClient";

/**
 * Dashboard figures (Admin and Master only).
 *
 * GET /Dashboard/summary returns the headline totals, the derived figures
 * (totalCapital, totalOwedToYou, totalYouOwe, netPosition, stockAvailablePct)
 * and `accounts`, each account's current balance. The other three endpoints
 * return zero-filled series in IST, so charts never have gaps.
 */
class DashboardService {
  async getSummary() {
    return unwrap(await apiClient.get("/Dashboard/summary"));
  }

  /** [{ month: "2026-09", bankIn, bankOut, cashIn, cashOut }], oldest first. 1–60 months. */
  async getMonthlyFlow(months = 12) {
    return unwrap(await apiClient.get("/Dashboard/monthly-flow", { params: { months } })) || [];
  }

  /** [{ date: "2026-10-27", count, amount, profit }], oldest first. 1–365 days. */
  async getSwipesDaily(days = 30) {
    return unwrap(await apiClient.get("/Dashboard/swipes-daily", { params: { days } })) || [];
  }

  /** [{ partyName, type: "CardParty" | "Supplier", pending }], largest first. 1–50. */
  async getTopParties(limit = 5) {
    return unwrap(await apiClient.get("/Dashboard/top-parties", { params: { limit } })) || [];
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
