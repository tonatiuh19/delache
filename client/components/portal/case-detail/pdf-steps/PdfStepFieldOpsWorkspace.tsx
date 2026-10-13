import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Upload } from "lucide-react";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import {
  CaseDetailSectionFallback,
  LazyCaseLogisticsSection,
  LazyCaseNotesSection,
} from "@/components/portal/case-detail/sections";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import { LocalFileRow } from "@/components/portal/LocalFileDraft";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import {
  createEvidence,
  fetchCaseDetail,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import { fileToBase64 } from "@/utils/documentOcr";
import {
  PDF_EVIDENCE_TILES,
  primaryCategoryForPdfEvidenceTile,
  type PdfEvidenceTileId,
} from "@shared/pdfStepWorkspaceRules";
import { canMutateCaseSection } from "@shared/portalCapabilities";
import { cn } from "@/lib/utils";

export default function PdfStepFieldOpsWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, assignments, evidence, allowedNextStatuses } =
    useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const canUpload = canMutateCaseSection(role, "evidence");
  const [sending, setSending] = useState(false);
  const [staged, setStaged] = useState<
    Partial<Record<PdfEvidenceTileId, File[]>>
  >({});
  const [uploadingTile, setUploadingTile] = useState<PdfEvidenceTileId | null>(
    null,
  );

  const summary = useMemo(() => {
    if (!selected) return [];
    return buildCasePdfSummary({
      t,
      locale: i18n.language,
      selected,
      assignments,
    });
  }, [assignments, i18n.language, selected, t]);

  const tileComplete = (tileId: PdfEvidenceTileId) => {
    const tile = PDF_EVIDENCE_TILES.find((x) => x.id === tileId);
    if (!tile) return false;
    const hasSaved = evidence.some((e) =>
      (tile.categories as readonly string[]).includes(e.category),
    );
    const hasStaged = (staged[tileId] ?? []).length > 0;
    return hasSaved || hasStaged;
  };

  const allTilesReady = PDF_EVIDENCE_TILES.every((tile) =>
    tileComplete(tile.id),
  );

  const flushTile = async (tileId: PdfEvidenceTileId) => {
    const files = staged[tileId] ?? [];
    if (files.length === 0) return true;
    setUploadingTile(tileId);
    try {
      const category = primaryCategoryForPdfEvidenceTile(tileId);
      for (const file of files) {
        const data = await fileToBase64(file);
        const result = await dispatch(
          createEvidence({
            publicUuid,
            evidenceType: "photo",
            category,
            title: file.name,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            data,
          }),
        );
        if (!createEvidence.fulfilled.match(result)) {
          toast({
            title: t("documents.uploadFailed"),
            description: String(result.payload || "upload_failed"),
            variant: "destructive",
          });
          return false;
        }
      }
      setStaged((c) => ({ ...c, [tileId]: [] }));
      void dispatch(fetchCaseDetail(publicUuid));
      return true;
    } finally {
      setUploadingTile(null);
    }
  };

  if (!selected) return null;

  return (
    <CasePdfStepShell
      stepSlug="field_ops"
      title={t("cases.pdfStep.fieldOps.title")}
      subtitle={t("cases.pdfStep.fieldOps.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.fieldOps.formats")}
      onSendHint={t("cases.pdfStep.fieldOps.onSend")}
      draftLabel={t("cases.pdfStep.saveDraft")}
      sendLabel={t("cases.pdfStep.fieldOps.send")}
      drafting={uploadingTile != null}
      sending={sending}
      canDraft={canUpload}
      canSend={allTilesReady}
      onDraft={() => {
        void (async () => {
          for (const tile of PDF_EVIDENCE_TILES) {
            const ok = await flushTile(tile.id);
            if (!ok) return;
          }
          toast({ title: t("cases.pdfStep.draftSaved") });
        })();
      }}
      onSend={() => {
        void (async () => {
          setSending(true);
          try {
            for (const tile of PDF_EVIDENCE_TILES) {
              const ok = await flushTile(tile.id);
              if (!ok) return;
            }
            const next =
              allowedNextStatuses.find((s) => s === "technical_report") ??
              allowedNextStatuses[0];
            if (!next) return;
            const result = await dispatch(
              updateCaseStatus({ publicUuid, status: next }),
            );
            if (
              notifyThunkSave(result, {
                successTitle: t("cases.pdfStep.sent"),
                failureTitle: t("cases.statusFailed", {
                  defaultValue: "Could not update status",
                }),
                fallbackError: "status_failed",
              })
            ) {
              void dispatch(fetchCaseDetail(publicUuid));
            }
          } finally {
            setSending(false);
          }
        })();
      }}
    >
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseLogisticsSection publicUuid={publicUuid} />
      </Suspense>

      <section className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <h2 className="text-sm font-bold">
          {t("cases.pdfStep.fieldOps.evidenceTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("cases.pdfStep.fieldOps.evidenceHint")}
        </p>
        <div className="space-y-3">
          {PDF_EVIDENCE_TILES.map((tile, index) => {
            const ready = tileComplete(tile.id);
            const files = staged[tile.id] ?? [];
            return (
              <div
                key={tile.id}
                className={cn(
                  "rounded-2xl border bg-card p-4",
                  ready ? "border-primary/40" : "border-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 text-sm font-semibold">
                    {t(tile.labelKey)}
                  </h3>
                  {ready ? (
                    <Check size={16} className="text-primary" />
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <LocalFileRow
                      key={`${file.name}-${i}`}
                      file={file}
                      onRemove={() =>
                        setStaged((c) => ({
                          ...c,
                          [tile.id]: (c[tile.id] ?? []).filter(
                            (_, idx) => idx !== i,
                          ),
                        }))
                      }
                    />
                  ))}
                  {canUpload ? (
                    <DocumentDropzone
                      compact
                      showSizeLegend={false}
                      uploading={uploadingTile === tile.id}
                      onFiles={(incoming) =>
                        setStaged((c) => ({
                          ...c,
                          [tile.id]: [...(c[tile.id] ?? []), ...incoming],
                        }))
                      }
                    />
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload size={14} />
                      {t("cases.pdfStep.fieldOps.readOnly")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}
