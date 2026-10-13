import { useAppSelector } from "@/store/hooks";
import { isShowFormHelpersEnabled } from "@shared/formHelperRules";

/** Whether legacy form tip helpers should render (default OFF). */
export function useFormHelpersEnabled(): boolean {
  const showFormHelpers = useAppSelector((s) => s.auth.user?.showFormHelpers);
  return isShowFormHelpersEnabled(showFormHelpers);
}
