import { useTranslation } from "react-i18next";
import { Info, UserRound } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { Switch } from "@/components/ui/switch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAuthError,
  updatePreferences,
} from "@/store/slices/authSlice";
import { isShowFormHelpersEnabled } from "@shared/formHelperRules";

/**
 * Self-serve profile preferences (staff + law-firm). Helpers toggle defaults ON.
 */
export default function ProfilePreferences({
  titleKey,
  eyebrowKey,
}: {
  titleKey: string;
  eyebrowKey: string;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const updatingPrefs = useAppSelector((s) => s.auth.updatingPrefs);
  const error = useAppSelector((s) => s.auth.error);
  const helpersOn = isShowFormHelpersEnabled(user?.showFormHelpers);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MetaHelmet title={t(titleKey)} noindex />
      <PortalPageHeader
        eyebrow={t(eyebrowKey)}
        title={t(titleKey)}
        description={t("profile.subtitle")}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRound size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div
            role="note"
            className="flex gap-2.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground"
          >
            <Info
              size={15}
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden
            />
            <p>{t("profile.helpersIntro")}</p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("profile.showHelpers")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("profile.showHelpersHint")}
              </p>
            </div>
            <Switch
              checked={helpersOn}
              disabled={updatingPrefs}
              onCheckedChange={(checked) => {
                dispatch(clearAuthError());
                void dispatch(updatePreferences({ showFormHelpers: checked }));
              }}
              aria-label={t("profile.showHelpers")}
            />
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {t("profile.saveFailed", { defaultValue: error })}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
