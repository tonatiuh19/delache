import { useTranslation } from "react-i18next";
import type { DocumentCategory } from "@shared/api";
import {
  canClientRecategorizeDocument,
  CLIENT_DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORIES,
} from "@shared/documentCategoryRules";

export default function DocumentCategorySelect({
  value,
  onChange,
  clientPortal = false,
  disabled,
  id,
}: {
  value: DocumentCategory;
  onChange: (category: DocumentCategory) => void;
  clientPortal?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const { t } = useTranslation();
  const options = clientPortal
    ? CLIENT_DOCUMENT_CATEGORIES
    : DOCUMENT_CATEGORIES;
  const valueInOptions = (options as readonly string[]).includes(value);
  const locked =
    Boolean(disabled) ||
    (clientPortal && Boolean(value) && !canClientRecategorizeDocument(value));

  return (
    <select
      id={id}
      value={valueInOptions ? value : ""}
      disabled={locked}
      onChange={(e) => {
        const next = e.target.value;
        if (next) onChange(next as DocumentCategory);
      }}
      className="h-9 w-full rounded-xl border border-input bg-background px-2 text-xs font-semibold text-foreground"
      aria-label={t("cases.documentCategory")}
    >
      {valueInOptions ? null : (
        <option value="" disabled>
          {value
            ? t(`cases.docCategory.${value}`, { defaultValue: value })
            : t("cases.documentCategory")}
        </option>
      )}
      {options.map((cat) => (
        <option key={cat} value={cat}>
          {t(`cases.docCategory.${cat}`, { defaultValue: cat })}
        </option>
      ))}
    </select>
  );
}
