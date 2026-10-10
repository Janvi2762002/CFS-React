import apiClient, { unwrap } from "./apiClient";
import { fetchAllPages, normaliseList, pageParams } from "./paginate";
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
  /** Every account, across all server pages (pick lists, account cards). */
  async getAccounts() {
    return fetchAllPages(
      async (params) => unwrap(await apiClient.get("/BankAccount", { params }))
    );
  }

  /**
   * One page of accounts. Returns { data, total, ... }.
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   */
  async getAccountsPaginated({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(await apiClient.get("/BankAccount", { params: pageParams({ page, pageSize }) }));
    return normaliseList(raw, page, pageSize);
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
    // Paged like the account list; reading only page one would drop balances.
    return fetchAllPages(
      async (params) => unwrap(await apiClient.get("/BankAccount/summary/accounts", { params }))
    );
  }

  /** Combined current balance of all accounts. */
  async getTotalBalance() {
    return unwrap(await apiClient.get("/BankAccount/summary/total"));
  }
}

const bankAccountService = new BankAccountService();
export default bankAccountService;
