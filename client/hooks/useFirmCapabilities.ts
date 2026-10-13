import { useAppSelector } from "@/store/hooks";
import {
  canManageFirmMembers,
  canMutateFirmCaseWork,
} from "@shared/lawFirmMemberRules";

/** Despacho capability gates from auth `memberRole`. */
export function useFirmCapabilities() {
  const user = useAppSelector((s) => s.auth.user);
  const isLawFirm = user?.actor === "law_firm";
  const memberRole = user?.memberRole ?? null;
  return {
    isLawFirm,
    memberRole,
    canMutate: !isLawFirm || canMutateFirmCaseWork(memberRole),
    canManageMembers: isLawFirm && canManageFirmMembers(memberRole),
    isViewer: isLawFirm && memberRole === "viewer",
  };
}
