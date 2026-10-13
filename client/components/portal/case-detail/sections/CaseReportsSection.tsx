import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import {
  CaseDetailFormCard,
  CaseDetailSplitBody,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import { canMutateCaseSection } from "@shared/portalCapabilities";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import {
  createTechnicalReport,
  fetchCaseDetail,
  updateTechnicalReportStatus,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseReportsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, technicalReports, documents } = useAppSelector(
    (s) => s.cases,
  );
  const role = useAppSelector((s) => s.auth.user?.role);
  const canUpload = canMutateCaseSection(role, "documents");
  const hasReportPdf = documents.some(
    (d) =>
      d.category === "technical_report" && isActiveDocumentStatus(d.status),
  );

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const reportForm = useFormik({
    initialValues: {
      conclusions: "",
    },
    onSubmit: async (values, helpers) => {
      if (!hasReportPdf) {
        toast({
          title: t("cases.reportSaveFailed"),
          description: t("cases.reportPdfRequired"),
          variant: "destructive",
        });
        return;
      }
      const result = await dispatch(
        createTechnicalReport({
          publicUuid,
          conclusions: values.conclusions.trim() || undefined,
          submit: true,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.reportSaveSuccess"),
          failureTitle: t("cases.reportSaveFailed"),
          fallbackError: "report_failed",
        })
      ) {
        refreshDetail();
        helpers.resetForm();
      }
    },
  });

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-reports"
      sectionId="reports"
      title={t("cases.technicalReport")}
      helper={t("help.caseDetail.report")}
    >
      <CategoryDocumentAttach
        publicUuid={publicUuid}
        category="technical_report"
        documents={documents}
        canUpload={canUpload}
        title={t("cases.reportAttachTitle")}
        hint={t("cases.reportAttachHint")}
        className="mb-5"
        onUploaded={refreshDetail}
      />
      <CaseDetailSplitBody
        showAside={technicalReports.length > 0}
        primary={
          <CaseDetailFormCard title={t("cases.submitReport")}>
            <form
              onSubmit={reportForm.handleSubmit}
              className="grid w-full gap-3"
            >
              <textarea
                name="conclusions"
                rows={4}
                value={reportForm.values.conclusions}
                onChange={reportForm.handleChange}
                placeholder={t("cases.conclusions")}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
              />
              <PendingSubmitButton
                pending={reportForm.isSubmitting}
                className="h-11"
              >
                {t("cases.submitReport")}
              </PendingSubmitButton>
            </form>
          </CaseDetailFormCard>
        }
        aside={
          <ul className="space-y-3">
            {technicalReports.map((r) => (
              <li
                key={r.publicUuid}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                <div className="font-semibold">
                  v{r.versionNumber} ·{" "}
                  {t(`cases.reportStatus.${r.status}`, {
                    defaultValue: r.status,
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.allowedNextStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                      onClick={() =>
                        void dispatch(
                          updateTechnicalReportStatus({
                            publicUuid,
                            reportUuid: r.publicUuid,
                            status: st,
                          }),
                        ).then(() => refreshDetail())
                      }
                    >
                      {t(`cases.reportStatus.${st}`, { defaultValue: st })}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        }
      />
    </CaseDetailSectionPanel>
  );
}
