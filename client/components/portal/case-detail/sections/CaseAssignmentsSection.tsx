import { useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import {
  CaseDetailFormCard,
  CaseDetailSplitBody,
  caseDetailFieldClass,
  caseDetailFormGrid3Class,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import HandoffPendingNotice from "@/components/portal/case-detail/HandoffPendingNotice";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import DatePicker from "@/components/ui/date-picker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  filterMembersForAssignmentRole,
  isMemberEligibleForAssignment,
  assignmentRoleSelectGroups,
  shouldForcePrimaryAssignment,
} from "@shared/assignmentMemberRules";
import { missingRecommendedAssignmentRoles } from "@shared/handoffRules";
import { canManageCaseAssignments } from "@shared/portalCapabilities";
import type { AssignmentRole } from "@shared/api";
import {
  assignCaseMember,
  confirmDocumentsHandoff,
  fetchCaseDetail,
  setExpertDeliveryDeadline,
  unassignCaseMember,
} from "@/store/slices/casesSlice";
import { type CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseAssignmentsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, assignments, deadlines } = useAppSelector((s) => s.cases);
  const { members } = useAppSelector((s) => s.portal);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const primaryExpert = assignments.find(
    (a) => a.assignmentRole === "expert" && a.isPrimary,
  );

  const assignForm = useFormik({
    initialValues: {
      userId: "",
      assignmentRole: "expert" as AssignmentRole,
      isPrimary: true,
      deliveryDueAt: "",
    },
    validationSchema: Yup.object({
      userId: Yup.string().required(),
      assignmentRole: Yup.string().required(),
      deliveryDueAt: Yup.string(),
    }),
    onSubmit: async (values, helpers) => {
      const hasPrimaryExpert = assignments.some(
        (a) => a.assignmentRole === "expert" && a.isPrimary,
      );
      const result = await dispatch(
        assignCaseMember({
          publicUuid,
          userId: Number(values.userId),
          assignmentRole: values.assignmentRole,
          isPrimary: shouldForcePrimaryAssignment(values.assignmentRole)
            ? true
            : values.isPrimary,
          deliveryDueAt:
            values.assignmentRole === "expert" &&
            !hasPrimaryExpert &&
            values.deliveryDueAt.trim()
              ? values.deliveryDueAt.trim()
              : undefined,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.assignSaveSuccess"),
          failureTitle: t("cases.assignSaveFailed"),
          fallbackError: "assign_failed",
        })
      ) {
        refreshDetail();
        helpers.resetForm({
          values: {
            userId: "",
            assignmentRole: "expert",
            isPrimary: true,
            deliveryDueAt: "",
          },
        });
      }
    },
  });

  const eligibleMembers = useMemo(
    () =>
      filterMembersForAssignmentRole(
        members,
        assignForm.values.assignmentRole,
      ),
    [members, assignForm.values.assignmentRole],
  );

  const expertDeliveryDeadline = deadlines.find(
    (d) => d.deadlineType === "expert_delivery" && !d.completedAt,
  );
  const expertDeliveryForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      deliveryDueAt: expertDeliveryDeadline
        ? expertDeliveryDeadline.dueAt.slice(0, 10)
        : "",
    },
    onSubmit: async (values) => {
      const result = await dispatch(
        setExpertDeliveryDeadline({
          publicUuid,
          deliveryDueAt: values.deliveryDueAt.trim() || null,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.expertDeliverySaveSuccess"),
          failureTitle: t("cases.expertDeliverySaveFailed"),
          fallbackError: "expert_delivery_failed",
        })
      ) {
        refreshDetail();
      }
    },
  });

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const recommendedRolesMissing =
    missingRecommendedAssignmentRoles(assignments);
  const forcePrimary = shouldForcePrimaryAssignment(
    assignForm.values.assignmentRole,
  );
  const roleGroups = assignmentRoleSelectGroups();

  return (
    <CaseDetailSectionPanel
      id="case-assignments"
      sectionId="assignments"
      title={t("cases.assignments")}
      icon={<Users size={18} />}
      helper={t("help.caseDetail.assignments")}
    >
      {canManageCaseAssignments(role) && !primaryExpert ? (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">
            {t("cases.requiredPrimaryExpertTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t("cases.requiredPrimaryExpertHint")}
          </p>
        </div>
      ) : null}
      {recommendedRolesMissing.length > 0 &&
      canManageCaseAssignments(role) &&
      primaryExpert ? (
        <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">
            {t("cases.recommendedAssignmentsTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t("cases.recommendedAssignmentsHint", {
              roles: recommendedRolesMissing
                .map((r) =>
                  t(`cases.assignmentRole.${r}`, { defaultValue: r }),
                )
                .join(", "),
            })}
          </p>
        </div>
      ) : null}
      <HandoffPendingNotice
        role={role}
        confirmedAt={selected.documentsHandoffConfirmedAt}
        primaryExpertAssigned={Boolean(primaryExpert)}
        className="mb-6"
        onConfirm={
          primaryExpert
            ? () => {
                void (async () => {
                  const result = await dispatch(
                    confirmDocumentsHandoff(publicUuid),
                  );
                  if (
                    notifyThunkSave(result, {
                      successTitle: t("cases.handoffConfirmSuccess"),
                      failureTitle: t("cases.handoffConfirmFailed"),
                      fallbackError: "handoff_confirm_failed",
                    })
                  ) {
                    refreshDetail();
                  }
                })();
              }
            : undefined
        }
      />
      <p className="mb-6 text-sm text-muted-foreground">
        {t("cases.assignmentHowItWorks")}
      </p>
      <CaseDetailSplitBody
        showAside={
          assignments.length > 0 ||
          (canManageCaseAssignments(role) && Boolean(primaryExpert))
        }
        primary={
          canManageCaseAssignments(role) ? (
            <CaseDetailFormCard title={t("cases.assign")}>
              <form
                onSubmit={assignForm.handleSubmit}
                className={caseDetailFormGrid3Class}
              >
                <label className="text-sm font-semibold text-muted-foreground">
                  {t("cases.assignmentRoleLabel")}
                  <select
                    name="assignmentRole"
                    value={assignForm.values.assignmentRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as AssignmentRole;
                      void assignForm.setFieldValue("assignmentRole", nextRole);
                      const keepUser = isMemberEligibleForAssignment({
                        members,
                        userId: assignForm.values.userId,
                        assignmentRole: nextRole,
                      });
                      if (!keepUser) {
                        void assignForm.setFieldValue("userId", "");
                      }
                      if (shouldForcePrimaryAssignment(nextRole)) {
                        void assignForm.setFieldValue("isPrimary", true);
                        if (primaryExpert) {
                          void assignForm.setFieldValue("deliveryDueAt", "");
                        }
                      } else {
                        void assignForm.setFieldValue("deliveryDueAt", "");
                      }
                    }}
                    className={cn(caseDetailFieldClass, "mt-1.5")}
                  >
                    {roleGroups.map((group) => (
                      <optgroup
                        key={group.tier}
                        label={t(`cases.assignmentRoleTier.${group.tier}`)}
                      >
                        {group.roles.map((r) => (
                          <option key={r} value={r}>
                            {t(`cases.assignmentRole.${r}`, {
                              defaultValue: r,
                            })}
                            {group.tier === "required"
                              ? ` · ${t("cases.assignmentRoleRequiredSuffix")}`
                              : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-muted-foreground sm:col-span-2">
                  {t("cases.selectMember")}
                  <select
                    name="userId"
                    value={assignForm.values.userId}
                    onChange={assignForm.handleChange}
                    className={cn(caseDetailFieldClass, "mt-1.5")}
                  >
                    <option value="">
                      {eligibleMembers.length === 0
                        ? t("cases.noMembersForRole")
                        : t("cases.selectMemberPlaceholder")}
                    </option>
                    {eligibleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} (
                        {t(`team.role.${m.role}`, { defaultValue: m.role })})
                      </option>
                    ))}
                  </select>
                </label>
                {forcePrimary && !primaryExpert ? (
                  <label className="text-sm font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3">
                    {t("cases.expertDeliveryDate")}
                    <DatePicker
                      name="deliveryDueAt"
                      value={assignForm.values.deliveryDueAt}
                      onChange={(next) =>
                        void assignForm.setFieldValue("deliveryDueAt", next)
                      }
                      className="mt-1.5"
                      disablePast
                    />
                  </label>
                ) : null}
                {forcePrimary && primaryExpert ? (
                  <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
                    {t("cases.expertDeliveryManagedAside")}
                  </p>
                ) : null}
                <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    checked={
                      forcePrimary ? true : assignForm.values.isPrimary
                    }
                    disabled={forcePrimary}
                    onChange={assignForm.handleChange}
                  />
                  {forcePrimary
                    ? t("cases.primaryExpertForced")
                    : t("cases.primaryAssignment")}
                </label>
                <PendingSubmitButton
                  pending={assignForm.isSubmitting}
                  disabled={
                    !assignForm.values.userId || eligibleMembers.length === 0
                  }
                  className="h-11 sm:col-span-2 lg:col-span-3"
                >
                  {forcePrimary
                    ? t("cases.assignPrimaryExpert")
                    : t("cases.assign")}
                </PendingSubmitButton>
              </form>
            </CaseDetailFormCard>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("cases.statusReadOnly")}
            </p>
          )
        }
        aside={
          <div className="space-y-4">
            {canManageCaseAssignments(role) && primaryExpert ? (
              <form
                onSubmit={expertDeliveryForm.handleSubmit}
                className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5"
              >
                <p className="text-sm font-bold text-foreground">
                  {t("cases.expertDeliveryActionTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("cases.expertDeliveryActionHint", {
                    name: primaryExpert.userName,
                  })}
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="min-w-0 w-full flex-1 text-sm font-semibold text-muted-foreground sm:min-w-[12rem]">
                    {t("cases.expertDeliveryDate")}
                    <DatePicker
                      name="deliveryDueAt"
                      value={expertDeliveryForm.values.deliveryDueAt}
                      onChange={(next) =>
                        void expertDeliveryForm.setFieldValue(
                          "deliveryDueAt",
                          next,
                        )
                      }
                      className="mt-1.5"
                      disablePast
                    />
                  </label>
                  <PendingSubmitButton
                    pending={expertDeliveryForm.isSubmitting}
                    disabled={!expertDeliveryForm.values.deliveryDueAt.trim()}
                    className="h-11 px-5"
                  >
                    {t("cases.expertDeliverySave")}
                  </PendingSubmitButton>
                  {expertDeliveryDeadline ? (
                    <button
                      type="button"
                      disabled={expertDeliveryForm.isSubmitting}
                      onClick={() => {
                        void (async () => {
                          const result = await dispatch(
                            setExpertDeliveryDeadline({
                              publicUuid,
                              deliveryDueAt: null,
                            }),
                          );
                          if (
                            notifyThunkSave(result, {
                              successTitle: t(
                                "cases.expertDeliveryClearSuccess",
                              ),
                              failureTitle: t(
                                "cases.expertDeliverySaveFailed",
                              ),
                              fallbackError: "expert_delivery_failed",
                            })
                          ) {
                            refreshDetail();
                          }
                        })();
                      }}
                      className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-60"
                    >
                      {t("cases.expertDeliveryClear")}
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {a.userName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`cases.assignmentRole.${a.assignmentRole}`, {
                        defaultValue: a.assignmentRole,
                      })}
                      {a.isPrimary ? ` · ${t("cases.primary")}` : ""}
                    </div>
                  </div>
                  {canManageCaseAssignments(role) ? (
                    <PendingSubmitButton
                      type="button"
                      pending={unassigningId === a.id}
                      pendingLabel={t("common.saving")}
                      className="h-9 shrink-0 bg-transparent px-3 text-xs font-bold uppercase text-destructive shadow-none hover:bg-destructive/10"
                      onClick={() => {
                        void (async () => {
                          setUnassigningId(a.id);
                          try {
                            const result = await dispatch(
                              unassignCaseMember({
                                publicUuid,
                                assignmentId: a.id,
                              }),
                            );
                            if (
                              notifyThunkSave(result, {
                                successTitle: t("cases.unassignSaveSuccess"),
                                failureTitle: t("cases.unassignSaveFailed"),
                                fallbackError: "unassign_failed",
                              })
                            ) {
                              refreshDetail();
                            }
                          } finally {
                            setUnassigningId(null);
                          }
                        })();
                      }}
                    >
                      {t("cases.unassign")}
                    </PendingSubmitButton>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        }
      />
    </CaseDetailSectionPanel>
  );
}
