import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAuthError,
  clearOtpSent,
  requestOtp,
  verifyOtp,
} from "@/store/slices/authSlice";
import { homePathForActor, setSessionToken } from "@/lib/api";
import type { AuthActor } from "@shared/authActors";
import { FieldHelper } from "@/components/portal/FormHelpers";

const emailSchema = Yup.object({
  email: Yup.string().email().required(),
});

const otpSchema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/)
    .required(),
});

type OtpLoginFormProps = {
  actor: AuthActor;
  eyebrowKey: string;
  titleKey: string;
  subtitleKey: string;
  icon?: "lock" | "mail";
};

/** Shared OTP email → code → success flow. Pages own layout/branding. */
export default function OtpLoginForm({
  actor,
  eyebrowKey,
  titleKey,
  subtitleKey,
  icon = "lock",
}: OtpLoginFormProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { requestingOtp, verifyingOtp, error, otpSentTo, user, token } =
    useAppSelector((s) => s.auth);
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [resent, setResent] = useState(false);
  const otpSubmitLock = useRef(false);

  useEffect(() => {
    if (user && token) {
      if (user.actor !== actor) {
        setSessionToken(null, user.actor);
        return;
      }
      setStep("success");
      const timer = window.setTimeout(
        () => navigate(homePathForActor(actor)),
        900,
      );
      return () => window.clearTimeout(timer);
    }
  }, [user, token, navigate, actor]);

  useEffect(() => {
    if (otpSentTo) {
      setStep("otp");
      otpSubmitLock.current = false;
    }
  }, [otpSentTo]);

  const submitOtpCode = async (code: string) => {
    if (!/^\d{6}$/.test(code) || verifyingOtp || otpSubmitLock.current) return;
    otpSubmitLock.current = true;
    dispatch(clearAuthError());
    const result = await dispatch(
      verifyOtp({
        email: otpSentTo || emailForm.values.email,
        code,
      }),
    );
    if (verifyOtp.rejected.match(result)) {
      otpSubmitLock.current = false;
    }
  };

  const emailForm = useFormik({
    initialValues: { email: "" },
    validationSchema: emailSchema,
    onSubmit: async (values) => {
      dispatch(clearAuthError());
      await dispatch(requestOtp(values.email.trim()));
    },
  });

  const otpForm = useFormik({
    initialValues: { code: "" },
    validationSchema: otpSchema,
    onSubmit: async (values) => {
      await submitOtpCode(values.code);
    },
  });

  const resendCode = async () => {
    const email = otpSentTo || emailForm.values.email;
    if (!email) return;
    setResent(true);
    otpSubmitLock.current = false;
    await dispatch(requestOtp(email));
    window.setTimeout(() => setResent(false), 3000);
  };

  const handleCodeChange = async (raw: string) => {
    const code = raw.replace(/\D/g, "").slice(0, 6);
    await otpForm.setFieldValue("code", code, true);
    if (code.length === 6) {
      await submitOtpCode(code);
    }
  };

  const errorMessage =
    error === "account_not_found"
      ? t("auth.accountNotFound")
      : error === "account_inactive"
        ? t("auth.accountInactive")
        : error === "login_not_allowed"
          ? t("auth.loginNotAllowed")
          : error === "rate_limited"
            ? t("auth.rateLimited")
            : error === "request_failed" ||
                error === "Could not send verification email. Please try again."
              ? t("auth.requestFailed")
              : error === "verify_failed" || error === "Invalid or expired code"
                ? t("auth.verifyFailed")
                : error === "Account is not active"
                  ? t("auth.accountInactive")
                  : error
                    ? t("auth.verifyFailed")
                    : null;

  const Icon = icon === "mail" ? Mail : LockKeyhole;

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
      {step === "email" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
            <Icon size={21} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            {t(eyebrowKey)}
          </p>
          <h2 className="mt-3 font-[Manrope] text-4xl font-semibold tracking-[-.06em] text-foreground sm:text-5xl">
            {t(titleKey)}
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            {t(subtitleKey)}
          </p>
          <form onSubmit={emailForm.handleSubmit} className="mt-10">
            <label className="text-xs font-semibold text-foreground/80">
              {t("auth.emailLabel")}
              <div className="relative mt-2">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={17}
                />
                <input
                  autoFocus
                  type="email"
                  name="email"
                  value={emailForm.values.email}
                  onChange={emailForm.handleChange}
                  onBlur={emailForm.handleBlur}
                  placeholder={t("auth.emailPlaceholder")}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-accent focus:ring-4 focus:ring-ring/20"
                />
              </div>
              <FieldHelper>{t("help.auth.email")}</FieldHelper>
            </label>
            {emailForm.touched.email && emailForm.errors.email ? (
              <p className="mt-2 text-xs text-destructive">
                {t("auth.invalidEmail")}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
            ) : null}
            <button
              type="submit"
              disabled={requestingOtp || !emailForm.isValid}
              className="mt-4 h-14 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
            >
              {requestingOtp ? (
                <RefreshCw className="mx-auto animate-spin" size={18} />
              ) : (
                <>
                  {t("auth.continueWithEmail")}{" "}
                  <ArrowRight className="ml-2 inline" size={16} />
                </>
              )}
            </button>
          </form>
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck size={14} className="text-accent" />{" "}
            {t("auth.secureNote")}
          </div>
        </motion.div>
      )}

      {step === "otp" && (
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            type="button"
            onClick={() => {
              dispatch(clearOtpSent());
              dispatch(clearAuthError());
              setStep("email");
            }}
            className="mb-10 flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft size={14} /> {t("auth.changeEmail")}
          </button>
          <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
            <Mail size={21} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            {t("auth.checkInbox")}
          </p>
          <h2 className="mt-3 font-[Manrope] text-4xl font-semibold tracking-[-.06em] text-foreground">
            {t("auth.otpTitle")}
          </h2>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {t("auth.otpSubtitle")}{" "}
            <strong className="font-semibold text-foreground">
              {otpSentTo || emailForm.values.email}
            </strong>
            .
          </p>
          <form onSubmit={otpForm.handleSubmit} className="mt-10">
            <label className="text-xs font-semibold text-foreground/80">
              {t("auth.otpLabel")}
              <input
                autoFocus
                name="code"
                minLength={6}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpForm.values.code}
                onChange={(event) => {
                  void handleCodeChange(event.target.value);
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text");
                  if (pasted) {
                    event.preventDefault();
                    void handleCodeChange(pasted);
                  }
                }}
                onBlur={otpForm.handleBlur}
                placeholder="000000"
                className="mt-2 h-16 w-full rounded-xl border border-input bg-card text-center text-2xl font-semibold tracking-[.5em] text-foreground outline-none transition placeholder:text-muted-foreground/30 focus:border-accent focus:ring-4 focus:ring-ring/20"
              />
              <FieldHelper>{t("help.auth.code")}</FieldHelper>
            </label>
            {otpForm.touched.code && otpForm.errors.code ? (
              <p className="mt-2 text-xs text-destructive">
                {t("auth.invalidCode")}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
            ) : null}
            <button
              type="submit"
              disabled={verifyingOtp || otpForm.values.code.length !== 6}
              className="mt-4 h-14 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-70"
            >
              {verifyingOtp ? (
                <RefreshCw className="mx-auto animate-spin" size={18} />
              ) : (
                <>
                  {t("auth.verifyCode")}{" "}
                  <ArrowRight className="ml-2 inline" size={16} />
                </>
              )}
            </button>
          </form>
          <p className="mt-7 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={resendCode}
              className="font-semibold text-primary hover:underline"
            >
              {resent ? t("auth.codeResent") : t("auth.resendCode")}
            </button>
          </p>
        </motion.div>
      )}

      {step === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-accent">
            <CheckCircle2 size={31} />
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.2em] text-accent">
            {t("auth.identityConfirmed")}
          </p>
          <h2 className="mt-3 font-[Manrope] text-4xl font-semibold tracking-[-.06em] text-foreground">
            {t("auth.successTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("auth.successSubtitle")}
          </p>
        </motion.div>
      )}
    </div>
  );
}
