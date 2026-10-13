import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import type { CaseStatus, CaseSummary } from "@shared/api";
import {
  canDropCaseOnPipelineColumn,
  canDragCaseOnPipeline,
  casePipelineVisibleStatuses,
  pipelineDropLockReason,
} from "@shared/casePipelineRules";
import type { WorkflowTransitionOpts } from "@shared/caseWorkflow";
import ListadoFlagStrip from "@/components/portal/ListadoFlagStrip";
import CaseOwnershipBadges from "@/components/portal/CaseOwnershipBadges";
import CasesPipelineSkeleton from "@/components/portal/CasesPipelineSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCasesPipeline,
  fetchMoreCasesPipelineColumn,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type CasesPipelineBoardProps = {
  q: string;
  statusFilter: string;
  priority: string;
  viewerRole: string | null | undefined;
};

function priorityTone(priority: string) {
  if (priority === "urgent") return "bg-destructive/15 text-destructive";
  if (priority === "high") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

function pipelineWorkflowOpts(
  caseItem: CaseSummary,
): WorkflowTransitionOpts | undefined {
  if (caseItem.status !== "on_hold") return undefined;
  const resume = caseItem.listado?.holdResumeStatus;
  if (!resume) return undefined;
  return { lastWorkflowStatus: resume };
}

function PipelineCard({
  caseItem,
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  caseItem: CaseSummary;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", caseItem.publicUuid);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group select-none overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-150",
        draggable
          ? "cursor-grab active:cursor-grabbing active:opacity-60"
          : "cursor-pointer",
        "hover:border-primary/35 hover:shadow-md hover:shadow-primary/5",
      )}
    >
      <div
        className={cn(
          "h-[3px]",
          caseItem.priority === "urgent"
            ? "bg-destructive"
            : caseItem.priority === "high"
              ? "bg-primary"
              : "bg-muted",
        )}
      />
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary">
            {caseItem.caseNumber}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
              priorityTone(caseItem.priority),
            )}
          >
            {t(`cases.priority.${caseItem.priority}`, {
              defaultValue: caseItem.priority,
            })}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
          {caseItem.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          {[caseItem.lawFirmName, caseItem.propertyCity]
            .filter(Boolean)
            .join(" · ") || t("cases.noLocation")}
        </p>
        <CaseOwnershipBadges caseItem={caseItem} className="mt-2" max={3} />
        {caseItem.listado ? (
          <div className="mt-2">
            <ListadoFlagStrip
              listado={caseItem.listado}
              status={caseItem.status}
              compact
            />
          </div>
        ) : null}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-primary opacity-0 transition group-hover:opacity-100">
          {t("cases.pipeline.openCase")} →
        </p>
      </div>
    </div>
  );
}

