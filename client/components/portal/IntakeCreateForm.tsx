import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, FileText, HeartPulse, Scale, Upload, Zap } from "lucide-react";
import { LocalFileRow } from "@/components/portal/LocalFileDraft";
import DatePicker from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  INTAKE_CREATE_NOTE_MAX,
  INTAKE_CREATE_REQUIRED_CATEGORIES,
  intakeCreateFileIssue,
  type IntakeCreateRequiredCategory,
} from "@shared/createCaseFormRules";
import {
  intakeDocumentTone,
  type IntakeDocumentTone,
} from "@shared/intakeDocumentCardRules";

const TONE_CLASS: Record<IntakeDocumentTone, string> = {
  demand: "bg-doc-demand text-white",
  medical: "bg-doc-medical text-white",
  cfe: "bg-doc-cfe text-white",
  photos: "bg-doc-photos text-white",
};

const ICONS = {
  lawsuit: Scale,
  medical_record: HeartPulse,
  cfe_report: Zap,
  preliminary_photo: Camera,
} as const;

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export type IntakeCreateFileMap = {
  lawsuit: File | null;
  medical_record: File | null;
  cfe_report: File | null;
  preliminary_photo: File | null;
  extra: File[];
};

export const EMPTY_INTAKE_CREATE_FILES: IntakeCreateFileMap = {
  lawsuit: null,
  medical_record: null,
  cfe_report: null,
  preliminary_photo: null,
  extra: [],
};

export function intakeCreateDraftFiles(files: IntakeCreateFileMap) {
  const rows: {
    name: string;
    type: string;
    size: number;
    category: string;
  }[] = [];
  for (const category of INTAKE_CREATE_REQUIRED_CATEGORIES) {
    const file = files[category];
    if (!file) continue;
    rows.push({
      name: file.name,
      type: file.type,
      size: file.size,
      category,
    });
  }
  for (const file of files.extra) {
    rows.push({
      name: file.name,
      type: file.type,
      size: file.size,
      category: "other",
    });
  }
  return rows;
}

function SectionHeading({
  index,
  title,
}: {
  index: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {index}
      </span>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
  );
}

export default function IntakeCreateForm({
  title,
  deadline,
  note,
  files,
  fieldError,
  onTitle,
  onDeadline,
  onNote,
  onFiles,
  onReject,
  hideGuide = false,
}: {
  title: string;
  deadline: string;
  note: string;
  files: IntakeCreateFileMap;
  fieldError: string | null;
  onTitle: (next: string) => void;
  onDeadline: (next: string) => void;
  onNote: (next: string) => void;
  onFiles: (next: IntakeCreateFileMap) => void;
  onReject: (issue: "type" | "size") => void;
  /** Staff create page shows this checklist in the right column instead. */
  hideGuide?: boolean;
}) {
  const { t } = useTranslation();
  const extraRef = useRef<HTMLInputElement>(null);
  const fieldClass =
    "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

  const setRequired = (
    category: IntakeCreateRequiredCategory,
    file: File | null,
  ) => {
    onFiles({ ...files, [category]: file });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeading index={1} title={t("cases.intakeCreate.infoTitle")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted-foreground">
            {t("cases.intakeCreate.folioLabel")}
            <input
              name="title"
              autoFocus
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder={t("cases.intakeCreate.folioPlaceholder")}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            {t("cases.intakeCreate.deadlineLabel")}
            <DatePicker
              name="deadline"
              value={deadline}
              onChange={onDeadline}
              allowClear={false}
              placeholder={t("cases.intakeCreate.deadlinePlaceholder")}
              className="mt-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading index={2} title={t("cases.intakeCreate.docsTitle")} />
        {hideGuide ? null : (
        <ul className="grid gap-2 rounded-2xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
          {INTAKE_CREATE_REQUIRED_CATEGORIES.map((category) => {
            const ready = Boolean(files[category]);
            return (
              <li
                key={category}
                className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground"
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]",
                    ready
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {ready ? "✓" : ""}
                </span>
                <span className="truncate">
                  {t(`cases.docCategory.${category}`)}
                </span>
              </li>
            );
          })}
        </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {INTAKE_CREATE_REQUIRED_CATEGORIES.map((category) => {
            const tone = intakeDocumentTone(category);
            const Icon = ICONS[category];
            const file = files[category];
            return (
              <div
                key={category}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      tone ? TONE_CLASS[tone] : "bg-secondary text-foreground",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 text-sm font-semibold text-foreground">
                    {t(`cases.docCategory.${category}`)}
                  </span>
                </span>
                {file ? (
                  <LocalFileRow
                    file={file}
                    onRemove={() => setRequired(category, null)}
                  />
                ) : null}
                <label className="inline-flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2 truncate rounded-xl border border-dashed border-border bg-muted/40 px-3 text-xs font-semibold text-foreground">
                  <Upload size={14} />
                  {file
                    ? t("cases.intakeCreate.replace")
                    : t("cases.intakeCreate.upload")}
                  <input
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      const next = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      const issue = next ? intakeCreateFileIssue(next) : null;
                      if (issue) {
                        onReject(issue);
                        return;
                      }
                      setRequired(category, next);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <div className="block rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs font-semibold text-muted-foreground">
          {t("cases.intakeCreate.extraLabel")}
          {files.extra.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {files.extra.map((file, index) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                  <LocalFileRow
                    file={file}
                    onRemove={() =>
                      onFiles({
                        ...files,
                        extra: files.extra.filter((_, i) => i !== index),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => extraRef.current?.click()}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground"
          >
            <FileText size={14} />
            {t("cases.intakeCreate.upload")}
          </button>
          <input
            ref={extraRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              const incoming = Array.from(e.target.files ?? []);
              e.target.value = "";
              const rejected = incoming.find((file) =>
                intakeCreateFileIssue(file),
              );
              if (rejected) {
                const issue = intakeCreateFileIssue(rejected);
                if (issue) onReject(issue);
              }
              const picked = incoming.filter((file) => !intakeCreateFileIssue(file));
              if (picked.length === 0) return;
              onFiles({ ...files, extra: [...files.extra, ...picked] });
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("documents.stagedHint")}
        </p>
        {hideGuide ? null : (
          <p className="text-[11px] text-muted-foreground">
            {t("cases.intakeCreate.fileHint")}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading index={3} title={t("cases.intakeCreate.notesTitle")} />
        <label className="block text-xs font-semibold text-muted-foreground">
          <textarea
            name="note"
            rows={4}
            maxLength={INTAKE_CREATE_NOTE_MAX}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder={t("cases.intakeCreate.notesPlaceholder")}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="mt-1 block text-right text-[11px] font-medium">
            {note.length} / {INTAKE_CREATE_NOTE_MAX}
          </span>
        </label>
      </section>

      {fieldError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {fieldError}
        </p>
      ) : null}
    </div>
  );
}
