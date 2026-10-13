import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** Shown when a saved login could not be confirmed (timeout / 5xx). Token stays. */
export default function SessionRestoreFallback({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm leading-6 text-muted-foreground">
          {t("auth.sessionRestoreFailed")}
        </p>
        <Button
          type="button"
          className="mt-6 min-h-11"
          onClick={onRetry}
        >
          {t("common.retry")}
        </Button>
      </div>
    </div>
  );
}
