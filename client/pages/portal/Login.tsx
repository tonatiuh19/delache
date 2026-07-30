import { Check, Fingerprint, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import OtpLoginForm from "@/components/auth/OtpLoginForm";

function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary">
      <span className="h-4 w-4 rotate-45 border-[3px] border-current" />
    </span>
  );
}

function StaffLoginVisual() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#09172b] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="login-glow absolute -left-40 top-[-12%] h-[620px] w-[620px] rounded-full bg-accent/25 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px]" />
      <div className="relative z-10 flex items-center gap-3 text-white">
        <BrandMark />
        <span className="text-[15px] font-extrabold tracking-[.28em]">
          {t("common.appName")}
        </span>
      </div>
      <div className="relative z-10 max-w-xl py-12">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#82b5ff]">
          <span className="h-2 w-2 rounded-full bg-[#55d7b0] shadow-[0_0_0_5px_rgba(85,215,176,.12)]" />{" "}
          {t("auth.privatePortal")}
        </div>
        <h1 className="font-[Manrope] text-5xl font-semibold leading-[1.02] tracking-[-.065em] text-white xl:text-7xl">
          {t("auth.visualHeadline")}
        </h1>
        <p className="mt-7 max-w-md text-base leading-7 text-blue-100/55">
          {t("auth.visualBody")}
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
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent">
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
            <div className="mt-4 flex h-14 items-end gap-1.5">
              {[24, 45, 35, 66, 48, 74, 55, 92, 68, 80, 70, 96].map(
                (height, index) => (
                  <span
                    style={{ height: `${height}%` }}
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-accent to-[#79b4ff] opacity-70"
                  />
                ),
              )}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="absolute bottom-0 right-0 rounded-2xl border border-white/15 bg-[#142844]/90 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <Check size={16} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-white">
                  {t("auth.visualEvidence")}
                </div>
                <div className="mt-1 text-[9px] text-white/35">
                  EXP-2418 · {t("auth.visualEvidenceMeta")}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-[10px] text-white/30">
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

/** Staff / admin login — `/portal/login` → `/portal` */
export default function PortalLogin() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <MetaHelmet
        title={t("meta.loginTitle")}
        description={t("meta.loginDescription")}
        path="/portal/login"
        noindex
      />
      <StaffLoginVisual />
      <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <Link
            to="/"
            className="flex items-center gap-3 text-foreground lg:hidden"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="h-3.5 w-3.5 rotate-45 border-2 border-current" />
            </span>
            <span className="text-sm font-extrabold tracking-[.24em]">
              {t("common.appName")}
            </span>
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary lg:flex"
          >
            <ArrowLeft size={14} /> {t("auth.backToSite")}
          </Link>
        </div>
        <OtpLoginForm
          actor="staff"
          eyebrowKey="auth.privatePortal"
          titleKey="auth.loginTitle"
          subtitleKey="auth.loginSubtitle"
          icon="lock"
        />
        <div className="flex items-center justify-end text-[10px] text-muted-foreground">
          <span>{t("auth.privacyTerms")}</span>
        </div>
      </section>
    </main>
  );
}
