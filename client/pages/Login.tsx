import { ArrowLeft, Fingerprint, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import OtpLoginForm from "@/components/auth/OtpLoginForm";
import BrandLogo from "@/components/BrandLogo";

function UnifiedLoginVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-delache-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="login-glow absolute -left-40 top-[-12%] h-[620px] w-[620px] rounded-full bg-primary/25 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative z-10 flex items-center text-white">
        <BrandLogo variant="full" size="lg" />
      </div>
      <div className="relative z-10 max-w-xl py-12">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_rgba(230,171,64,.16)]" />{" "}
          {t("auth.unifiedPortal")}
        </div>
        <h1 className="font-[Manrope] text-5xl font-semibold leading-[1.02] tracking-[-.065em] text-white xl:text-7xl">
          {t("auth.visualHeadline")}
        </h1>
        <p className="mt-7 max-w-md text-base leading-7 text-white/55">
          {t("auth.unifiedVisualBody")}
        </p>
        <div className="relative mt-14 h-[235px] max-w-[500px]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute left-0 top-0 w-[82%] rounded-2xl border border-white/15 bg-white/[.07] p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[10px] text-white/60">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Fingerprint size={12} />
                </span>{" "}
                {t("auth.visualCardTitle")}
              </div>
              <span className="text-[9px] text-emerald-300">
                ● {t("auth.visualLive")}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["48", t("auth.statActive")],
                ["126", t("auth.statInProgress")],
                ["96%", t("auth.statTraceability")],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-white/[.06] p-2.5">
                  <div className="text-base font-semibold text-white">
                    {value}
                  </div>
                  <div className="mt-1 text-[8px] text-white/35">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40">
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

/** Unified login — `/login` → `/portal` for both actors. */
export default function Login() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen overflow-x-clip bg-background lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <MetaHelmet
        title={t("meta.loginTitle")}
        description={t("meta.loginDescription")}
        path="/login"
        noindex
      />
      <UnifiedLoginVisual />
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
          eyebrowKey="auth.unifiedPortal"
          titleKey="auth.loginTitle"
          subtitleKey="auth.unifiedLoginSubtitle"
          icon="lock"
        />
        <div className="flex items-center justify-end text-[10px] text-muted-foreground">
          <span>{t("auth.privacyTerms")}</span>
        </div>
      </section>
    </main>
  );
}
