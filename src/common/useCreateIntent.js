import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Opens a page's Add dialog when the navigation asked for it: a module's
 * "New …" button navigates with `state: { create: true }`. The state is
 * cleared straight away, so a refresh or Back doesn't open the dialog again.
 *
 * @param {() => void} openCreate  the page's own "open an empty form" handler
 */
export default function useCreateIntent(openCreate) {
  const location = useLocation();
  const navigate = useNavigate();
  const wantsCreate = Boolean(location.state?.create);

  useEffect(() => {
    if (!wantsCreate) return;
    navigate(location.pathname + location.search, { replace: true, state: null });
    openCreate();
    // Runs once per request; `openCreate` is usually a fresh function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCreate, location.key]);
}
