import { useEffect, useState } from "react";

/**
 * `value`, once it has stopped changing for `delay` ms. Search boxes use it
 * so the API is asked once typing pauses, not on every keystroke.
 */
export default function useDebouncedValue(value, delay = 350) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}
