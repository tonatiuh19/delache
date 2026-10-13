import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

/** Mobile-only back affordance — case title and metadata live in the portal sidebar. */
export default function CaseDetailHeader() {
  const { t } = useTranslation();

  return (
    <header className="min-w-0 lg:hidden">
      <Link
        to="/portal/cases"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft size={14} />
        {t("cases.backToList")}
      </Link>
    </header>
  );
}
