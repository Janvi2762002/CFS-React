import apiClient, { unwrap } from "./apiClient";
import { toApiRole, toAppRole } from "./AuthService";
import { normaliseList, pageParams, toArray } from "./paginate";

/**
 * Users, CardInfo, and PaymentInfo endpoints.
 *
 * Every method returns the business data straight out of `resultObject` and
 * throws an ApiError on failure — there is deliberately no local fallback,
 * so an expired session or a server fault surfaces instead of being masked
 * by stale data.
 */

/** Strip `password` — the API still returns it and it must never be shown. */
function toAppUser(user) {
  if (!user) return user;
  const { password, role, ...rest } = user;
  return { ...rest, role: toAppRole(role), apiRole: role };
}

/** Only send a password when one was actually entered. */
function toApiUser(user) {
  const payload = {
    username: user.username?.trim() ?? "",
    phoneNumber: user.phoneNumber ?? "",
    fullName: user.fullName?.trim() ?? "",
    nickName: user.nickName ?? "",
    additionalInfo: user.additionalInfo ?? "",
    role: toApiRole(user.role),
  };
  if (user.password) payload.password = user.password;
  if (user.id != null) payload.id = user.id;
  return payload;
}

/** Shape a card to the documented CardInfo contract. */
function toApiCard(card) {
  return {
    ...(card.id != null ? { id: card.id } : {}),
    cardName: card.cardName?.trim() ?? "",
    cardNumber: card.cardNumber != null ? String(card.cardNumber).trim() : "",
    partyName: card.partyName?.trim() || null,
    deduction: card.deduction === "" || card.deduction == null ? null : Number(card.deduction),
    date: card.date ? new Date(card.date).toISOString() : null,
    pos: card.pos || null,
    remarks: card.remarks || null,
    limitUsed: Boolean(card.limitUsed),
    additionalInfo: card.additionalInfo || null,
    bankName: card.bankName || null,
    // Fields added to the CardInfo model server-side.
    imei: card.imei?.trim() || null,
    model: card.model?.trim() || null,
    merchant: card.merchant?.trim() || null,
    swipePerson: card.swipePerson?.trim() || null,
    profit: card.profit === "" || card.profit == null ? null : Number(card.profit),
  };
}

class AdminService {
  /* ── Users (Master / Admin only) ───────────────────────────────────── */

  async getUsers() {
    // /Users returns { items, pagination } — never a bare array.
    const raw = unwrap(await apiClient.get("/Users"));
    return toArray(raw).map(toAppUser);
  }

  async getUserById(userId) {
    return toAppUser(unwrap(await apiClient.get(`/Users/${userId}`)));
  }

  async saveUser(user) {
    return toAppUser(unwrap(await apiClient.post("/Users", toApiUser(user))));
  }

  async updateUser(userId, user) {
    const payload = { ...toApiUser(user), id: Number(userId) };
    return toAppUser(unwrap(await apiClient.put(`/Users/${userId}`, payload)));
  }

  async deleteUser(userId) {
    return unwrap(await apiClient.delete(`/Users/${userId}`)) === true;
  }

  /* ── CardInfo ────────────────────────────────────────────────────────── */

  /**
   * Fetch all card swipes as a plain array.
   * Used by Dashboard.jsx (existing code, backward-compatible).
   */
  async getCardInfo() {
    return toArray(unwrap(await apiClient.get("/CardInfo")));
  }

  /**
   * Fetch card swipes with server-side pagination.
   * Returns { data: [], total: number, next, previous }.
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   */
  async getCardInfoPaginated({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(
      await apiClient.get("/CardInfo", { params: pageParams({ page, pageSize }) })
    );
    return normaliseList(raw, page, pageSize);
  }

  async getCardById(cardId) {
    return unwrap(await apiClient.get(`/CardInfo/${cardId}`));
  }

  async saveCard(card) {
    return unwrap(await apiClient.post("/CardInfo", toApiCard(card)));
  }

  async updateCard(cardId, card) {
    const payload = { ...toApiCard(card), id: Number(cardId) };
    return unwrap(await apiClient.put(`/CardInfo/${cardId}`, payload));
  }

  async deleteCard(cardId) {
    return unwrap(await apiClient.delete(`/CardInfo/${cardId}`)) === true;
  }

  /* ── PaymentInfo (party-wise payment summary from backend) ──────────── */

  /**
   * Fetch the pre-computed party payment summary from the backend.
   * Returns { data: [], total: number, next, previous }.
   * @param {{ page?: number, pageSize?: number }} params  — 1-indexed page
   */
  async getPaymentInfo({ page = 1, pageSize = 25 } = {}) {
    const raw = unwrap(
      await apiClient.get("/PaymentInfo", { params: pageParams({ page, pageSize }) })
    );
    return normaliseList(raw, page, pageSize);
  }
}

const adminService = new AdminService();
export default adminService;
