import { useCallback, useState, type DragEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, Loader2 } from "lucide-react";
import { filterDmsFiles } from "@/utils/documentOcr";
import { DMS_MAX_BULK_FILES } from "@shared/documentDmsRules";

type Props = {
  disabled?: boolean;
  uploading?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  children?: ReactNode;
  compact?: boolean;
};

export default function DocumentDropzone({
  disabled,
  uploading,
  onFiles,
  children,
  compact,
}: Props) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || disabled || uploading) return;
      const files = filterDmsFiles(list);
      if (files.length === 0) return;
      await onFiles(files);
    },
    [disabled, uploading, onFiles],
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "rounded-2xl border border-dashed transition-colors",
        dragging
          ? "border-accent bg-accent/5"
          : "border-border bg-muted/20",
        compact ? "p-3" : "p-6",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <FileUp className="h-6 w-6 text-primary" />
        )}
        <div className="text-sm font-semibold text-foreground">
          {uploading
            ? t("documents.uploading")
            : dragging
              ? t("documents.dropNow")
              : t("documents.dropHint")}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("documents.dropLimits", { max: DMS_MAX_BULK_FILES })}
        </p>
        <input
          type="file"
          multiple
          className="hidden"
          accept="application/pdf,image/*,.doc,.docx,.txt"
          disabled={disabled || uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {children}
    </div>
  );
}
