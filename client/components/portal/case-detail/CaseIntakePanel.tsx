import { useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { FileText, Scale } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import ExpedienteApproveNotice from "@/components/portal/case-detail/ExpedienteApproveNotice";
import IntakeDocumentCards from "@/components/portal/case-detail/IntakeDocumentCards";
import type { CaseDocumentItem, DocumentCategory } from "@shared/api";
import { INTAKE_CREATE_NOTE_MAX } from "@shared/createCaseFormRules";
import { StagedFileList } from "@/components/portal/LocalFileDraft";

function SectionHeading({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {index}
      </span>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
  );
}

export default function CaseIntakePanel({
  title,
  description,
  deadline,
  documents,
  canEdit,
  canReview,
  role,
  approvedAt,
  lawFirmId = null,
  lawFirms,
  onSave,
  onUpload,
  onPreview,
  onApprove,
  onReject,
  onApproveExpediente,
}: {
  title: string;
  description: string | null;
  deadline: string | null;
  documents: readonly CaseDocumentItem[];
  canEdit: boolean;
  canReview: boolean;
  role: string | null | undefined;
  approvedAt: string | null | undefined;
  lawFirmId?: number | null;
  lawFirms?: readonly {
    id: number;
    name: string;
    city?: string | null;
  }[];
  onSave?: (values: {
    title: string;
    description: string;
    deadline: string;
    lawFirmId: number | null;
  }) => void | boolean | Promise<void | boolean>;
  onUpload?: (
    category: DocumentCategory,
    files: File[],
  ) => void | Promise<void | boolean>;
  onPreview: (doc: CaseDocumentItem) => void;
  onApprove?: (documentUuid: string) => void;
  onReject?: (documentUuid: string) => void;
  onApproveExpediente?: () => void;
}) {
  const { t } = useTranslation();
  const extras = documents.filter((doc) => doc.category === "other");
  const [pending, setPending] = useState<
    Partial<Record<DocumentCategory, File[]>>
  >({});
  const stageFiles = (category: DocumentCategory, files: File[]) => {
    setPending((current) => ({
      ...current,
      [category]: [...(current[category] ?? []), ...files],
    }));
  };
  const removePending = (category: DocumentCategory, index: number) => {
    setPending((current) => ({
      ...current,
      [category]: (current[category] ?? []).filter((_, i) => i !== index),
    }));
  };
  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      title,
      deadline: deadline ? deadline.slice(0, 10) : "",
      note: description ?? "",
      lawFirmId: lawFirmId != null ? String(lawFirmId) : "",
    },
    onSubmit: async (values) => {
      const parsedFirm = Number(values.lawFirmId);
      const saved = await onSave?.({
        title: values.title.trim(),
        description: values.note,
        deadline: values.deadline,
        lawFirmId: Number.isFinite(parsedFirm) && parsedFirm > 0 ? parsedFirm : null,
      });
      if (saved === false) return;
      const queued = Object.entries(pending) as Array<
        [DocumentCategory, File[]]
      >;
      for (const [category, files] of queued) {
        if (!files?.length) continue;
        const uploaded = await onUpload?.(category, files);
        if (uploaded === false) return;
      }
      setPending({});
    },
  });
  const fieldClass =
    "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70";

  return (
    <form onSubmit={form.handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <SectionHeading index={1} title={t("cases.intakeCreate.infoTitle")} />
        {lawFirms ? (
          <label className="mt-4 block text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Scale size={12} className="text-primary" />
              {t("cases.lawFirmLabel")}
            </span>
            <select
              name="lawFirmId"
              value={form.values.lawFirmId}
              onChange={form.handleChange}
              disabled={!canEdit}
              className={fieldClass}
            >
              <option value="">{t("cases.createSheet.lawFirmPlaceholder")}</option>
              {lawFirms.map((firm) => (
                <option key={firm.id} value={String(firm.id)}>
                  {firm.name}
                  {firm.city ? ` · ${firm.city}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted-foreground">
            {t("cases.intakeCreate.folioLabel")}
            <input
              name="title"
              value={form.values.title}
              onChange={form.handleChange}
              disabled={!canEdit}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            {t("cases.intakeCreate.deadlineLabel")}
            <DatePicker
              name="deadline"
              value={form.values.deadline}
              onChange={(next) => void form.setFieldValue("deadline", next)}
              disabled={!canEdit}
              allowClear={false}
              placeholder={t("cases.intakeCreate.deadlinePlaceholder")}
              className="mt-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index={2} title={t("cases.intakeCreate.docsTitle")} />
        {canReview ? (
          <ExpedienteApproveNotice
            role={role}
            approvedAt={approvedAt}
            documents={documents}
            onApprove={onApproveExpediente}
          />
        ) : null}
        <IntakeDocumentCards
          documents={documents}
          canUpload={canEdit}
          canReview={canReview}
          pendingFiles={pending}
          onRemovePending={removePending}
          onUpload={stageFiles}
          onPreview={onPreview}
          onApprove={(id) => onApprove?.(id)}
          onReject={(id) => onReject?.(id)}
        />
        {extras.length > 0 ? (
          <ul className="space-y-2">
            {extras.map((doc) => (
              <li key={doc.publicUuid}>
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm font-semibold"
                >
                  <FileText size={16} className="shrink-0 text-primary" />
                  <span className="min-w-0 truncate">{doc.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {canEdit ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs font-semibold text-muted-foreground">
            {t("cases.intakeCreate.extraLabel")}
            {(pending.other ?? []).length > 0 ? (
              <div className="mt-3">
                <StagedFileList
                  files={pending.other ?? []}
                  onRemove={(index) => removePending("other", index)}
                />
              </div>
            ) : null}
            <label className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground">
              {t("cases.intakeCreate.upload")}
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  e.target.value = "";
                  if (files.length > 0) stageFiles("other", files);
                }}
              />
            </label>
          </div>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          {t("cases.intakeCreate.fileHint")}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <SectionHeading index={3} title={t("cases.intakeCreate.notesTitle")} />
        <textarea
          name="note"
          rows={4}
          maxLength={INTAKE_CREATE_NOTE_MAX}
          value={form.values.note}
          onChange={form.handleChange}
          disabled={!canEdit}
          placeholder={t("cases.intakeCreate.notesPlaceholder")}
          className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {form.values.note.length} / {INTAKE_CREATE_NOTE_MAX}
        </p>
        {canEdit ? (
          <>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("documents.stagedHint")}
            </p>
            <PendingSubmitButton pending={form.isSubmitting} className="mt-3 h-11 px-5">
              {t("cases.intakeCreate.send")}
            </PendingSubmitButton>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("cases.intakeCreate.readOnly")}
          </p>
        )}
      </section>
    </form>
  );
}
