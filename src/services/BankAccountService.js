import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, toArray } from "./paginate";
import { toApiText } from "./payload";

/**
 * Bank accounts and their balances.
 *
 * These endpoints are not in the API document; the contract follows the
 * deployed Swagger. An account is { id, accountName, bankName, accountNo,
 * isActive }, and its balances come from a separate summary endpoint.
 */

/** Shape an account to the BankAccount contract (bank and account name required). */
function toApiAccount(a) {
  return {
    ...(a.id != null ? { id: Number(a.id) } : {}),
    bankName: a.bankName?.trim() ?? "",
    accountName: a.accountName?.trim() ?? "",
    accountNo: toApiText(a.accountNo),
    isActive: Boolean(a.isActive),
  };
}

class BankAccountService {
  /** Every account, across pages should the endpoint ever become paged. */
  async getAccounts() {
    return fetchAllPages(
      async (params) => unwrap(await apiClient.get("/BankAccount", { params }))
    );
  }

  async getAccount(id) {
    return unwrap(await apiClient.get(`/BankAccount/${id}`));
  }

  /** Returns the created account, including its new id. */
  async createAccount(data) {
    return unwrap(await apiClient.post("/BankAccount", toApiAccount(data)));
  }

  async updateAccount(id, data) {
    const payload = { ...toApiAccount(data), id: Number(id) };
    return unwrap(await apiClient.put(`/BankAccount/${id}`, payload));
  }

  async deleteAccount(id) {
    return unwrap(await apiClient.delete(`/BankAccount/${id}`));
  }

  /**
   * Per-account balances: { accountId, accountName, bankName, openingBalance,
   * totalIn, totalOut, transferIn, transferOut, currentBalance }.
   */
  async getBalanceSummaries() {
    return toArray(unwrap(await apiClient.get("/BankAccount/summary/accounts")));
  }

  /** Combined current balance of all accounts. */
  async getTotalBalance() {
    return unwrap(await apiClient.get("/BankAccount/summary/total"));
  }
}

const bankAccountService = new BankAccountService();
export default bankAccountService;
