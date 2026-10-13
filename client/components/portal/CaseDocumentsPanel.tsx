import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Circle,
  Eye,
  FileUp,
  FolderOpen,
  Paperclip,
  X,
} from "lucide-react";
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
import {
  documentIsApprovable,
  documentIsRejectable,
  isIntakeDocumentCategory,
} from "@shared/documentApprovalRules";
import { DOCUMENT_CATEGORIES } from "@shared/documentCategoryRules";
import { dmsMaxFileSizeMb, classifyDmsFiles } from "@shared/documentDmsRules";
import { cn } from "@/lib/utils";
import DocumentCategorySelect from "@/components/portal/DocumentCategorySelect";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { toast } from "@/hooks/use-toast";
import { StagedFileList } from "@/components/portal/LocalFileDraft";

export default function CaseDocumentsPanel({
  documents,
  uploadCategory,
  onUploadCategoryChange,
  uploading,
  onUploadFiles,
  onPreview,
  onUpdateCategory,
  onApproveDocument,
  onRejectDocument,
  canApproveDocuments = false,
  missingGateCodes,
  documentCompleteness,
  canUpload,
}: {
  documents: CaseDocumentItem[];
  uploadCategory: DocumentCategory;
  onUploadCategoryChange: (category: DocumentCategory) => void;
  uploading: boolean;
  onUploadFiles: (files: File[]) => void | Promise<void | boolean>;
  onPreview: (doc: CaseDocumentItem) => void;
  onUpdateCategory: (opts: {
    documentUuid: string;
    category: DocumentCategory;
  }) => Promise<boolean>;
  onApproveDocument?: (documentUuid: string) => Promise<boolean>;
  onRejectDocument?: (
    documentUuid: string,
    reason: string | null,
  ) => Promise<boolean>;
  canApproveDocuments?: boolean;
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
  const [staged, setStaged] = useState<File[]>([]);
  const [savingUuid, setSavingUuid] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const didAutoFocus = useRef(false);
  const directInputRef = useRef<HTMLInputElement>(null);

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
  const activeCategory = focusCategory ?? uploadCategory;
  const maxMb = dmsMaxFileSizeMb();

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

  const pickFilesForCategory = (category: DocumentCategory) => {
    applyFocus(category);
    directInputRef.current?.click();
  };

  const onDirectFiles = async (list: FileList | null) => {
    if (!list?.length || uploading) return;
    const classified = classifyDmsFiles(Array.from(list));
    if (classified.rejected.length > 0) {
      toast({
        title: t("documents.rejectedTitle", {
          count: classified.rejected.length,
        }),
        description: classified.rejected
          .slice(0, 2)
          .map((item) => item.name)
          .join(", "),
        variant: "destructive",
      });
    }
    if (classified.accepted.length === 0) return;
    setStaged((current) => [...current, ...(classified.accepted as File[])]);
  };

  const sendStaged = async () => {
    if (staged.length === 0 || uploading) return;
    const sent = await onUploadFiles(staged);
    if (sent !== false) setStaged([]);
  };

  return (
    <CaseDetailSectionPanel
      id="case-documents"
      sectionId="documents"
      title={t("cases.documents")}
      icon={<FolderOpen size={18} />}
      bodyClassName="space-y-6"
      headerAside={
        blocking.length > 0 ? (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
            {t("cases.docsBlockingCount", { count: blocking.length })}
          </span>
        ) : (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {t("cases.docsPointClear")}
          </span>
        )
      }
    >
        {canUpload ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {blocking.length > 0 ? (
                <>
                  <span className="w-full text-xs font-bold uppercase tracking-wide text-muted-foreground sm:w-auto">
                    {t("cases.docsRequiredLabel")}
                  </span>
                  {blocking.map((category) => {
                    const hasFile = presentSet.has(category);
                    const isActive = activeCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        id={documentCategoryAnchorId(category)}
                        onClick={() => applyFocus(category)}
                        onDoubleClick={() =>
                          !hasFile &&
                          pickFilesForCategory(category as DocumentCategory)
                        }
                        className={cn(
                          "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {hasFile ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {t(`cases.docCategory.${category}`, {
                            defaultValue: category,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="w-full max-w-md">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("cases.docsUploadCategoryLabel")}
                  </label>
                  <DocumentCategorySelect
                    id="case-documents-upload-category"
                    value={uploadCategory}
                    onChange={(category) => applyFocus(category)}
                  />
                </div>
              )}
            </div>

            <StagedFileList
              files={staged}
              sending={uploading}
              onRemove={(index) =>
                setStaged((current) => current.filter((_, i) => i !== index))
              }
              onSend={() => void sendStaged()}
            />
            <DocumentDropzone
              uploading={uploading}
              onFiles={(files) =>
                setStaged((current) => [...current, ...files])
              }
              showSizeLegend={false}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("cases.docsUploadWillUse", {
                  category: t(`cases.docCategory.${activeCategory}`, {
                    defaultValue: activeCategory,
                  }),
                })}
              </span>
              <span>{t("cases.docsSizeLimit", { mb: maxMb })}</span>
            </div>

            {blocking.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {blocking.map((category) => {
                  const hasFile = presentSet.has(category);
                  return (
                    <li
                      key={category}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 bg-background px-4 py-3",
                        activeCategory === category && "bg-primary/[0.03]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {hasFile ? (
                          <Check
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : (
                          <Circle
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                        <span className="text-sm font-semibold text-foreground">
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
                          onClick={() =>
                            pickFilesForCategory(category as DocumentCategory)
                          }
                          disabled={uploading}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                        >
                          <Paperclip className="h-4 w-4" />
                          {t("cases.docsAttachFiles")}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <input
              ref={directInputRef}
              type="file"
              multiple
              className="hidden"
              accept="application/pdf,image/*,.doc,.docx,.txt"
              disabled={uploading}
              onChange={(e) => {
                void onDirectFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {phases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {phases.map((phase) => (
              <div
                key={phase.key}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  phase.complete
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                <span className="font-semibold">
                  {t(`cases.docPhase.${phase.key}`)}
                </span>
                <span className="ml-1.5 font-bold">
                  {phase.presentCount}/{phase.requiredCount}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-left transition hover:bg-muted/50"
            aria-expanded={filesOpen}
          >
            <span className="text-sm font-bold text-foreground">
              {t("cases.docsOnFileTitle")}
              <span className="ml-2 font-normal text-muted-foreground">
                ({documents.length})
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition",
                filesOpen && "rotate-180",
              )}
            />
          </button>

          {filesOpen ? (
            groups.length === 0 ? (
              <p className="mt-3 px-1 text-sm text-muted-foreground">
                {t("cases.noDocuments")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {groups.flatMap((group) =>
                  group.documents.map((d) => (
                    <li
                      key={d.publicUuid}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                    >
                      <FileUp className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {d.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t(`cases.docCategory.${d.category}`, {
                            defaultValue: d.category,
                          })}
                          {" · "}v{d.currentVersion}
                          {" · "}
                          {t(`cases.docStatus.${d.status}`, {
                            defaultValue: d.status,
                          })}
                        </p>
                        {d.rejectionReason ? (
                          <p className="mt-0.5 text-xs text-destructive">
                            {d.rejectionReason}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onPreview(d)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary/15"
                        >
                          <Eye size={14} />
                          {t("documents.preview")}
                        </button>
                        {canApproveDocuments &&
                        onApproveDocument &&
                        isIntakeDocumentCategory(d.category) &&
                        documentIsApprovable(d.status) ? (
                          <button
                            type="button"
                            disabled={savingUuid === d.publicUuid}
                            onClick={() => {
                              void (async () => {
                                setSavingUuid(d.publicUuid);
                                const ok = await onApproveDocument(d.publicUuid);
                                setSavingUuid(null);
                                toast({
                                  title: ok
                                    ? t("cases.documentApproveSuccess")
                                    : t("cases.documentApproveFailed"),
                                  variant: ok ? "default" : "destructive",
                                });
                              })();
                            }}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary/15"
                          >
                            <Check size={14} />
                            {t("cases.documentApproveAction")}
                          </button>
                        ) : null}
                        {canApproveDocuments &&
                        onRejectDocument &&
                        isIntakeDocumentCategory(d.category) &&
                        documentIsRejectable(d.status) ? (
                          <button
                            type="button"
                            disabled={savingUuid === d.publicUuid}
                            onClick={() => {
                              void (async () => {
                                const reason = window.prompt(
                                  t("cases.documentRejectPrompt"),
                                );
                                if (reason === null) return;
                                setSavingUuid(d.publicUuid);
                                const ok = await onRejectDocument(
                                  d.publicUuid,
                                  reason.trim() || null,
                                );
                                setSavingUuid(null);
                                toast({
                                  title: ok
                                    ? t("cases.documentRejectSuccess")
                                    : t("cases.documentRejectFailed"),
                                  variant: ok ? "default" : "destructive",
                                });
                              })();
                            }}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive transition hover:bg-destructive/15"
                          >
                            <X size={14} />
                            {t("cases.documentRejectAction")}
                          </button>
                        ) : null}
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
                    </li>
                  )),
                )}
              </ul>
            )
          ) : null}
        </div>
    </CaseDetailSectionPanel>
  );
}
