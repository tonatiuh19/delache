import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import {
  CaseDetailSplitBody,
  caseDetailFieldClass,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import { processGateLabel } from "@/components/portal/ProcessTimeline";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { isForwardTransitionBlockedByGates } from "@shared/casePipelineRules";
import {
  resolveFocusedSection,
  shouldShowSection,
} from "@shared/caseStepTreeRules";
import { canSetExternalCourtDeadline } from "@shared/documentApprovalRules";
import {
  canChangeCaseStatus,
  canViewCaseSection,
} from "@shared/portalCapabilities";
import type { CaseStatus } from "@shared/api";
import {
  fetchCaseDetail,
  updateCaseFlags,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CaseWorkflowSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { stepSlug } = useParams<{ stepSlug?: string }>();
  const [searchParams] = useSearchParams();
  const focusedSection = resolveFocusedSection(
    stepSlug,
    searchParams.get("section"),
  );
  const dispatch = useAppDispatch();
  const {
    selected,
    history,
    allowedNextStatuses,
    processGate,
    statusGateMissing,
    updatingStatus,
    error,
  } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [reason, setReason] = useState("");
  const [externalDeadlineLocal, setExternalDeadlineLocal] = useState(() =>
    toDatetimeLocalValue(undefined),
  );
  const [deadlineDirty, setDeadlineDirty] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);

  const showWorkflow =
    shouldShowSection("workflow", stepSlug, false, focusedSection) &&
    canViewCaseSection(role, "workflow");
  const showTimeline =
    shouldShowSection("timeline", stepSlug, false, focusedSection) &&
    canViewCaseSection(role, "timeline");

  const canEditExternalDeadline = canSetExternalCourtDeadline(role);
  const syncedDeadlineLocal = toDatetimeLocalValue(
    selected?.externalCourtDeadlineAt,
  );
  const deadlineInputValue = deadlineDirty
    ? externalDeadlineLocal
    : syncedDeadlineLocal;

  const onStatus = async (status: CaseStatus) => {
    const result = await dispatch(
      updateCaseStatus({
        publicUuid,
        status,
        reason: reason.trim() || undefined,
      }),
    );
    if (
      notifyThunkSave(result, {
        successTitle: t("cases.statusSaveSuccess"),
        failureTitle: t("cases.statusSaveFailed"),
        fallbackError: "status_failed",
      })
    ) {
      await dispatch(fetchCaseDetail(publicUuid));
      setReason("");
    }
  };

  if (!selected || selected.publicUuid !== publicUuid) return null;
  if (!showWorkflow && !showTimeline) return null;

  const timelineList = (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("cases.timeline")}
      </h3>
      <ul className="mt-3 max-h-[min(32rem,70vh)] space-y-3 overflow-y-auto pr-1">
        {history.map((h) => (
          <li
            key={h.id}
            className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3"
          >
            <div className="text-sm font-semibold text-foreground">
              {h.fromStatus
                ? `${t(`cases.status.${h.fromStatus}`, { defaultValue: h.fromStatus })} → `
                : ""}
              {t(`cases.status.${h.toStatus}`, {
                defaultValue: h.toStatus,
              })}
            </div>
            {h.reason ? (
              <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(h.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <CaseDetailSectionPanel
      id="case-workflow"
      sectionId="workflow"
      title={t("cases.workflow")}
      icon={<ListChecks size={18} />}
    >
        <CaseDetailSplitBody
          showAside={showWorkflow && showTimeline}
          primary={
            showWorkflow ? (
              <div className="space-y-4">
                {canChangeCaseStatus(role) ? (
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.involvesFatality)}
                      onChange={(e) => {
                        void dispatch(
                          updateCaseFlags({
                            publicUuid,
                            involvesFatality: e.target.checked,
                          }),
                        ).then(() => dispatch(fetchCaseDetail(publicUuid)));
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    {t("cases.involvesFatality")}
                  </label>
                ) : null}
                {canEditExternalDeadline ? (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <label className="block text-sm font-semibold text-foreground">
                      {t("cases.externalCourtDeadline")}
                      <input
                        type="datetime-local"
                        value={deadlineInputValue}
                        onChange={(e) => {
                          setDeadlineDirty(true);
                          setExternalDeadlineLocal(e.target.value);
                        }}
                        className={`${caseDetailFieldClass} mt-1.5`}
                      />
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("cases.externalCourtDeadlineHint")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PendingSubmitButton
                        type="button"
                        pending={savingDeadline}
                        className="h-10 px-4"
                        onClick={() => {
                          void (async () => {
                            setSavingDeadline(true);
                            const result = await dispatch(
                              updateCaseFlags({
                                publicUuid,
                                externalCourtDeadlineAt: deadlineInputValue
                                  ? new Date(deadlineInputValue).toISOString()
                                  : null,
                              }),
                            );
                            setSavingDeadline(false);
                            if (
                              notifyThunkSave(result, {
                                successTitle: t(
                                  "cases.externalCourtDeadlineSaveSuccess",
                                ),
                                failureTitle: t(
                                  "cases.externalCourtDeadlineSaveFailed",
                                ),
                                fallbackError: "flags_failed",
                              })
                            ) {
                              setDeadlineDirty(false);
                              await dispatch(fetchCaseDetail(publicUuid));
                            }
                          })();
                        }}
                      >
                        {t("cases.externalCourtDeadlineSave")}
                      </PendingSubmitButton>
                      {selected.externalCourtDeadlineAt ||
                      deadlineInputValue ? (
                        <button
                          type="button"
                          disabled={savingDeadline}
                          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                          onClick={() => {
                            void (async () => {
                              setSavingDeadline(true);
                              const result = await dispatch(
                                updateCaseFlags({
                                  publicUuid,
                                  externalCourtDeadlineAt: null,
                                }),
                              );
                              setSavingDeadline(false);
                              if (
                                notifyThunkSave(result, {
                                  successTitle: t(
                                    "cases.externalCourtDeadlineSaveSuccess",
                                  ),
                                  failureTitle: t(
                                    "cases.externalCourtDeadlineSaveFailed",
                                  ),
                                  fallbackError: "flags_failed",
                                })
                              ) {
                                setDeadlineDirty(false);
                                setExternalDeadlineLocal("");
                                await dispatch(fetchCaseDetail(publicUuid));
                              }
                            })();
                          }}
                        >
                          {t("cases.externalCourtDeadlineClear")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : selected.externalCourtDeadlineAt ? (
                  <p className="text-sm text-muted-foreground">
                    {t("cases.externalCourtDeadline")}:{" "}
                    <span className="font-semibold text-foreground">
                      {new Date(
                        selected.externalCourtDeadlineAt,
                      ).toLocaleString()}
                    </span>
                  </p>
                ) : null}
                {canChangeCaseStatus(role) || allowedNextStatuses.length > 0 ? (
                  <>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("cases.reasonPlaceholder")}
                      className={caseDetailFieldClass}
                    />
                    {processGate?.ok === false ||
                    error === "Process gates not satisfied" ? (
                      <div
                        className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                        role="alert"
                      >
                        <p className="font-semibold">
                          {t("process.gatesBlocked")}
                        </p>
                        {(processGate?.missing?.length
                          ? processGate.missing
                          : statusGateMissing
                        ).length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            {(processGate?.missing?.length
                              ? processGate.missing
                              : statusGateMissing
                            ).map((code) => (
                              <li key={code}>{processGateLabel(t, code)}</li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-2 text-muted-foreground">
                          {t("cases.workflowGatesHint")}
                        </p>
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {allowedNextStatuses.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("cases.noTransitions")}
                        </span>
                      ) : (
                        allowedNextStatuses.map((status) => {
                          const gateBlocked =
                            Boolean(selected) &&
                            isForwardTransitionBlockedByGates({
                              fromStatus: selected.status,
                              toStatus: status,
                              gatesOk: processGate?.ok,
                            });
                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={updatingStatus || gateBlocked}
                              title={
                                gateBlocked
                                  ? t("cases.pipeline.lock.gates")
                                  : undefined
                              }
                              onClick={() => {
                                if (gateBlocked) return;
                                void onStatus(status);
                              }}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updatingStatus ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              ) : null}
                              {t(`cases.status.${status}`, {
                                defaultValue: status,
                              })}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("cases.statusReadOnly")}
                  </p>
                )}
              </div>
            ) : showTimeline ? (
              timelineList
            ) : null
          }
          aside={showTimeline ? timelineList : null}
        />
    </CaseDetailSectionPanel>
  );
}
