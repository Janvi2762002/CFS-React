/**
 * Date cell text shared by every DataGrid: `03 Oct 2026`, or a dash when the
 * row has no usable date.
 *
 * Wire it as a column's `valueFormatter`, not `valueGetter`, so sorting and
 * filtering still run on the raw ISO value rather than on the display text.
 */
export function formatGridDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default formatGridDate;
