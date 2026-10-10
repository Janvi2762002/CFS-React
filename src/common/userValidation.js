/**
 * The /Users model's own validation, repeated in the form so a bad value is
 * flagged as it is typed instead of coming back as a 400 on submit.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** [StringLength(128, MinimumLength = 8)] on Password. */
export const isValidPassword = (password) => {
  const n = String(password || "").length;
  return n >= PASSWORD_MIN && n <= PASSWORD_MAX;
};

/**
 * ASP.NET's [Phone] check on PhoneNumber: after dropping "+" signs and a
 * trailing extension ("x12", "ext 12", "ext. 12"), only digits, spaces and
 * - . ( ) may remain, and at least one digit. Blank is allowed (optional field).
 */
export const isValidPhone = (phone) => {
  const raw = String(phone || "").trim();
  if (!raw) return true;
  const number = raw
    .replace(/\+/g, "")
    .trimEnd()
    .replace(/\s*(?:ext\.|ext|x)\s*\d+$/i, "");
  return /\d/.test(number) && /^[\d\s\-.()]*$/.test(number);
};
