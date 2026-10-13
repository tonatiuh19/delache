import { useTranslation } from "react-i18next";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { useAppSelector } from "@/store/hooks";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseAuditSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { selected, auditLogs } = useAppSelector((s) => s.cases);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-audit"
      sectionId="audit"
      title={t("cases.auditLogs")}
      bodyClassName="p-0 sm:p-0 xl:p-0"
    >
      <ul className="max-h-[min(32rem,70vh)] divide-y divide-border overflow-y-auto">
        {auditLogs.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6 xl:px-8">
            {t("cases.noAuditLogs")}
          </li>
        ) : (
          auditLogs.slice(0, 40).map((log) => (
            <li key={log.id} className="px-5 py-3 text-sm sm:px-6 xl:px-8">
              <div className="font-semibold text-foreground">
                {log.action}
                {log.entityType ? ` · ${log.entityType}` : ""}
              </div>
              <div className="text-muted-foreground">
                {new Date(log.createdAt).toLocaleString()}
                {log.comment ? ` · ${log.comment}` : ""}
              </div>
            </li>
          ))
        )}
      </ul>
    </CaseDetailSectionPanel>
  );
}
