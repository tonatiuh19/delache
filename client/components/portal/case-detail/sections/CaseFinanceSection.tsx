import { useTranslation } from "react-i18next";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import CaseFinancePanel from "@/components/portal/case-detail/CaseFinancePanel";
import { useAppSelector } from "@/store/hooks";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseFinanceSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { selected, invoices } = useAppSelector((s) => s.cases);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-finance"
      sectionId="finance"
      title={t("cases.subsection.finance")}
      helper={t("cases.financePanelHelper")}
    >
      <CaseFinancePanel
        publicUuid={publicUuid}
        caseId={selected.id}
        invoices={invoices}
        listado={selected.listado}
      />
    </CaseDetailSectionPanel>
  );
}
