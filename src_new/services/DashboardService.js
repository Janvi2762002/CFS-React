import apiClient, { unwrap } from "./apiClient";

class DashboardService {
  async getSummary() {
    return unwrap(await apiClient.get("/Dashboard/summary"));
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
