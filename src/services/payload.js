/**
 * Coercions for request bodies built from form state.
 *
 * Form inputs hold strings, and an untouched optional field is `""`. The API
 * binds JSON with System.Text.Json, which rejects `""` for `DateTime?` and
 * `double?` with a 400, so empty values must go out as `null` and numbers as
 * numbers.
 */

/** "" / null → null; anything else → a finite number or null. */
export function toApiNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Trimmed string, or null when blank. */
export function toApiText(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

const pad = (n) => String(n).padStart(2, "0");

/**
 * Local wall-clock time as `YYYY-MM-DDTHH:mm:ss`, with no zone suffix.
 * `.slice(0, 16)` of this is the value a datetime-local input expects;
 * toISOString() would show the UTC time instead, 5½ hours off in IST.
 */
export function toLocalDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Date for the API, or null when blank.
 *
 * The documented date shape carries no zone (`2026-09-24T00:00:00`), and the
 * app reads dates back as local time. Sending local wall-clock time keeps
 * that round trip exact; a UTC instant stored without its zone would come
 * back 5½ hours early in IST, and drift again on every edit.
 * A bare `YYYY-MM-DD` is local midnight (new Date() would read it as UTC).
 */
export function toApiDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
  const d = new Date(value);
  return isNaN(d) ? null : toLocalDateTime(d);
}
