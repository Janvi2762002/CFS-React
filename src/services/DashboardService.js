import apiClient, { unwrap } from "./apiClient";

/**
 * Dashboard summary statistics.
 *
 * GET /api/Dashboard/summary returns headline totals across bank accounts,
 * cash ledger, card info swipes, party profits, and stock items (IN).
 */
class DashboardService {
  async getSummary() {
    return unwrap(await apiClient.get("/Dashboard/summary"));
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
