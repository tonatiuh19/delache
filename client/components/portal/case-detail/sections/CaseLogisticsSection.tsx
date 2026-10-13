import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import LocationMapPanel from "@/components/portal/LocationMapPanel";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import {
  CaseDetailFormCard,
  CaseDetailSplitBody,
  caseDetailFieldClass,
  caseDetailFormGridClass,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import DatePicker from "@/components/ui/date-picker";
import DateTimePicker from "@/components/ui/date-time-picker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { canMutateCaseSection } from "@shared/portalCapabilities";
import { softParallelAllowed } from "@shared/softParallelRules";
import type { ExpenseType } from "@shared/api";
import {
  createExpense,
  createTrip,
  fetchCaseDetail,
  updateCaseFlags,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseLogisticsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, trips, expenses } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const tripForm = useFormik({
    initialValues: {
      originCity: "",
      destinationCity: "",
      departureAt: "",
      notes: "",
    },
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createTrip({
          publicUuid,
          originCity: values.originCity.trim() || undefined,
          destinationCity: values.destinationCity.trim() || undefined,
          departureAt: values.departureAt || undefined,
          notes: values.notes.trim() || undefined,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.tripSaveSuccess"),
          failureTitle: t("cases.tripSaveFailed"),
          fallbackError: "trip_failed",
        })
      ) {
        refreshDetail();
        helpers.resetForm();
      }
    },
  });

  const expenseForm = useFormik({
    initialValues: {
      tripId: "",
      expenseType: "flight" as ExpenseType,
      amount: "",
      vendorName: "",
    },
    validationSchema: Yup.object({
      tripId: Yup.string().required(),
      amount: Yup.number().typeError("n").min(0).required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createExpense({
          publicUuid,
          tripId: Number(values.tripId),
          expenseType: values.expenseType,
          amount: Number(values.amount),
          vendorName: values.vendorName.trim() || undefined,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.expenseSaveSuccess"),
          failureTitle: t("cases.expenseSaveFailed"),
          fallbackError: "expense_failed",
        })
      ) {
        helpers.resetForm({
          values: {
            tripId: trips[0] ? String(trips[0].id) : "",
            expenseType: "flight",
            amount: "",
            vendorName: "",
          },
        });
      }
    },
  });

  const dictamenForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      dictamenDueAt: selected?.dictamenDueAt
        ? selected.dictamenDueAt.slice(0, 10)
        : "",
    },
    onSubmit: async (values) => {
      const result = await dispatch(
        updateCaseFlags({
          publicUuid,
          dictamenDueAt: values.dictamenDueAt.trim()
            ? new Date(`${values.dictamenDueAt.trim()}T12:00:00`).toISOString()
            : null,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.dictamenDueSaved"),
          failureTitle: t("cases.dictamenDueFailed"),
          fallbackError: "flags_failed",
        })
      ) {
        refreshDetail();
      }
    },
  });

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const tripDraftAllowed = softParallelAllowed(
    selected.status,
    "draft_logistics_trip",
    { holdResumeStatus: selected.listado?.holdResumeStatus },
  );

  return (
    <CaseDetailSectionPanel
      id="case-logistics"
      sectionId="logistics"
      title={t("cases.logistics")}
      icon={<Plane size={18} />}
      helper={t("help.caseDetail.logistics")}
    >
      <form
        onSubmit={dictamenForm.handleSubmit}
        className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 w-full flex-1 text-sm font-semibold text-foreground">
          {t("cases.dictamenDueLabel")}
          <DatePicker
            name="dictamenDueAt"
            value={dictamenForm.values.dictamenDueAt}
            onChange={(next) =>
              void dictamenForm.setFieldValue("dictamenDueAt", next)
            }
            className="mt-1.5"
          />
        </label>
        <PendingSubmitButton
          pending={dictamenForm.isSubmitting}
          className="h-11 px-5"
        >
          {t("cases.dictamenDueSave")}
        </PendingSubmitButton>
      </form>
      {!canMutateCaseSection(role, "logistics") ? (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
          {t("cases.softParallel.logisticsReadOnly")}
        </p>
      ) : null}
      {!tripDraftAllowed ? (
        <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("cases.softParallel.tripLocked")}
        </p>
      ) : (
        <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("cases.softParallel.tripDraftOk")}
        </p>
      )}
      <CaseDetailSplitBody
        showAside={trips.length > 0 || expenses.length > 0}
        primary={
          <div className="space-y-6">
            {canMutateCaseSection(role, "logistics") && tripDraftAllowed ? (
              <CaseDetailFormCard title={t("cases.addTrip")}>
                <form
                  onSubmit={tripForm.handleSubmit}
                  className={caseDetailFormGridClass}
                >
                  <input
                    name="originCity"
                    value={tripForm.values.originCity}
                    onChange={tripForm.handleChange}
                    placeholder={t("cases.origin")}
                    className={caseDetailFieldClass}
                  />
                  <input
                    name="destinationCity"
                    value={tripForm.values.destinationCity}
                    onChange={tripForm.handleChange}
                    placeholder={t("cases.destination")}
                    className={caseDetailFieldClass}
                  />
                  <DateTimePicker
                    name="departureAt"
                    value={tripForm.values.departureAt}
                    onChange={(next) =>
                      void tripForm.setFieldValue("departureAt", next)
                    }
                    className="sm:col-span-2 lg:col-span-2 xl:col-span-2"
                  />
                  <PendingSubmitButton
                    pending={tripForm.isSubmitting}
                    className="h-11 sm:col-span-2 lg:col-span-1 xl:col-span-1"
                  >
                    {t("cases.addTrip")}
                  </PendingSubmitButton>
                </form>
              </CaseDetailFormCard>
            ) : null}
            {canMutateCaseSection(role, "logistics") && trips.length > 0 ? (
              <CaseDetailFormCard title={t("cases.addExpense")}>
                <form
                  onSubmit={expenseForm.handleSubmit}
                  className={caseDetailFormGridClass}
                >
                  <select
                    name="tripId"
                    value={expenseForm.values.tripId}
                    onChange={expenseForm.handleChange}
                    className={cn(
                      caseDetailFieldClass,
                      "sm:col-span-2 lg:col-span-2 xl:col-span-2",
                    )}
                  >
                    {trips.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {[tr.originCity, tr.destinationCity]
                          .filter(Boolean)
                          .join(" → ") || `#${tr.id}`}
                      </option>
                    ))}
                  </select>
                  <select
                    name="expenseType"
                    value={expenseForm.values.expenseType}
                    onChange={expenseForm.handleChange}
                    className={caseDetailFieldClass}
                  >
                    {(
                      [
                        "flight",
                        "hotel",
                        "rental_car",
                        "fuel",
                        "meals",
                        "other",
                      ] as const
                    ).map((et) => (
                      <option key={et} value={et}>
                        {t(`cases.expenseType.${et}`, { defaultValue: et })}
                      </option>
                    ))}
                  </select>
                  <input
                    name="amount"
                    value={expenseForm.values.amount}
                    onChange={expenseForm.handleChange}
                    placeholder={t("finance.amountPlaceholder")}
                    className={caseDetailFieldClass}
                  />
                  <input
                    name="vendorName"
                    value={expenseForm.values.vendorName}
                    onChange={expenseForm.handleChange}
                    placeholder={t("cases.vendor")}
                    className={caseDetailFieldClass}
                  />
                  <PendingSubmitButton
                    pending={expenseForm.isSubmitting}
                    className="h-11 border border-border bg-background text-foreground sm:col-span-2 lg:col-span-1 xl:col-span-1"
                  >
                    {t("cases.addExpense")}
                  </PendingSubmitButton>
                </form>
              </CaseDetailFormCard>
            ) : null}
          </div>
        }
        aside={
          <div className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-2">
              {trips.map((tr) => (
                <li
                  key={tr.publicUuid}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
                >
                  <div className="font-semibold">
                    {[tr.originCity, tr.destinationCity]
                      .filter(Boolean)
                      .join(" → ") || tr.status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tr.status}
                    {tr.departureAt
                      ? ` · ${new Date(tr.departureAt).toLocaleString()}`
                      : ""}
                  </div>
                  {tr.destinationCity ? (
                    <div className="mt-2">
                      <LocationMapPanel
                        query={tr.destinationCity}
                        label={tr.destinationCity}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {expenses.map((e) => (
                <li key={e.id} className="rounded-xl bg-muted/40 px-4 py-2">
                  {t(`cases.expenseType.${e.expenseType}`, {
                    defaultValue: e.expenseType,
                  })}{" "}
                  · {e.amount.toLocaleString()} {e.currency}
                  {e.vendorName ? ` · ${e.vendorName}` : ""}
                </li>
              ))}
            </ul>
          </div>
        }
      />
    </CaseDetailSectionPanel>
  );
}
