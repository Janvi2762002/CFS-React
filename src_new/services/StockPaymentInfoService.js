import apiClient, { unwrap } from "./apiClient";

class StockPaymentInfoService {
  async getPayments() {
    const response = await apiClient.get("/StockPaymentInfo");
    return unwrap(response);
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
