import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Fingerprint,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MetaHelmet from "@/components/MetaHelmet";

function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#0b4ea2]">
      <span className="h-4 w-4 rotate-45 border-[3px] border-current" />
    </span>
  );
}

function LoginVisual() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#09172b] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="login-glow absolute -left-40 top-[-12%] h-[620px] w-[620px] rounded-full bg-[#2979ff]/25 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[100px]" />
      <div className="relative z-10 flex items-center gap-3 text-white">
        <BrandMark />
        <span className="text-[15px] font-extrabold tracking-[.28em]">
          DELACHE
        </span>
      </div>
      <div className="relative z-10 max-w-xl py-12">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#82b5ff]">
          <span className="h-2 w-2 rounded-full bg-[#55d7b0] shadow-[0_0_0_5px_rgba(85,215,176,.12)]" />{" "}
          Plataforma privada
        </div>
        <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-.065em] text-white xl:text-7xl">
          La precisión
          <br />
          también se <span className="text-[#72a6ff]">protege.</span>
        </h1>
        <p className="mt-7 max-w-md text-base leading-7 text-blue-100/55">
          Accede al centro de operaciones DELACHE y mantén cada expediente bajo
          control.
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
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#2979ff]">
                  <Fingerprint size={12} />
                </span>{" "}
                Resumen ejecutivo
              </div>
              <span className="text-[9px] text-emerald-300">● En vivo</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["48", "Activos"],
                ["126", "En proceso"],
                ["96%", "Trazabilidad"],
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
                    className="flex-1 rounded-t bg-gradient-to-t from-[#2979ff] to-[#79b4ff] opacity-70"
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
                  Evidencia validada
                </div>
                <div className="mt-1 text-[9px] text-white/35">
                  EXP-2418 · Hace 2 minutos
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-[10px] text-white/30">
        <span>© 2024 DELACHE</span>
        <span className="flex items-center gap-2">
          <ShieldCheck size={13} /> Acceso seguro y cifrado
        </span>
      </div>
    </div>
  );
}

export default function Login() {
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resent, setResent] = useState(false);

  const sendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    window.setTimeout(() => {
      setIsSending(false);
      setStep("otp");
    }, 650);
  };
  const verifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length === 6) setStep("success");
  };
  const resendCode = () => {
    setResent(true);
    window.setTimeout(() => setResent(false), 3000);
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <MetaHelmet
        title="Iniciar sesión"
        description="Accede al centro de operaciones DELACHE. Ingreso seguro con código de un solo uso."
        path="/login"
        noindex
      />
      <LoginVisual />
      <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <Link
            to="/"
            className="flex items-center gap-3 text-slate-900 lg:hidden"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b4ea2] text-white">
              <span className="h-3.5 w-3.5 rotate-45 border-2 border-current" />
            </span>
            <span className="text-sm font-extrabold tracking-[.24em]">
              DELACHE
            </span>
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#0b4ea2] lg:flex"
          >
            <ArrowLeft size={14} /> Volver al sitio
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          {step === "email" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0b4ea2]">
                <LockKeyhole size={21} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0b4ea2]">
                Portal privado
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-slate-900 sm:text-5xl">
                Bienvenido
                <br />a DELACHE.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">
                Ingresa con tu correo electrónico. Te enviaremos un código de
                acceso de un solo uso.
              </p>
              <form onSubmit={sendCode} className="mt-10">
                <label className="text-xs font-semibold text-slate-600">
                  Correo electrónico
                  <div className="relative mt-2">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      autoFocus
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nombre@empresa.com"
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#2979ff] focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </label>
                <button
                  disabled={isSending}
                  className="mt-4 h-14 w-full rounded-xl bg-[#0b4ea2] text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-[#083e82] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSending ? (
                    <RefreshCw className="mx-auto animate-spin" size={18} />
                  ) : (
                    <>
                      Continuar con correo{" "}
                      <ArrowRight className="ml-2 inline" size={16} />
                    </>
                  )}
                </button>
              </form>
              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" /> Sin
                contraseñas. Acceso cifrado y seguro.
              </div>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <button
                onClick={() => setStep("email")}
                className="mb-10 flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-[#0b4ea2]"
              >
                <ArrowLeft size={14} /> Cambiar correo
              </button>
              <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0b4ea2]">
                <Mail size={21} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0b4ea2]">
                Revisa tu bandeja
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-slate-900">
                Confirma tu
                <br />
                identidad.
              </h2>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                Enviamos un código de 6 dígitos a{" "}
                <strong className="font-semibold text-slate-700">
                  {email}
                </strong>
                .
              </p>
              <form onSubmit={verifyCode} className="mt-10">
                <label className="text-xs font-semibold text-slate-600">
                  Código de acceso
                  <input
                    autoFocus
                    required
                    minLength={6}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="mt-2 h-16 w-full rounded-xl border border-slate-200 bg-white text-center text-2xl font-semibold tracking-[.5em] text-slate-900 outline-none transition placeholder:text-slate-200 focus:border-[#2979ff] focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <button className="mt-4 h-14 w-full rounded-xl bg-[#0b4ea2] text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-[#083e82]">
                  Verificar código{" "}
                  <ArrowRight className="ml-2 inline" size={16} />
                </button>
              </form>
              <p className="mt-7 text-center text-xs text-slate-400">
                ¿No recibiste el código?{" "}
                <button
                  onClick={resendCode}
                  className="font-semibold text-[#0b4ea2] hover:underline"
                >
                  {resent ? "Código reenviado" : "Reenviar código"}
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
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
                <CheckCircle2 size={31} />
              </div>
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-600">
                Identidad confirmada
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-slate-900">
                Todo listo.
              </h2>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-slate-500">
                Tu acceso fue verificado correctamente. El centro de operaciones
                estará disponible en breve.
              </p>
              <button
                onClick={() => setStep("email")}
                className="mt-8 text-xs font-semibold text-[#0b4ea2]"
              >
                Volver al inicio de sesión
              </button>
            </motion.div>
          )}
        </div>
        <div className="flex items-center justify-end text-[10px] text-slate-400">
          <span>Privacidad · Términos</span>
        </div>
      </section>
    </main>
  );
}
