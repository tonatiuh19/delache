import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DocumentPreviewSheet, {
  asPreviewableDocument,
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import CaseIntakePanel from "@/components/portal/case-detail/CaseIntakePanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import { isBlobTokenMissingError } from "@shared/documentDmsRules";
import { canApproveIntakeDocument } from "@shared/documentApprovalRules";
import { canEditIntakePack } from "@shared/portalCapabilities";
import type { DocumentCategory } from "@shared/api";
import {
  approveCaseDocument,
  approveExpediente,
  fetchCaseDetail,
  rejectCaseDocument,
  runDocumentOcr,
  updateCaseFlags,
  uploadCaseDocumentsSmart,
} from "@/store/slices/casesSlice";
import { fetchLawFirms } from "@/store/slices/portalSlice";

/** Paso 1 editor used on Resumen and on the Recepción step. */
export default function CaseIntakeWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, documents } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const lawFirms = useAppSelector((s) => s.portal.lawFirms);
  const [docPreview, setDocPreview] = useState<PreviewableDocument | null>(
    null,
  );

  useEffect(() => {
    void dispatch(fetchLawFirms());
  }, [dispatch]);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const refreshDetail = () => {
    void dispatch(fetchCaseDetail(publicUuid));
  };

  const onUpload = async (category: DocumentCategory, files: File[]) => {
    if (files.length === 0) return;
    const result = await dispatch(
      uploadCaseDocumentsSmart({ publicUuid, files, category }),
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
  };

  return (
    <>
      <CaseIntakePanel
        title={selected.title}
        description={selected.description}
        deadline={selected.externalCourtDeadlineAt}
        documents={documents}
        canEdit={canEditIntakePack(role)}
        canReview={canApproveIntakeDocument(role)}
        role={role}
        approvedAt={selected.expedienteApprovedAt}
        lawFirmId={selected.lawFirmId}
        lawFirms={lawFirms}
        onSave={async (values) => {
          const result = await dispatch(
            updateCaseFlags({
              publicUuid,
              title: values.title,
              description: values.description,
              externalCourtDeadlineAt: values.deadline.trim()
                ? new Date(`${values.deadline.trim()}T12:00:00`).toISOString()
                : null,
              lawFirmId: values.lawFirmId,
            }),
          );
          const ok = notifyThunkSave(result, {
            successTitle: t("cases.intakeCreate.saved"),
            failureTitle: t("cases.intakeCreate.saveFailed"),
            fallbackError: "intake_save_failed",
          });
          if (ok) refreshDetail();
          return ok;
        }}
        onUpload={(category, files) => {
          void onUpload(category, files);
        }}
        onPreview={(doc) => setDocPreview(asPreviewableDocument(doc))}
        onApprove={(documentUuid) => {
          void (async () => {
            const result = await dispatch(
              approveCaseDocument({ publicUuid, documentUuid }),
            );
            if (approveCaseDocument.fulfilled.match(result)) refreshDetail();
          })();
        }}
        onReject={(documentUuid) => {
          void (async () => {
            const result = await dispatch(
              rejectCaseDocument({ publicUuid, documentUuid }),
            );
            if (rejectCaseDocument.fulfilled.match(result)) refreshDetail();
          })();
        }}
        onApproveExpediente={
          canApproveIntakeDocument(role)
            ? () => {
                void (async () => {
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
                })();
              }
            : undefined
        }
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
