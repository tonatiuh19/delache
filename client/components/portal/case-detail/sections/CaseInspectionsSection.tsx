import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import {
  CaseDetailFormCard,
  CaseDetailRecordGrid,
  caseDetailFieldClass,
  caseDetailFormGridClass,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import DateTimePicker from "@/components/ui/date-time-picker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { softParallelAllowed } from "@shared/softParallelRules";
import type { MeasurementType } from "@shared/api";
import {
  createInspection,
  createMeasurement,
  fetchCaseDetail,
  updateInspectionStatus,
} from "@/store/slices/casesSlice";
import {
  MEASUREMENT_TYPES,
  type CaseDetailSectionProps,
} from "./caseDetailSectionShared";

export default function CaseInspectionsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, inspections, measurements } = useAppSelector((s) => s.cases);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const inspectionForm = useFormik({
    initialValues: { scheduledAt: "", notes: "" },
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createInspection({
          publicUuid,
          scheduledAt: values.scheduledAt || undefined,
          notes: values.notes.trim() || undefined,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.inspectionSaveSuccess"),
          failureTitle: t("cases.inspectionSaveFailed"),
          fallbackError: "inspection_failed",
        })
      ) {
        refreshDetail();
        helpers.resetForm();
      }
    },
  });

  const measurementForm = useFormik({
    initialValues: {
      measurementType: "horizontal_distance" as MeasurementType,
      valueNumeric: "",
      unit: "m" as const,
      poleId: "",
    },
    validationSchema: Yup.object({
      valueNumeric: Yup.number().typeError("n").required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createMeasurement({
          publicUuid,
          measurementType: values.measurementType,
          valueNumeric: Number(values.valueNumeric),
          unit: values.unit,
          poleId: values.poleId.trim() || undefined,
          inspectionId: inspections[0]?.id ?? null,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.measurementSaveSuccess"),
          failureTitle: t("cases.measurementSaveFailed"),
          fallbackError: "measurement_failed",
        })
      ) {
        refreshDetail();
        helpers.resetForm({
          values: {
            measurementType: "horizontal_distance",
            valueNumeric: "",
            unit: "m",
            poleId: "",
          },
        });
      }
    },
  });

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const inspectionCompleteAllowed = softParallelAllowed(
    selected.status,
    "mark_inspection_complete",
    { holdResumeStatus: selected.listado?.holdResumeStatus },
  );

  return (
    <CaseDetailSectionPanel
      id="case-inspections"
      sectionId="inspections"
      title={t("cases.inspections")}
      icon={<ClipboardCheck size={18} />}
      helper={t("help.caseDetail.inspections")}
    >
      {!inspectionCompleteAllowed ? (
        <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("cases.softParallel.inspectionLocked")}
        </p>
      ) : null}
      <div className="space-y-6">
        <CaseDetailFormCard title={t("cases.scheduleInspection")}>
          <form
            onSubmit={inspectionForm.handleSubmit}
            className={caseDetailFormGridClass}
          >
            <DateTimePicker
              name="scheduledAt"
              value={inspectionForm.values.scheduledAt}
              onChange={(next) =>
                void inspectionForm.setFieldValue("scheduledAt", next)
              }
            />
            <input
              name="notes"
              value={inspectionForm.values.notes}
              onChange={inspectionForm.handleChange}
              placeholder={t("cases.inspectionNotes")}
              className={cn(
                caseDetailFieldClass,
                "sm:col-span-2 lg:col-span-2 xl:col-span-2",
              )}
            />
            <PendingSubmitButton
              pending={inspectionForm.isSubmitting}
              className="h-11 sm:col-span-2 lg:col-span-1 xl:col-span-1"
            >
              {t("cases.scheduleInspection")}
            </PendingSubmitButton>
          </form>
        </CaseDetailFormCard>

        <CaseDetailFormCard title={t("cases.addMeasurement")}>
          <form
            onSubmit={measurementForm.handleSubmit}
            className={caseDetailFormGridClass}
          >
            <select
              name="measurementType"
              value={measurementForm.values.measurementType}
              onChange={measurementForm.handleChange}
              className={cn(
                caseDetailFieldClass,
                "sm:col-span-2 lg:col-span-2 xl:col-span-2",
              )}
            >
              {MEASUREMENT_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {t(`cases.measurement.${mt}`, { defaultValue: mt })}
                </option>
              ))}
            </select>
            <input
              name="valueNumeric"
              value={measurementForm.values.valueNumeric}
              onChange={measurementForm.handleChange}
              placeholder={t("cases.value")}
              className={caseDetailFieldClass}
            />
            <input
              name="poleId"
              value={measurementForm.values.poleId}
              onChange={measurementForm.handleChange}
              placeholder={t("cases.poleId")}
              className={caseDetailFieldClass}
            />
            <PendingSubmitButton
              pending={measurementForm.isSubmitting}
              className="h-11 border border-border bg-background text-foreground sm:col-span-2 lg:col-span-1 xl:col-span-1"
            >
              {t("cases.addMeasurement")}
            </PendingSubmitButton>
          </form>
        </CaseDetailFormCard>
      </div>

      {inspections.length > 0 || measurements.length > 0 ? (
        <CaseDetailRecordGrid>
          {inspections.map((i) => (
            <li
              key={i.publicUuid}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {t(`cases.inspectionStatus.${i.status}`, {
                    defaultValue: i.status,
                  })}
                  {i.scheduledAt
                    ? ` · ${new Date(i.scheduledAt).toLocaleString()}`
                    : ""}
                </span>
                {i.status === "scheduled" || i.status === "in_progress" ? (
                  <button
                    type="button"
                    disabled={!inspectionCompleteAllowed}
                    title={
                      !inspectionCompleteAllowed
                        ? t("cases.softParallel.inspectionLocked")
                        : undefined
                    }
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      if (!inspectionCompleteAllowed) return;
                      void dispatch(
                        updateInspectionStatus({
                          publicUuid,
                          inspectionUuid: i.publicUuid,
                          status: "completed",
                        }),
                      ).then(() => refreshDetail());
                    }}
                  >
                    {t("cases.markInspectionCompleted")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {measurements.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
            >
              {t(`cases.measurement.${m.measurementType}`, {
                defaultValue: m.measurementType,
              })}
              : {m.valueNumeric}
              {m.unit}
              {m.poleId ? ` · ${m.poleId}` : ""}
            </li>
          ))}
        </CaseDetailRecordGrid>
      ) : null}
    </CaseDetailSectionPanel>
  );
}
