import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { useAppSelector } from "@/store/hooks";
import {
  severityClass,
  type CaseDetailSectionProps,
} from "./caseDetailSectionShared";

export default function CaseDeadlinesSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { selected, deadlines } = useAppSelector((s) => s.cases);

  if (!selected || selected.publicUuid !== publicUuid) return null;
  if (deadlines.length === 0) return null;

  return (
    <CaseDetailSectionPanel
      id="case-deadlines"
      sectionId="deadlines"
      title={t("cases.deadlines")}
      icon={<CalendarClock size={18} />}
    >
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {deadlines.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
          >
            <div className="font-semibold">{d.title}</div>
            <div className={severityClass(d.severityLevel)}>
              {new Date(d.dueAt).toLocaleDateString()} ·{" "}
              {t(`cases.deadlineType.${d.deadlineType}`, {
                defaultValue: d.title,
              })}{" "}
              ·{" "}
              {t(`cases.severity.${d.severityLevel}`, {
                defaultValue: d.severityLevel,
              })}
            </div>
          </li>
        ))}
      </ul>
    </CaseDetailSectionPanel>
  );
}
