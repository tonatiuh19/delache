import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isLocalAppHostname } from "@shared/localDevRules";

/**
 * Shown next to actions that send emails with login / case CTA buttons.
 * Local APP_URL (default http://localhost:8080) makes those links unusable
 * for real recipients — this legend prevents accidental invite testing.
 */
export default function LocalEmailCtaLegend({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

  if (!isLocalAppHostname(hostname)) return null;

  return (
    <aside
      role="note"
      className={
        className ||
        "rounded-xl border border-primary/30 bg-secondary/60 px-3 py-2.5 text-xs text-foreground"
      }
    >
      <div className="flex gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="font-bold tracking-wide text-primary">
            {t("dev.localEmailCtaTitle")}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {t("dev.localEmailCtaBody", { origin })}
          </p>
          <p className="font-mono text-[11px] text-foreground/80 break-all">
            {origin}
          </p>
        </div>
      </div>
    </aside>
  );
}
