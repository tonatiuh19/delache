import { useAppSelector } from "@/store/hooks";
import { isShowFormHelpersEnabled } from "@shared/formHelperRules";

/** Whether inline form helpers should render (ON by default). */
export function useFormHelpersEnabled(): boolean {
  const showFormHelpers = useAppSelector((s) => s.auth.user?.showFormHelpers);
  return isShowFormHelpersEnabled(showFormHelpers);
}
