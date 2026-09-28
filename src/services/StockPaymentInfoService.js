import apiClient, { unwrap } from "./apiClient";
import { normaliseList, pageParams } from "./paginate";

class StockPaymentInfoService {
  /** Fetch all stock payments as a plain array (backward-compatible). */
  async getPayments() {
    const response = await apiClient.get("/StockPaymentInfo");
    return unwrap(response) || [];
  }

  /**
   * Fetch stock payments with server-side pagination.
   * Returns { data: [], total: number, next, previous }.
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   */
  async getPaymentsPaginated({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(
      await apiClient.get("/StockPaymentInfo", { params: pageParams({ page, pageSize }) })
    );
    return normaliseList(raw, page, pageSize);
  }

  async getPayment(id) {
    const response = await apiClient.get(`/StockPaymentInfo/${id}`);
    return unwrap(response);
  }

  async getByStockItem(stockItemId) {
    const response = await apiClient.get(`/StockPaymentInfo/stock/${stockItemId}`);
    return unwrap(response);
  }

  async savePayment(data) {
    const response = await apiClient.post("/StockPaymentInfo", data);
    return unwrap(response);
  }

  async updatePayment(id, data) {
    const response = await apiClient.put(`/StockPaymentInfo/${id}`, data);
    return unwrap(response);
  }

  async deletePayment(id) {
    const response = await apiClient.delete(`/StockPaymentInfo/${id}`);
    return unwrap(response);
  }
}

export default new StockPaymentInfoService();
