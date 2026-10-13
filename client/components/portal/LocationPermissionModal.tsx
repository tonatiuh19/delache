import { Loader2, MapPinned, Navigation, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type LocationPermissionTarget = "property" | "evidence";

type Props = {
  open: boolean;
  target: LocationPermissionTarget;
  locating?: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onNotNow: () => void;
};

export default function LocationPermissionModal({
  open,
  target,
  locating = false,
  onOpenChange,
  onAllow,
  onNotNow,
}: Props) {
  const { t } = useTranslation();
  const titleKey =
    target === "evidence"
      ? "maps.permissionModal.titleEvidence"
      : "maps.permissionModal.titleProperty";
  const bodyKey =
    target === "evidence"
      ? "maps.permissionModal.bodyEvidence"
      : "maps.permissionModal.bodyProperty";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[min(100vw-1.5rem,26rem)] overflow-hidden rounded-2xl border-border p-0 sm:rounded-2xl",
        )}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-card px-6 pb-2 pt-8">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary/30 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-accent/10 blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-background/90 shadow-sm">
            <MapPinned className="h-8 w-8 text-primary" aria-hidden />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-accent text-accent-foreground">
              <Navigation className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          <DialogHeader className="relative mt-5 space-y-2 text-center sm:text-center">
            <DialogTitle className="font-[Manrope] text-xl">
              {t(titleKey)}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t(bodyKey)}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ul className="space-y-2.5 px-6 py-4 text-sm text-muted-foreground">
          <li className="flex gap-2.5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{t("maps.permissionModal.bulletPrivacy")}</span>
          </li>
          <li className="flex gap-2.5">
            <Navigation
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>{t("maps.permissionModal.bulletAccuracy")}</span>
          </li>
        </ul>

        <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:gap-2">
          <button
            type="button"
            disabled={locating}
            onClick={onNotNow}
            className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50 sm:w-auto"
          >
            {t("maps.permissionModal.notNow")}
          </button>
          <button
            type="button"
            disabled={locating}
            onClick={onAllow}
            className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Navigation className="h-4 w-4" aria-hidden />
            )}
            {locating
              ? t("maps.permissionModal.locating")
              : t("maps.permissionModal.allow")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
