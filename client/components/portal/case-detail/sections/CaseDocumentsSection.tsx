import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import DocumentPreviewSheet, {
  asPreviewableDocument,
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import CaseDocumentsPanel from "@/components/portal/CaseDocumentsPanel";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import IntakeDocumentCards from "@/components/portal/case-detail/IntakeDocumentCards";
import CaseIntakeWorkspace from "@/components/portal/case-detail/CaseIntakeWorkspace";
import ExpedienteApproveNotice from "@/components/portal/case-detail/ExpedienteApproveNotice";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import DateTimePicker from "@/components/ui/date-time-picker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import { isBlobTokenMissingError } from "@shared/documentDmsRules";
import { canApproveIntakeDocument } from "@shared/documentApprovalRules";
import {
  canMutateCaseSection,
  canViewCaseSection,
} from "@shared/portalCapabilities";
import type { DocumentCategory } from "@shared/api";
import {
  approveCaseDocument,
  approveExpediente,
  fetchCaseDetail,
  rejectCaseDocument,
  runDocumentOcr,
  setRatificationScheduled,
  updateDocumentCategory,
  uploadCaseDocumentsSmart,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseDocumentsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { stepSlug } = useParams<{ stepSlug?: string }>();
  const dispatch = useAppDispatch();
  const {
    selected,
    documents,
    documentCompleteness,
    processGate,
    statusGateMissing,
  } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [docPreview, setDocPreview] = useState<PreviewableDocument | null>(
    null,
  );
  const [docsUploading, setDocsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>("lawsuit");

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const ratificationForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      ratificationScheduledAt: selected?.ratificationScheduledAt
        ? selected.ratificationScheduledAt.slice(0, 16)
        : "",
    },
    onSubmit: async (values) => {
      const result = await dispatch(
        setRatificationScheduled({
          publicUuid,
          ratificationScheduledAt: values.ratificationScheduledAt.trim()
            ? new Date(values.ratificationScheduledAt).toISOString()
            : null,
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.ratificationScheduledSaveSuccess"),
          failureTitle: t("cases.ratificationScheduledSaveFailed"),
          fallbackError: "ratification_schedule_failed",
        })
      ) {
        refreshDetail();
      }
    },
  });

  const onBulkUpload = async (
    files: File[],
    category: DocumentCategory = uploadCategory,
  ) => {
    if (files.length === 0) return;
    setDocsUploading(true);
    try {
      const result = await dispatch(
        uploadCaseDocumentsSmart({
          publicUuid,
          files,
          category,
        }),
      );
      if (uploadCaseDocumentsSmart.fulfilled.match(result)) {
        refreshDetail();
        if (result.payload.failures.length === 0) return true;
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
        }
        return false;
      }
      const message = String(result.payload || "upload_failed");
      toast({
        title: t("documents.uploadFailed"),
        description: isBlobTokenMissingError(message)
          ? t("documents.blobNotConfigured")
          : message,
        variant: "destructive",
      });
      return false;
    } finally {
      setDocsUploading(false);
    }
    return false;
  };

  if (!selected || selected.publicUuid !== publicUuid) return null;

  if (stepSlug === "intake") {
    return <CaseIntakeWorkspace publicUuid={publicUuid} />;
  }

  const showRatificationSchedule =
    selected.status === "validation_delivery" ||
    stepSlug === "validation_delivery" ||
    stepSlug === "court_delivery" ||
    (processGate?.missing ?? statusGateMissing).includes(
      "court:ratification_scheduled",
    );

  return (
    <>
      {showRatificationSchedule ? (
        <CaseDetailSectionPanel
          id="case-ratification-schedule"
          sectionId="documents"
          title={t("cases.ratificationScheduledTitle")}
          helper={t("cases.ratificationScheduledHint")}
        >
          <form
            onSubmit={ratificationForm.handleSubmit}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="min-w-0 w-full flex-1 text-sm font-semibold text-muted-foreground sm:min-w-[16rem]">
              {t("cases.ratificationScheduledAt")}
              <DateTimePicker
                name="ratificationScheduledAt"
                value={ratificationForm.values.ratificationScheduledAt}
                onChange={(next) =>
                  void ratificationForm.setFieldValue(
                    "ratificationScheduledAt",
                    next,
                  )
                }
                className="mt-1.5"
              />
            </label>
            <PendingSubmitButton
              pending={ratificationForm.isSubmitting}
              className="h-11 px-5"
            >
              {t("cases.ratificationScheduledSave")}
            </PendingSubmitButton>
          </form>
        </CaseDetailSectionPanel>
      ) : null}
      {selected.status === "intake" ? (
        <ExpedienteApproveNotice
          className="mb-4"
          role={role}
          approvedAt={selected.expedienteApprovedAt}
          documents={documents}
          onApprove={
            canApproveIntakeDocument(role)
              ? async () => {
                  const result = await dispatch(approveExpediente(publicUuid));
                  if (
                    notifyThunkSave(result, {
                      successTitle: t("cases.expedienteApproveSuccess"),
                      failureTitle: t("cases.expedienteApproveFailed"),
                      fallbackError: "expediente_approve_failed",
                    })
                  ) {
                    refreshDetail();
                  }
                }
              : undefined
          }
        />
      ) : selected.expedienteApprovedAt ? (
        <ExpedienteApproveNotice
          className="mb-4"
          role={role}
          approvedAt={selected.expedienteApprovedAt}
          documents={documents}
        />
      ) : null}
      {selected.status === "intake" || stepSlug === "intake" ? (
        <div className="mb-4">
          <IntakeDocumentCards
            documents={documents}
            canUpload={canMutateCaseSection(role, "documents")}
            canReview={canApproveIntakeDocument(role)}
            onUpload={(category, files) => {
              setUploadCategory(category);
              void onBulkUpload(files, category);
            }}
            onPreview={(d) => setDocPreview(asPreviewableDocument(d))}
            onApprove={(documentUuid) => {
              void (async () => {
                const result = await dispatch(
                  approveCaseDocument({ publicUuid, documentUuid }),
                );
                if (approveCaseDocument.fulfilled.match(result)) {
                  refreshDetail();
                }
              })();
            }}
            onReject={(documentUuid) => {
              void (async () => {
                const result = await dispatch(
                  rejectCaseDocument({ publicUuid, documentUuid }),
                );
                if (rejectCaseDocument.fulfilled.match(result)) {
                  refreshDetail();
                }
              })();
            }}
          />
        </div>
      ) : null}
      <CaseDocumentsPanel
        documents={documents}
        uploadCategory={uploadCategory}
        onUploadCategoryChange={setUploadCategory}
        uploading={docsUploading}
        onUploadFiles={onBulkUpload}
        onPreview={(d) => setDocPreview(asPreviewableDocument(d))}
        missingGateCodes={processGate?.missing ?? statusGateMissing}
        documentCompleteness={
          canViewCaseSection(role, "completeness")
            ? documentCompleteness
            : null
        }
        canUpload={canMutateCaseSection(role, "documents")}
        canApproveDocuments={canApproveIntakeDocument(role)}
        onApproveDocument={async (documentUuid) => {
          const result = await dispatch(
            approveCaseDocument({ publicUuid, documentUuid }),
          );
          if (approveCaseDocument.fulfilled.match(result)) {
            refreshDetail();
            return true;
          }
          return false;
        }}
        onRejectDocument={async (documentUuid, reason) => {
          const result = await dispatch(
            rejectCaseDocument({ publicUuid, documentUuid, reason }),
          );
          if (rejectCaseDocument.fulfilled.match(result)) {
            refreshDetail();
            return true;
          }
          return false;
        }}
        onUpdateCategory={async ({ documentUuid, category }) => {
          const result = await dispatch(
            updateDocumentCategory({
              publicUuid,
              documentUuid,
              category,
            }),
          );
          if (updateDocumentCategory.fulfilled.match(result)) {
            refreshDetail();
            return true;
          }
          return false;
        }}
      />
      <DocumentPreviewSheet
        open={Boolean(docPreview)}
        document={docPreview}
        onOpenChange={(open) => {
          if (!open) setDocPreview(null);
        }}
        onRunOcr={async (doc, ocrText) => {
          const result = await dispatch(
            runDocumentOcr({
              publicUuid,
              documentUuid: doc.publicUuid,
              ocrText,
            }),
          );
          if (runDocumentOcr.fulfilled.match(result)) {
            setDocPreview(asPreviewableDocument(result.payload));
          }
        }}
      />
    </>
  );
}