export default function CasesPipelineBoard({
  q,
  statusFilter,
  priority,
  viewerRole,
}: CasesPipelineBoardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    pipelineColumns,
    pipelineLoading,
    pipelineRefreshing,
    pipelineLoadingMore,
    pipelinePageLimit,
    updatingStatus,
  } = useAppSelector((s) => s.cases);

  const [dragging, setDragging] = useState<CaseSummary | null>(null);
  const [dragOver, setDragOver] = useState<CaseStatus | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    caseItem: CaseSummary;
    toStatus: CaseStatus;
  } | null>(null);

  const canDrag = canDragCaseOnPipeline(viewerRole);
  const columns = useMemo(
    () => casePipelineVisibleStatuses(statusFilter),
    [statusFilter],
  );

  const filterParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: statusFilter || undefined,
      priority: priority || undefined,
      limit: pipelinePageLimit,
    }),
    [q, statusFilter, priority, pipelinePageLimit],
  );

  const refreshPipeline = useCallback(() => {
    void dispatch(
      fetchCasesPipeline({ ...filterParams, resetColumns: false }),
    );
  }, [dispatch, filterParams]);

  const onConfirmMove = async () => {
    if (!pendingMove) return;
    const { caseItem, toStatus } = pendingMove;
    setPendingMove(null);
    const result = await dispatch(
      updateCaseStatus({
        publicUuid: caseItem.publicUuid,
        status: toStatus,
        reason: t("cases.pipeline.moveReason"),
      }),
    );
    if (updateCaseStatus.fulfilled.match(result)) {
      toast({ title: t("cases.pipeline.moveSuccess") });
      refreshPipeline();
      return;
    }
    const payload = result.payload as
      | { message?: string; missing?: string[] }
      | string
      | undefined;
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "status_failed";
    toast({
      title: t("cases.pipeline.moveFailed"),
      description:
        message === "Process gates not satisfied"
          ? t("process.gatesBlocked")
          : message,
      variant: "destructive",
    });
    refreshPipeline();
  };

  const showSkeleton =
    pipelineLoading && Object.keys(pipelineColumns).length === 0;

  if (showSkeleton) {
    return <CasesPipelineSkeleton />;
  }

  return (
    <>
      <div className="relative">
        {pipelineRefreshing ? (
          <div
            className="pointer-events-none absolute right-2 top-0 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            {t("cases.pipeline.refreshing")}
          </div>
        ) : null}
      <div
        className="table-scroll -mx-1 max-w-full px-1 pb-4"
      >
        <div className="flex w-max min-w-full gap-3 pr-2">
          {columns.map((colStatus) => {
            const page = pipelineColumns[colStatus];
            const items = page?.items ?? [];
            const total = page?.total ?? 0;
            const hasMore = page?.hasMore ?? false;
            const dropLock =
              dragging && dragOver === colStatus
                ? pipelineDropLockReason({
                    role: viewerRole,
                    fromStatus: dragging.status,
                    toStatus: colStatus,
                    workflowOpts: pipelineWorkflowOpts(dragging),
                    listado: dragging.listado,
                  })
                : null;
            const canDrop =
              dragging &&
              canDropCaseOnPipelineColumn({
                role: viewerRole,
                fromStatus: dragging.status,
                toStatus: colStatus,
                workflowOpts: pipelineWorkflowOpts(dragging),
                listado: dragging.listado,
              });
            const isDragTarget = dragging && dragOver === colStatus;

            return (
              <div
                key={colStatus}
                className={cn(
                  "flex min-w-[min(260px,85vw)] w-[min(280px,85vw)] flex-1 shrink-0 flex-col rounded-2xl border bg-muted/30 transition-all lg:max-w-[22rem]",
                  isDragTarget && canDrop
                    ? "border-primary ring-2 ring-primary/25 scale-[1.01]"
                    : isDragTarget && dropLock
                      ? "border-destructive/50 ring-2 ring-destructive/20"
                      : "border-border",
                )}
                onDragOver={(e) => {
                  if (!dragging || !canDrag) return;
                  e.preventDefault();
                  setDragOver(colStatus);
                }}
                onDragLeave={() => {
                  if (dragOver === colStatus) setDragOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (!dragging || !canDrag) return;
                  if (
                    !canDropCaseOnPipelineColumn({
                      role: viewerRole,
                      fromStatus: dragging.status,
                      toStatus: colStatus,
                      workflowOpts: pipelineWorkflowOpts(dragging),
                      listado: dragging.listado,
                    })
                  ) {
                    return;
                  }
                  if (dragging.status === colStatus) {
                    setDragging(null);
                    return;
                  }
                  setPendingMove({
                    caseItem: dragging,
                    toStatus: colStatus,
                  });
                  setDragging(null);
                }}
              >
                <div className="border-b border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                      {t(`cases.status.${colStatus}`, {
                        defaultValue: colStatus,
                      })}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        total > 0
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {total}
                    </span>
                  </div>
                  {dragging && isDragTarget && dropLock ? (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                      <Lock className="h-3 w-3 shrink-0" />
                      {t(`cases.pipeline.lock.${dropLock}`)}
                    </p>
                  ) : null}
                </div>

                <div className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto p-2">
                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                      {dragging && canDrop
                        ? t("cases.pipeline.dropHere")
                        : t("cases.pipeline.emptyColumn")}
                    </p>
                  ) : (
                    items.map((c) => (
                      <PipelineCard
                        key={c.publicUuid}
                        caseItem={c}
                        draggable={canDrag}
                        onDragStart={() => setDragging(c)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragOver(null);
                        }}
                        onClick={() =>
                          navigate(`/portal/cases/${c.publicUuid}`)
                        }
                      />
                    ))
                  )}
                  {hasMore ? (
                    <button
                      type="button"
                      disabled={pipelineLoadingMore === colStatus}
                      onClick={() => {
                        void dispatch(
                          fetchMoreCasesPipelineColumn({
                            ...filterParams,
                            column: colStatus,
                            offset: items.length,
                          }),
                        );
                      }}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                    >
                      {pipelineLoadingMore === colStatus ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {t("cases.pipeline.loadMore")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      <AlertDialog
        open={Boolean(pendingMove)}
        onOpenChange={(open) => {
          if (!open) setPendingMove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cases.pipeline.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove
                ? t("cases.pipeline.confirmBody", {
                    caseNumber: pendingMove.caseItem.caseNumber,
                    from: t(`cases.status.${pendingMove.caseItem.status}`, {
                      defaultValue: pendingMove.caseItem.status,
                    }),
                    to: t(`cases.status.${pendingMove.toStatus}`, {
                      defaultValue: pendingMove.toStatus,
                    }),
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={updatingStatus}
              onClick={(e) => {
                e.preventDefault();
                void onConfirmMove();
              }}
            >
              {updatingStatus ? t("common.saving") : t("common.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
