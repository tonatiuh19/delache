import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Lock } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import DespachoSeguimientoPanel from "@/components/portal/DespachoSeguimientoPanel";
import CaseIntakePanel from "@/components/portal/case-detail/CaseIntakePanel";
import DocumentCategorySelect from "@/components/portal/DocumentCategorySelect";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCaseDetail,
  reviewLawFirmReport,
  updateDocumentCategory,
  uploadCaseDocumentsSmart,
} from "@/store/slices/casesSlice";
import type { DocumentCategory } from "@shared/api";
import {
  canLawFirmMutateDocument,
  canLawFirmUploadCategory,
} from "@shared/documentApprovalRules";
import { isBlobTokenMissingError } from "@shared/documentDmsRules";
import { useFirmCapabilities } from "@/hooks/useFirmCapabilities";
import { toast } from "@/hooks/use-toast";
import { StagedFileList } from "@/components/portal/LocalFileDraft";
import { cn } from "@/lib/utils";

/** Law-firm case actions (docs + report review) with read-only Seguimiento. */
export default function DespachoCaseDetailPage() {
  const { publicUuid = "" } = useParams();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { canMutate, isViewer } = useFirmCapabilities();
  const {
    selected,
    notes,
    documents,
    technicalReports,
    documentCompleteness,
    detailLoading,
    error,
  } = useAppSelector((s) => s.cases);
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>("lawsuit");
  const [docsUploading, setDocsUploading] = useState(false);
  const [stagedDocs, setStagedDocs] = useState<File[]>([]);
  const [reviewingReport, setReviewingReport] = useState(false);

  const uploadCategoryLocked = useMemo(
    () =>
      !canLawFirmUploadCategory({
        existingStatuses: documents
          .filter((d) => d.category === uploadCategory)
          .map((d) => d.status),
      }),
    [documents, uploadCategory],
  );

  const observation = useMemo(() => {
    const rejected = documents.find(
      (d) => d.status === "rejected" && d.rejectionReason,
    );
    if (!rejected?.rejectionReason) return null;
    return {
      body: rejected.rejectionReason,
      at: rejected.createdAt,
    };
  }, [documents]);

  useEffect(() => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  }, [dispatch, publicUuid]);

  const refresh = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const onUpload = async (files: File[]) => {
    if (files.length === 0 || uploadCategoryLocked) return false;
    setDocsUploading(true);
    try {
      const result = await dispatch(
        uploadCaseDocumentsSmart({
          publicUuid,
          files,
          category: uploadCategory,
          actor: "law_firm",
        }),
      );
      if (uploadCaseDocumentsSmart.fulfilled.match(result)) {
        refresh();
        if (result.payload.failures.length > 0) {
          toast({
            title: t("documents.partialUpload", {
              ok: result.payload.documents.length,
              failed: result.payload.failures.length,
            }),
            description: result.payload.failures
              .slice(0, 3)
              .map((f) => f.name)
              .join(", "),
            variant: "destructive",
          });
          return false;
        }
        return true;
      }
      const message = String(result.payload || "upload_failed");
      const locked = /locked/i.test(message) || /correction/i.test(message);
      toast({
        title: locked
          ? t("cases.uploadCategoryLockedTitle")
          : t("documents.uploadFailed"),
        description: isBlobTokenMissingError(message)
          ? t("documents.blobNotConfigured")
          : locked
            ? t("cases.uploadCategoryLockedHint")
            : message,
        variant: "destructive",
      });
      return false;
    } finally {
      setDocsUploading(false);
    }
  };

  const onReview = (
    reportUuid: string,
    outcome: "approved" | "changes_requested" | "rejected",
  ) => {
    setReviewingReport(true);
    void dispatch(
      reviewLawFirmReport({
        publicUuid,
        reportUuid,
        outcome,
      }),
    )
      .then(() => refresh())
      .finally(() => setReviewingReport(false));
  };

  if (detailLoading && !selected) {
    return <ContentPageSkeleton variant="detail" withHeader={false} />;
  }
  if (!selected) {
    return (
      <p className="p-8 text-sm text-muted-foreground">{t("cases.notFound")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <MetaHelmet title={selected.caseNumber} noindex />
      <Link
        to={`/portal/cases?selected=${encodeURIComponent(publicUuid)}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} /> {t("despacho.panel.backToPanel")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-wide text-primary">
            {selected.caseNumber}
          </div>
          <h1 className="mt-1 font-[Manrope] text-2xl font-bold">
            {selected.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`cases.status.${selected.status}`, {
              defaultValue: selected.status,
            })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
          <Lock size={12} className="text-primary" />
          {isViewer
            ? t("despacho.panel.viewerBadge")
            : t("despacho.panel.readOnly")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {isViewer
          ? t("despacho.panel.viewerDetailHint")
          : t("despacho.panel.detailActionsHint")}
      </p>
      <DespachoSeguimientoPanel
        selected={selected}
        observation={observation}
      />
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error === "flags_failed"
            ? t("cases.flagsFailed")
            : error === "category_failed"
              ? t("cases.categoryFailed")
              : error}
        </p>
      ) : null}

      {documentCompleteness ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.documentCompleteness")}</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {(
              [
                ["intake", documentCompleteness.intake],
                ["additionalDocs", documentCompleteness.additionalDocs],
              ] as const
            ).map(([key, info]) => (
              <li key={key}>
                <p className="font-semibold">
                  {t(`cases.docPhase.${key}`)} ·{" "}
                  {info.complete
                    ? t("cases.docComplete")
                    : t("cases.docIncomplete")}
                </p>
                {info.missing.length > 0 ? (
                  <p className="mt-0.5 text-muted-foreground">
                    {t("cases.docMissing")}:{" "}
                    {info.missing
                      .map((cat) =>
                        t(`cases.docCategory.${cat}`, { defaultValue: cat }),
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground">
                    {t("cases.docNoneMissing")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selected.status === "intake" ? (
        <CaseIntakePanel
          title={selected.title}
          description={selected.description}
          deadline={selected.externalCourtDeadlineAt}
          documents={documents}
          canEdit={false}
          canReview={false}
          role={null}
          approvedAt={selected.expedienteApprovedAt}
          onPreview={(doc) => {
            if (doc.storageKey) {
              window.open(doc.storageKey, "_blank", "noopener,noreferrer");
            }
          }}
        />
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-bold">{t("cases.documents")}</h2>
          </div>
          {canMutate ? (
            <>
              <div className="mt-3 max-w-xs">
                <DocumentCategorySelect
                  value={uploadCategory}
                  onChange={setUploadCategory}
                  clientPortal
                />
              </div>
              {uploadCategoryLocked ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock size={14} className="mt-0.5 shrink-0 text-primary" />
                  <p>{t("cases.uploadCategoryLockedHint")}</p>
                </div>
              ) : null}
              <div className="mt-3 space-y-3">
                <StagedFileList
                  files={stagedDocs}
                  sending={docsUploading}
                  onRemove={(index) =>
                    setStagedDocs((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  onSend={() => {
                    void (async () => {
                      const sent = await onUpload(stagedDocs);
                      if (sent) setStagedDocs([]);
                    })();
                  }}
                />
                <DocumentDropzone
                  compact
                  uploading={docsUploading}
                  disabled={uploadCategoryLocked}
                  onFiles={(files) =>
                    setStagedDocs((current) => [...current, ...files])
                  }
                />
              </div>
            </>
          ) : null}
          <ul className="mt-3 space-y-2">
            {documents.map((d) => {
              const mutable = canLawFirmMutateDocument({ status: d.status });
              const needsCorrection = d.status === "rejected";
              return (
                <li
                  key={d.publicUuid}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs",
                    needsCorrection
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{d.title}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {t(`cases.docStatus.${d.status}`, {
                        defaultValue: d.status,
                      })}
                      {!mutable || !canMutate
                        ? ` · ${t("cases.documentLockedBadge")}`
                        : null}
                    </p>
                    {d.rejectionReason ? (
                      <p className="mt-1 text-destructive">
                        {t("cases.documentCorrectionNeeded")}:{" "}
                        {d.rejectionReason}
                      </p>
                    ) : needsCorrection ? (
                      <p className="mt-1 text-destructive">
                        {t("cases.documentCorrectionNeededHint")}
                      </p>
                    ) : null}
                    <div className="mt-1 max-w-[14rem]">
                      {mutable && canMutate ? (
                        <DocumentCategorySelect
                          value={d.category}
                          clientPortal
                          onChange={(category) => {
                            void dispatch(
                              updateDocumentCategory({
                                publicUuid,
                                documentUuid: d.publicUuid,
                                category,
                              }),
                            ).then((result) => {
                              if (
                                updateDocumentCategory.rejected.match(result)
                              ) {
                                const message = String(
                                  result.payload || "category_failed",
                                );
                                toast({
                                  title: t("cases.categoryFailed"),
                                  description: /locked/i.test(message)
                                    ? t("cases.documentLockedHint")
                                    : message,
                                  variant: "destructive",
                                });
                                return;
                              }
                              refresh();
                            });
                          }}
                        />
                      ) : (
                        <p className="text-muted-foreground">
                          {t(`cases.docCategory.${d.category}`, {
                            defaultValue: d.category,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  {d.storageKey ? (
                    <a
                      href={d.storageKey}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-primary"
                    >
                      {t("cases.open")}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">{t("despacho.sharedNotes")}</h2>
        <ul className="mt-3 space-y-2">
          {notes.length === 0 ? (
            <li className="text-xs text-muted-foreground">
              {t("despacho.noNotes")}
            </li>
          ) : (
            notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl bg-muted/40 px-3 py-2 text-xs"
              >
                {n.body}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">{t("despacho.reports")}</h2>
        <ul className="mt-3 space-y-2">
          {technicalReports.length === 0 ? (
            <li className="text-xs text-muted-foreground">
              {t("despacho.noReports")}
            </li>
          ) : (
            technicalReports.map((r) => (
              <li
                key={r.publicUuid}
                className="rounded-xl border border-border px-3 py-2 text-xs"
              >
                <div className="font-semibold">
                  v{r.versionNumber} ·{" "}
                  {t(`despacho.reportStatus.${r.status}`, {
                    defaultValue: r.status,
                  })}
                </div>
                {r.status === "external_review" && canMutate ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
                      onClick={() => onReview(r.publicUuid, "approved")}
                    >
                      {t("despacho.approveReport")}
                    </button>
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
                      onClick={() =>
                        onReview(r.publicUuid, "changes_requested")
                      }
                    >
                      {t("despacho.requestChanges")}
                    </button>
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-destructive hover:text-destructive disabled:opacity-60"
                      onClick={() => onReview(r.publicUuid, "rejected")}
                    >
                      {t("despacho.rejectReport")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
