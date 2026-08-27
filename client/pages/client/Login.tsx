import { ArrowLeft, Building2, FileText, Scale, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import OtpLoginForm from "@/components/auth/OtpLoginForm";
import BrandLogo from "@/components/BrandLogo";

function ClientLoginVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#faf7f0] lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-border lg:p-12 xl:p-16">
      <div className="absolute -left-24 top-[-10%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-[90px]" />
      <div className="absolute bottom-[-18%] right-[-12%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-[90px]" />
      <div className="relative z-10 flex items-center text-foreground">
        <BrandLogo variant="full" size="lg" />
      </div>
      <div className="relative z-10 max-w-xl py-12">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_rgba(230,171,64,.16)]" />{" "}
          {t("auth.clientPortal")}
        </div>
        <h1 className="font-[Manrope] text-5xl font-semibold leading-[1.02] tracking-[-.065em] text-foreground xl:text-6xl">
          {t("auth.clientVisualHeadline")}
        </h1>
        <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">
          {t("auth.clientVisualBody")}
        </p>
        <div className="mt-12 grid max-w-md gap-3">
          {[
            {
              icon: Scale,
              title: t("auth.clientVisualFeature1Title"),
              body: t("auth.clientVisualFeature1Body"),
            },
            {
              icon: FileText,
              title: t("auth.clientVisualFeature2Title"),
              body: t("auth.clientVisualFeature2Body"),
            },
            {
              icon: Building2,
              title: t("auth.clientVisualFeature3Title"),
              body: t("auth.clientVisualFeature3Body"),
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * index, duration: 0.5 }}
              className="flex gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <item.icon size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.body}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {t("common.appName")}
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck size={13} /> {t("auth.secureNote")}
        </span>
      </div>
    </div>
  );
}

/** Law-firm login — `/client/login` → `/client` */
export default function ClientLogin() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[.95fr_1.05fr]">
      <MetaHelmet
        title={t("meta.clientLoginTitle")}
        description={t("meta.clientLoginDescription")}
        path="/client/login"
        noindex
      />
      <ClientLoginVisual />
      <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <Link
            to="/"
            className="inline-flex items-center text-foreground lg:hidden"
            aria-label={t("common.appName")}
          >
            <BrandLogo variant="full" size="sm" />
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary lg:flex"
          >
            <ArrowLeft size={14} /> {t("auth.backToSite")}
          </Link>
        </div>
        <OtpLoginForm
          actor="law_firm"
          eyebrowKey="auth.clientPortal"
          titleKey="auth.clientLoginTitle"
          subtitleKey="auth.clientLoginSubtitle"
          icon="mail"
        />
        <div className="flex items-center justify-end text-[10px] text-muted-foreground">
          <span>{t("auth.privacyTerms")}</span>
        </div>
      </section>
    </main>
  );
}
