import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { useAppSelector } from "@/store/hooks";

/**
 * Self-serve profile (staff + law-firm).
 * Process guidance panel and tip helpers were removed — no preference toggles.
 */
export default function ProfilePreferences({
  titleKey,
  eyebrowKey,
}: {
  titleKey: string;
  eyebrowKey: string;
}) {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

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

        <div className="p-5">
          <p className="text-sm text-muted-foreground">{t("profile.accountHint")}</p>
        </div>
      </section>
    </div>
  );
}
