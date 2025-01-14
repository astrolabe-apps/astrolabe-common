import { QueryControl, useNavigationService } from "../service/navigation";

/**
 * A hook that returns a query control object that can be used to manage the query parameters of the current URL.
 * @returns {QueryControl} The query control object.
 */
export function useQueryControl(): QueryControl {
  const router = useNavigationService();
  return router.queryControl;
}
