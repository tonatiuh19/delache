import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle, FileUp } from "lucide-react";
import type {
  CaseDocumentItem,
  DocumentCategory,
  DocumentCompletenessInfo,
} from "@shared/api";
import {
  blockingDocCategoriesFromGates,
  buildDocumentPhaseSummaries,
  documentCategoryAnchorId,
  groupDocumentsByCategory,
  parseDocumentCategoryFromHash,
  preferredUploadCategory,
} from "@shared/documentPanelRules";
import { DOCUMENT_CATEGORIES } from "@shared/documentCategoryRules";
import { cn } from "@/lib/utils";
import DocumentCategorySelect from "@/components/portal/DocumentCategorySelect";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import { toast } from "@/hooks/use-toast";

export default function CaseDocumentsPanel({
  documents,
  uploadCategory,
  onUploadCategoryChange,
  uploading,
  onUploadFiles,
  onPreview,
  onUpdateCategory,
  missingGateCodes,
  documentCompleteness,
  canUpload,
}: {
  documents: CaseDocumentItem[];
  uploadCategory: DocumentCategory;
  onUploadCategoryChange: (category: DocumentCategory) => void;
  uploading: boolean;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  onPreview: (doc: CaseDocumentItem) => void;
  onUpdateCategory: (opts: {
    documentUuid: string;
    category: DocumentCategory;
  }) => Promise<boolean>;
  missingGateCodes: readonly string[];
  documentCompleteness: {
    intake: DocumentCompletenessInfo;
    additionalDocs: DocumentCompletenessInfo;
    courtFiling: DocumentCompletenessInfo;
  } | null;
  canUpload: boolean;
}) {
  const { t } = useTranslation();
  const [focusCategory, setFocusCategory] = useState<string | null>(null);
  const [savingUuid, setSavingUuid] = useState<string | null>(null);
  const didAutoFocus = useRef(false);

  const blocking = blockingDocCategoriesFromGates(missingGateCodes);
  const phases = buildDocumentPhaseSummaries({
    intake: documentCompleteness?.intake,
    additionalDocs: documentCompleteness?.additionalDocs,
    courtFiling: documentCompleteness?.courtFiling,
  });
  const groups = groupDocumentsByCategory(documents);
  const presentSet = new Set<string>(
    documents.map((d) => d.category).filter(Boolean),
  );

  const applyFocus = (category: string) => {
    setFocusCategory(category);
    if ((DOCUMENT_CATEGORIES as readonly string[]).includes(category)) {
      onUploadCategoryChange(category as DocumentCategory);
    }
  };

  useEffect(() => {
    const fromHash = parseDocumentCategoryFromHash(window.location.hash);
    if (fromHash) {
      applyFocus(fromHash);
      didAutoFocus.current = true;
      return;
    }
    if (didAutoFocus.current || blocking.length === 0) return;
    const preferred = preferredUploadCategory({
      hashCategory: null,
      blockingCategories: blocking,
      fallback: uploadCategory,
    });
    applyFocus(preferred);
    didAutoFocus.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first gate-driven focus only
  }, [missingGateCodes.join("|")]);

  useEffect(() => {
    const onHash = () => {
      const fromHash = parseDocumentCategoryFromHash(window.location.hash);
      if (fromHash) applyFocus(fromHash);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectForUpload = (category: string) => {
    applyFocus(category);
    const el = document.getElementById("case-documents-upload");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="case-documents"
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">
          {t("cases.documents")}
        </h2>
        {blocking.length > 0 ? (
          <p className="text-[11px] font-semibold text-destructive">
            {t("cases.docsBlockingCount", { count: blocking.length })}
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-primary">
            {t("cases.docsPointClear")}
          </p>
        )}
      </div>
      <SectionHelper>{t("help.caseDetail.documentsPanel")}</SectionHelper>

      {blocking.length > 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("cases.docsBlockingTitle")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("cases.docsBlockingHint")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {blocking.map((category) => {
              const hasFile = presentSet.has(category);
              return (
                <li
                  key={category}
                  id={documentCategoryAnchorId(category)}
                  className={cn(
                    "flex scroll-mt-28 flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2",
                    focusCategory === category
                      ? "border-primary bg-primary/5"
                      : "border-border/80 bg-background",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {hasFile ? (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span className="text-xs font-semibold text-foreground">
                      {t(`cases.docCategory.${category}`, {
                        defaultValue: category,
                      })}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        hasFile
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {hasFile
                        ? t("cases.docsStatusOnFile")
                        : t("cases.docsStatusMissing")}
                    </span>
                  </div>
                  {canUpload && !hasFile ? (
                    <button
                      type="button"
                      onClick={() => selectForUpload(category)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[10px] font-bold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
                    >
                      <FileUp className="h-3 w-3" />
                      {t("cases.docsUploadAsThis")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {phases.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {phases.map((phase) => (
            <div
              key={phase.key}
              className="rounded-xl border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-foreground">
                  {t(`cases.docPhase.${phase.key}`)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    phase.complete ? "text-primary" : "text-destructive",
                  )}
                >
                  {phase.presentCount}/{phase.requiredCount}
                </span>
              </div>
              {phase.missing.length > 0 ? (
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {t("cases.docMissing")}:{" "}
                  {phase.missing
                    .map((c) =>
                      t(`cases.docCategory.${c}`, { defaultValue: c }),
                    )
                    .join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("cases.docNoneMissing")}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {canUpload ? (
        <div
          id="case-documents-upload"
          className="mt-4 scroll-mt-24 space-y-2 rounded-xl border border-dashed border-border bg-background px-3 py-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("cases.docsUploadTitle")}
          </p>
          <label className="block text-[11px] font-semibold text-foreground">
            {t("cases.docsUploadCategoryLabel")}
          </label>
          <DocumentCategorySelect
            id="case-documents-upload-category"
            value={uploadCategory}
            onChange={(category) => {
              onUploadCategoryChange(category);
              setFocusCategory(category);
            }}
          />
          <p className="text-[11px] text-foreground">
            {t("cases.docsUploadWillUse", {
              category: t(`cases.docCategory.${uploadCategory}`, {
                defaultValue: uploadCategory,
              }),
            })}
          </p>
          <FieldHelper>{t("help.caseDetail.documentCategory")}</FieldHelper>
          <DocumentDropzone
            uploading={uploading}
            onFiles={onUploadFiles}
            compact
          />
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("cases.docsOnFileTitle")}
        </p>
        {groups.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("cases.noDocuments")}
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {groups.map((group) => (
              <div
                key={group.category}
                id={
                  blocking.includes(group.category)
                    ? undefined
                    : documentCategoryAnchorId(group.category)
                }
                className={cn(
                  "scroll-mt-28 rounded-xl border px-3 py-2",
                  focusCategory === group.category
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">
                    {t(`cases.docCategory.${group.category}`, {
                      defaultValue: group.category,
                    })}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {t("cases.docsFileCount", { count: group.documents.length })}
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {group.documents.map((d) => (
                    <li
                      key={d.publicUuid}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {d.title}
                        </p>
                        <div className="mt-1.5 max-w-[16rem]">
                          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">
                            {t("cases.docsRecategorizeLabel")}
                          </label>
                          <DocumentCategorySelect
                            value={d.category}
                            disabled={savingUuid === d.publicUuid}
                            onChange={(category) => {
                              void (async () => {
                                if (category === d.category) return;
                                setSavingUuid(d.publicUuid);
                                const ok = await onUpdateCategory({
                                  documentUuid: d.publicUuid,
                                  category,
                                });
                                setSavingUuid(null);
                                if (ok) {
                                  toast({
                                    title: t("cases.categorySaveSuccess"),
                                    description: t(
                                      `cases.docCategory.${category}`,
                                      { defaultValue: category },
                                    ),
                                  });
                                } else {
                                  toast({
                                    title: t("cases.categoryFailed"),
                                    variant: "destructive",
                                  });
                                }
                              })();
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          v{d.currentVersion}
                          {d.ocrStatus ? (
                            <span
                              className={cn(
                                "ml-1.5 inline-flex rounded-full px-1.5 py-0.5 font-semibold",
                                d.ocrStatus === "completed"
                                  ? "bg-primary/15 text-primary"
                                  : d.ocrStatus === "failed"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-secondary text-foreground",
                              )}
                            >
                              {t(`documents.ocrStatus.${d.ocrStatus}`, {
                                defaultValue: d.ocrStatus,
                              })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPreview(d)}
                        className="shrink-0 text-[10px] font-bold uppercase text-primary"
                      >
                        {t("documents.preview")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
