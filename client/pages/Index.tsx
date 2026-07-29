import { FormEvent, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  Globe2,
  Layers3,
  MapPin,
  Menu,
  MonitorSmartphone,
  MoveUpRight,
  Network,
  PanelTop,
  Play,
  Plus,
  Radar,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MetaHelmet from "@/components/MetaHelmet";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/siteMeta";

const services = [
  {
    icon: Zap,
    number: "01",
    title: "Peritajes Eléctricos",
    text: "Análisis técnico riguroso para transformar la evidencia en decisiones defendibles.",
  },
  {
    icon: FileCheck2,
    number: "02",
    title: "Dictámenes Técnicos",
    text: "Dictámenes claros, sólidos y respaldados por ingeniería especializada.",
  },
  {
    icon: Radar,
    number: "03",
    title: "Inspecciones Técnicas",
    text: "Levantamientos precisos en campo con evidencia georreferenciada.",
  },
  {
    icon: ClipboardCheck,
    number: "04",
    title: "Ratificaciones",
    text: "Acompañamiento experto para cada etapa del proceso judicial.",
  },
  {
    icon: Network,
    number: "05",
    title: "Asesoría Técnica",
    text: "Una segunda mirada estratégica para expedientes de alta complejidad.",
  },
  {
    icon: Route,
    number: "06",
    title: "Seguimiento Jurídico",
    text: "Visibilidad total entre equipos técnicos, jurídicos y administrativos.",
  },
];

const process = [
  "Recepción de la Demanda",
  "Asignación",
  "Elaboración del Cuestionario",
  "Revisión Jurídica",
  "Recepción Documental",
  "Protesta del Cargo",
  "Logística",
  "Inspección Técnica",
  "Dictamen",
  "Validación Jurídica",
  "Ratificación",
  "Gestión Administrativa del Cobro",
];

const capabilities = [
  ["Gestión de Expedientes", FileText],
  ["Gestión Documental", Layers3],
  ["Dashboard Ejecutivo", Gauge],
  ["Timeline Jurídico", Route],
  ["GPS & Google Maps", MapPin],
  ["Captura Fotográfica", MonitorSmartphone],
  ["Videos & Evidencias", Play],
  ["Reportes", PanelTop],
  ["Automatizaciones", Sparkles],
  ["Roles & Permisos", ShieldCheck],
  ["Alertas", Bell],
];

const scrollToSection = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Logo({ light = false }: { light?: boolean }) {
  return (
    <button
      onClick={() => scrollToSection("inicio")}
      className={`flex items-center gap-3 ${light ? "text-white" : "text-slate-950"}`}
      aria-label="DELACHE inicio"
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${light ? "bg-white text-[#0b4ea2]" : "bg-[#0b4ea2] text-white"}`}
      >
        <span className="h-4 w-4 rotate-45 border-[3px] border-current" />
      </span>
      <span className="text-[15px] font-extrabold tracking-[0.28em]">
        DELACHE
      </span>
    </button>
  );
}

function AppDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[610px] [perspective:1200px]">
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9 }}
        className="dashboard-shell relative overflow-hidden rounded-[26px] border border-white/15 bg-[#101c31] p-3 shadow-[0_35px_100px_rgba(2,12,35,.45)] sm:p-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3 text-white/50">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wide">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#2979ff]">
              <Fingerprint size={13} />
            </span>{" "}
            DELACHE OS
          </div>
          <div className="flex items-center gap-3">
            <Search size={14} />
            <Bell size={14} />
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-300 to-blue-600" />
          </div>
        </div>
        <div className="flex gap-3 pt-3">
          <div className="hidden w-28 shrink-0 space-y-2 rounded-xl bg-white/[.04] p-2 text-[8px] text-white/40 sm:block">
            <div className="mb-4 h-2 w-14 rounded bg-white/20" />
            {[
              "Resumen",
              "Expedientes",
              "Evidencias",
              "Dictámenes",
              "Reportes",
            ].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 ${i === 0 ? "bg-[#2979ff]/20 text-[#71a7ff]" : ""}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {item}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-white/40">
                  Martes, 24 de septiembre 2024
                </p>
                <p className="mt-1 text-sm font-semibold text-white sm:text-lg">
                  Buenos días, Alejandro
                </p>
              </div>
              <div className="rounded-lg border border-white/10 px-2 py-1 text-[8px] text-white/50">
                Este mes⌄
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["48", "Expedientes activos", "+12.5%"],
                ["126", "En proceso", "+8.2%"],
                ["96%", "Trazabilidad", "+2.4%"],
              ].map(([value, label, delta]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/[.055] p-2.5"
                >
                  <div className="text-sm font-semibold text-white sm:text-lg">
                    {value}
                  </div>
                  <div className="mt-1 text-[7px] text-white/40 sm:text-[8px]">
                    {label}
                  </div>
                  <div className="mt-2 text-[7px] text-emerald-400">
                    ↗ {delta}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
              <div className="rounded-xl border border-white/10 bg-white/[.055] p-3">
                <div className="flex justify-between text-[9px] text-white/60">
                  <span>Actividad de expedientes</span>
                  <span className="text-white/30">Últimos 6 meses</span>
                </div>
                <div className="mt-5 flex h-24 items-end gap-2 px-1">
                  {[38, 55, 44, 72, 60, 86, 68, 94, 76, 88, 73, 100].map(
                    (height, i) => (
                      <motion.span
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.4 + i * 0.04, duration: 0.5 }}
                        key={i}
                        className={`flex-1 rounded-t-sm ${i > 8 ? "bg-[#2979ff]" : "bg-[#2979ff]/30"}`}
                      />
                    ),
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[7px] text-white/25">
                  <span>ABR</span>
                  <span>MAY</span>
                  <span>JUN</span>
                  <span>JUL</span>
                  <span>AGO</span>
                  <span>SEP</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.055] p-3">
                <div className="text-[9px] text-white/60">Próximos hitos</div>
                <div className="mt-4 space-y-3">
                  {[
                    ["Inspección técnica", "EXP-2418", "blue"],
                    ["Validación jurídica", "EXP-2409", "violet"],
                    ["Ratificación", "EXP-2398", "green"],
                  ].map(([title, id, color]) => (
                    <div key={id} className="flex gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-${color}-400`}
                      />
                      <div>
                        <div className="text-[8px] text-white/70">{title}</div>
                        <div className="mt-0.5 text-[7px] text-white/30">
                          {id} · Mañana
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#2979ff]/20 bg-[#2979ff]/10 p-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2979ff]/20 text-[#71a7ff]">
                  <MapPin size={13} />
                </div>
                <div>
                  <div className="text-[8px] text-white/70">
                    Inspección en campo
                  </div>
                  <div className="text-[7px] text-white/35">
                    Monterrey, NL · En ruta
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[7px] text-emerald-300">
                En vivo
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="absolute -right-3 -top-5 hidden rounded-2xl border border-white/20 bg-white/10 p-3 text-white shadow-xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2 text-[9px]">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300">
            <Check size={13} />
          </span>
          <span>
            <b className="block text-[10px]">Evidencia validada</b>
            <small className="text-white/40">Hace 2 minutos</small>
          </span>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white shadow-xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2 text-[9px]">
          <span className="text-xl font-semibold">+95%</span>
          <span className="text-white/45">
            casos
            <br />
            atendidos
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };
  const navItems = [
    ["Servicios", "servicios"],
    ["Plataforma", "plataforma"],
    ["Proceso", "proceso"],
    ["Nosotros", "nosotros"],
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#fafbfc] text-[#111827]">
      <MetaHelmet
        title="Peritajes eléctricos de precisión"
        description="Transformamos el proceso de los peritajes eléctricos con ingeniería especializada, procesos judiciales estandarizados y tecnología propia. Precisión, trazabilidad y certeza."
        keywords={[
          "DELACHE",
          "peritajes eléctricos",
          "dictámenes técnicos",
          "inspecciones técnicas",
          "ratificaciones",
          "asesoría técnica",
          "plataforma peritajes",
          "México",
        ]}
        path="/"
        jsonLd={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]}
      />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-500 lg:flex">
            {navItems.map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="transition hover:text-[#0b4ea2]"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0b4ea2] sm:block"
            >
              Iniciar sesión
            </Link>
            <button
              onClick={() => scrollToSection("contacto")}
              className="hidden rounded-full bg-[#0b4ea2] px-5 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-[#083e82] sm:block"
            >
              Solicitar asesoría{" "}
              <ArrowUpRight className="ml-1 inline" size={14} />
            </button>
            <button
              className="rounded-lg p-2 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 lg:hidden">
            {navItems.map(([label, id]) => (
              <button
                key={id}
                onClick={() => {
                  scrollToSection(id);
                  setMobileOpen(false);
                }}
                className="block w-full py-3 text-left text-sm text-slate-600"
              >
                {label}
              </button>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700"
            >
              Iniciar sesión
            </Link>
            <button
              onClick={() => {
                scrollToSection("contacto");
                setMobileOpen(false);
              }}
              className="mt-2 w-full rounded-xl bg-[#0b4ea2] py-3 text-sm font-semibold text-white"
            >
              Solicitar asesoría
            </button>
          </div>
        )}
      </header>

      <main id="inicio">
        <section className="hero-grid relative isolate min-h-[760px] overflow-hidden bg-[#f5f8fc] pt-32 lg:min-h-[850px] lg:pt-40">
          <div className="hero-orb absolute -right-40 top-12 -z-10 h-[540px] w-[540px] rounded-full bg-blue-200/40 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:pb-36">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#0b4ea2]">
                <span className="h-2 w-2 rounded-full bg-[#2979ff] shadow-[0_0_0_5px_rgba(41,121,255,.12)]" />{" "}
                Ingeniería + Tecnología
              </div>
              <h1 className="max-w-[680px] text-[clamp(3.6rem,7vw,6.5rem)] font-semibold leading-[.94] tracking-[-.075em] text-[#0e1b31]">
                Peritajes
                <br />
                <span className="hero-gradient">de precisión.</span>
              </h1>
              <p className="mt-8 max-w-[500px] text-base leading-7 text-slate-500 sm:text-lg">
                Transformamos el proceso de los peritajes eléctricos con
                ingeniería especializada, procesos judiciales estandarizados y
                tecnología propia.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => scrollToSection("contacto")}
                  className="group rounded-full bg-[#0b4ea2] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/20 transition hover:-translate-y-1 hover:bg-[#083e82]"
                >
                  Solicitar asesoría{" "}
                  <ArrowRight
                    className="ml-2 inline transition group-hover:translate-x-1"
                    size={16}
                  />
                </button>
                <button
                  onClick={() => scrollToSection("plataforma")}
                  className="group flex items-center gap-2 px-2 py-3 text-sm font-semibold text-[#0b4ea2]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-blue-200 bg-white transition group-hover:bg-blue-50">
                    <Play size={13} fill="currentColor" />
                  </span>{" "}
                  Explorar la plataforma
                </button>
              </div>
              <div className="mt-12 flex items-center gap-7 border-t border-slate-200 pt-6">
                <div>
                  <div className="text-xl font-bold text-slate-900">+500</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                    Expedientes
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <div className="text-xl font-bold text-slate-900">20+</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                    Años de experiencia
                  </div>
                </div>
              </div>
            </motion.div>
            <AppDashboard />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#fafbfc] to-transparent" />
        </section>

        <section className="border-b border-slate-100 bg-white py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">
              La confianza de quienes exigen certeza
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-semibold text-slate-300 sm:gap-x-12">
              <span>DESPACHOS JURÍDICOS</span>
              <span>INDUSTRIA</span>
              <span>INSTITUCIONES</span>
              <span>GOBIERNO</span>
            </div>
          </div>
        </section>

        <section id="servicios" className="section-space">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="eyebrow">Qué hacemos</p>
              <h2 className="section-title">
                Ingeniería que
                <br />
                <span className="hero-gradient">respalda decisiones.</span>
              </h2>
              <p className="section-copy">
                Combinamos rigor técnico y visión estratégica para resolver los
                retos eléctricos más complejos del ámbito judicial.
              </p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map(({ icon: Icon, number, title, text }, index) => (
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                  key={title}
                  className={`service-card group ${index === 0 ? "border-[#2979ff]/30 bg-[#f2f7ff]" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="icon-box">
                      <Icon size={20} />
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {number}
                    </span>
                  </div>
                  <h3 className="mt-12 text-xl font-semibold tracking-tight text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {text}
                  </p>
                  <div className="mt-7 flex items-center text-xs font-semibold text-[#0b4ea2] opacity-0 transition group-hover:opacity-100">
                    Conocer servicio <ArrowUpRight className="ml-1" size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="plataforma"
          className="platform-section relative overflow-hidden bg-[#0d1a2e] py-24 text-white sm:py-32"
        >
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(41,121,255,.2),transparent_55%)]" />
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid items-end gap-10 lg:grid-cols-[.85fr_1.15fr]">
              <div>
                <p className="eyebrow text-[#72a6ff]">
                  DELACHE OS · Plataforma propia
                </p>
                <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-6xl">
                  La tecnología que impulsa cada{" "}
                  <span className="text-[#72a6ff]">peritaje.</span>
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50 lg:pb-2">
                Una plataforma desarrollada específicamente para administrar
                todo el ciclo de vida de un peritaje eléctrico. Un solo lugar.
                Cero puntos ciegos.
              </p>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div className="platform-window rounded-[24px] border border-white/10 bg-white/[.045] p-3 shadow-2xl sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#2979ff]">
                      <PanelTop size={14} />
                    </span>{" "}
                    Centro de operaciones
                  </div>
                  <div className="flex gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-red-400/70" />
                    <i className="h-2 w-2 rounded-full bg-yellow-400/70" />
                    <i className="h-2 w-2 rounded-full bg-green-400/70" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/[.07] p-4 sm:row-span-2">
                    <div className="text-[10px] text-white/40">
                      Mapa de inspecciones
                    </div>
                    <div className="map-art relative mt-4 h-44 overflow-hidden rounded-lg">
                      <div className="absolute left-[31%] top-[32%] animate-pulse rounded-full bg-blue-400 p-1.5 shadow-[0_0_0_7px_rgba(41,121,255,.16)]">
                        <MapPin size={12} />
                      </div>
                      <div className="absolute left-[62%] top-[56%] rounded-full bg-blue-400 p-1.5 shadow-[0_0_0_7px_rgba(41,121,255,.16)]">
                        <MapPin size={12} />
                      </div>
                      <div className="absolute left-[45%] top-[72%] rounded-full bg-emerald-400 p-1.5" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[9px] text-white/40">
                      <span>24 ubicaciones</span>
                      <span className="text-emerald-300">● En tiempo real</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[.07] p-4">
                    <div className="flex justify-between text-[10px] text-white/45">
                      <span>Actividad reciente</span>
                      <Bell size={12} />
                    </div>
                    <div className="mt-4 h-14 flex items-end gap-1.5">
                      {[28, 45, 31, 55, 39, 70, 47, 60, 82, 64, 77, 91].map(
                        (h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h}%` }}
                            className="flex-1 rounded-t bg-gradient-to-t from-[#2979ff] to-[#62b0ff] opacity-70"
                          />
                        ),
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[.07] p-4">
                    <div className="text-[10px] text-white/45">
                      Estado de expedientes
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="relative h-14 w-14 rounded-full border-[7px] border-[#2979ff] border-r-white/10 border-b-white/10">
                        <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold">
                          76%
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[9px] text-white/45">
                        <div>
                          <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#2979ff]" />{" "}
                          En proceso <b className="ml-2 text-white">38</b>
                        </div>
                        <div>
                          <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white/20" />{" "}
                          Cerrados <b className="ml-2 text-white">10</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid content-center gap-3 sm:grid-cols-2">
                {capabilities.map(([label, Icon], index) => {
                  const CapabilityIcon = Icon as typeof FileText;
                  return (
                    <motion.div
                      whileHover={{ x: 5 }}
                      key={label as string}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3.5 transition hover:border-[#2979ff]/40 hover:bg-[#2979ff]/10"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.07] text-[#72a6ff]">
                        <CapabilityIcon size={15} />
                      </span>
                      <span className="text-xs text-white/70">
                        {label as string}
                      </span>
                      <Check className="ml-auto text-emerald-400" size={14} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="proceso" className="section-space bg-white">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="eyebrow">Un proceso, sin puntos ciegos</p>
                <h2 className="section-title">
                  Del primer documento
                  <br />
                  al <span className="hero-gradient">dictamen final.</span>
                </h2>
              </div>
              <p className="section-copy lg:max-w-sm">
                Cada etapa está diseñada para proteger la integridad técnica y
                jurídica de tu expediente.
              </p>
            </div>
            <div className="relative mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {process.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  key={item}
                  className="process-step group"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#0b4ea2] text-white" : "bg-[#edf4ff] text-[#0b4ea2]"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-slate-100 group-last:hidden" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {item}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {index < 4
                      ? "Trazabilidad y control desde el inicio."
                      : "Coordinación precisa entre equipos."}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="nosotros" className="section-space">
          <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10">
            <div className="about-art relative min-h-[440px] overflow-hidden rounded-[28px] bg-[#eaf2fc] p-8">
              <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-blue-200/50 blur-2xl" />
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white bg-white/70 p-5 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Filosofía DELACHE
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      La precisión no es un resultado.
                      <br />
                      Es el estándar.
                    </p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b4ea2] text-white">
                    <Sparkles size={18} />
                  </span>
                </div>
              </div>
              <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
                <div className="grid h-48 w-48 place-items-center rounded-full border border-blue-300/50 bg-white/40 shadow-[0_0_0_24px_rgba(255,255,255,.25),0_0_0_48px_rgba(176,208,244,.18)]">
                  <div className="grid h-24 w-24 place-items-center rounded-3xl bg-[#0b4ea2] text-white shadow-2xl shadow-blue-900/30">
                    <span className="h-10 w-10 rotate-45 border-[5px] border-white" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="eyebrow">Por qué DELACHE</p>
              <h2 className="section-title">
                La ingeniería
                <br />
                que <span className="hero-gradient">da certeza.</span>
              </h2>
              <p className="section-copy">
                No solo entregamos un dictamen. Construimos la trazabilidad que
                permite defenderlo con confianza.
              </p>
              <div className="mt-10 grid gap-x-6 gap-y-7 sm:grid-cols-2">
                {[
                  "Ingeniería especializada",
                  "Tecnología propia",
                  "Cobertura nacional",
                  "Procesos digitales",
                  "Máxima precisión",
                  "Equipo multidisciplinario",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-[#0b4ea2]">
                      <CircleCheck size={15} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        {item}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Expertos alineados a tu objetivo.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="bg-[#0b4ea2] py-24 text-white sm:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:px-10">
            <div>
              <p className="eyebrow text-blue-200">
                Hablemos de tu próximo caso
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-6xl">
                La certeza empieza con una conversación.
              </h2>
              <p className="mt-7 max-w-md text-sm leading-7 text-blue-100/70">
                Cuéntanos brevemente sobre tu proyecto. Nuestro equipo se pondrá
                en contacto contigo.
              </p>
              <div className="mt-10 space-y-4 text-sm text-blue-100/80">
                <div className="flex items-center gap-3">
                  <Globe2 size={16} /> Ciudad de México · Cobertura nacional
                </div>
                <div className="flex items-center gap-3">
                  <FileText size={16} /> contacto@delache.com.mx
                </div>
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="rounded-[24px] bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
              {sent ? (
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold">
                    Solicitud recibida
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Gracias por contactarnos. Un especialista DELACHE te
                    escribirá pronto.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-6 text-sm font-semibold text-[#0b4ea2]"
                  >
                    Enviar otra solicitud
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0b4ea2]">
                      Solicitar asesoría
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                      Cuéntanos qué necesitas.
                    </h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-500">
                      Nombre
                      <input
                        required
                        className="contact-input"
                        placeholder="Tu nombre"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Empresa
                      <input
                        required
                        className="contact-input"
                        placeholder="Nombre de empresa"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block text-xs font-medium text-slate-500">
                    Email
                    <input
                      required
                      type="email"
                      className="contact-input"
                      placeholder="nombre@empresa.com"
                    />
                  </label>
                  <label className="mt-4 block text-xs font-medium text-slate-500">
                    ¿Cómo podemos ayudarte?
                    <textarea
                      required
                      rows={3}
                      className="contact-input resize-none"
                      placeholder="Cuéntanos sobre tu caso..."
                    />
                  </label>
                  <button className="mt-5 w-full rounded-xl bg-[#0b4ea2] py-3.5 text-sm font-semibold text-white transition hover:bg-[#083e82]">
                    Enviar solicitud{" "}
                    <ArrowRight className="ml-2 inline" size={16} />
                  </button>
                </>
              )}
            </form>
          </div>
        </section>
      </main>
      <footer className="bg-[#081426] py-12 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-8 border-b border-white/10 pb-10 sm:flex-row sm:items-center">
            <Logo light />
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
              {navItems.map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="transition hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 pt-6 text-[10px] text-white/30 sm:flex-row">
            <span>© 2024 DELACHE. Ingeniería de precisión.</span>
            <span>Privacidad · Términos · Hecho para la certeza.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
