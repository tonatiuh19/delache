/**
 * DELACHE transactional email templates.
 * Strategy mirrors athlete-hub (shared shell + i18n strings + builders)
 * and optimum-credit (table layout, preheader, CTA button).
 */

import type { AppLocale } from "../shared/i18n";
import type { AuthActor } from "../shared/authActors";

export const EMAIL_BRAND = {
  bg: "#eef2f8",
  surface: "#ffffff",
  header: "#0b1b33",
  primary: "#0b4ea2",
  accent: "#2979ff",
  text: "#0e1b31",
  muted: "#475569",
  dim: "#64748b",
  border: "#dbe3f0",
  codeBg: "#f1f5f9",
  success: "#15803d",
  successBg: "#f0fdf4",
  warn: "#b45309",
  warnBg: "#fffbeb",
  fontFamily:
    "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

type EmailTemplateKind =
  | "otp"
  | "inviteStaff"
  | "inviteClient"
  | "assignment"
  | "caseStatus"
  | "reportDelivered"
  | "newCaseIntake";

type EmailStrings = {
  subjects: Record<EmailTemplateKind, string>;
  footer: {
    tagline: string;
    help: string;
    copyright: string;
  };
  otp: {
    preheader: string;
    title: string;
    greeting: string;
    introStaff: string;
    introClient: string;
    expiry: string;
    security: string;
  };
  inviteStaff: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    roleLabel: string;
    steps: [string, string, string];
    cta: string;
  };
  inviteClient: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    firmLabel: string;
    steps: [string, string, string];
    cta: string;
  };
  assignment: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    roleLabel: string;
    cta: string;
  };
  caseStatus: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    fromLabel: string;
    toLabel: string;
    cta: string;
  };
  reportDelivered: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    cta: string;
  };
  newCaseIntake: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    titleLabel: string;
    cta: string;
  };
};

const EMAIL_STRINGS_ES: EmailStrings = {
  subjects: {
    otp: "{{code}} es tu código de acceso DELACHE",
    inviteStaff: "Te invitaron al portal DELACHE",
    inviteClient: "Acceso al portal de despachos DELACHE",
    assignment: "Nueva asignación · {{caseNumber}}",
    caseStatus: "Actualización de expediente · {{caseNumber}}",
    reportDelivered: "Dictamen disponible · {{caseNumber}}",
    newCaseIntake: "Nuevo expediente · {{caseNumber}}",
  },
  footer: {
    tagline: "Precisión pericial, trazabilidad total.",
    help: "¿Necesitas ayuda? Responde este correo o escribe a tu contacto DELACHE.",
    copyright: "© {{year}} DELACHE. Todos los derechos reservados.",
  },
  otp: {
    preheader: "Tu código expira en {{minutes}} minutos",
    title: "Código de acceso",
    greeting: "Hola {{name}},",
    introStaff: "Usa este código para entrar al portal interno DELACHE:",
    introClient: "Usa este código para entrar al portal de despachos DELACHE:",
    expiry: "Expira en {{minutes}} minutos. No lo compartas con nadie.",
    security:
      "Si no solicitaste este código, ignora este correo de forma segura.",
  },
  inviteStaff: {
    preheader: "Tu acceso al centro de operaciones está listo",
    title: "Bienvenido al equipo DELACHE",
    greeting: "Hola {{name}},",
    intro:
      "Te invitaron a colaborar en el centro de operaciones DELACHE. Inicia sesión con tu correo — sin contraseña, solo un código de un solo uso.",
    roleLabel: "Rol",
    steps: [
      "Abre el portal interno",
      "Ingresa con tu correo institucional",
      "Confirma el código que te enviaremos",
    ],
    cta: "Abrir portal interno",
  },
  inviteClient: {
    preheader: "Tu despacho ya puede dar seguimiento a expedientes",
    title: "Acceso al portal de despachos",
    greeting: "Hola {{name}},",
    intro:
      "DELACHE te habilitó acceso externo para consultar expedientes, notas compartidas y dictámenes. Entra con tu correo — te enviaremos un código de un solo uso.",
    firmLabel: "Despacho",
    steps: [
      "Abre el portal de despachos",
      "Ingresa con el correo de esta invitación",
      "Confirma el código OTP",
    ],
    cta: "Abrir portal de despachos",
  },
  assignment: {
    preheader: "Te asignaron un expediente",
    title: "Nueva asignación",
    greeting: "Hola {{name}},",
    intro: "Te asignaron al expediente siguiente. Entra al portal para revisar el detalle.",
    caseLabel: "Expediente",
    roleLabel: "Asignación",
    cta: "Ver expediente",
  },
  caseStatus: {
    preheader: "El expediente cambió de etapa",
    title: "Actualización de expediente",
    greeting: "Hola {{name}},",
    intro: "El estatus del expediente se actualizó.",
    caseLabel: "Expediente",
    fromLabel: "Anterior",
    toLabel: "Nuevo",
    cta: "Ver expediente",
  },
  reportDelivered: {
    preheader: "Hay un dictamen listo para revisar",
    title: "Dictamen disponible",
    greeting: "Hola {{name}},",
    intro:
      "DELACHE entregó un dictamen técnico en tu expediente. Puedes consultarlo en el portal de despachos.",
    caseLabel: "Expediente",
    cta: "Ver dictamen",
  },
  newCaseIntake: {
    preheader: "Un despacho envió un expediente nuevo",
    title: "Nuevo expediente recibido",
    greeting: "Hola {{name}},",
    intro: "Un despacho envió un expediente nuevo al intake.",
    caseLabel: "Expediente",
    titleLabel: "Título",
    cta: "Abrir expediente",
  },
};

const EMAIL_STRINGS_EN: EmailStrings = {
  subjects: {
    otp: "{{code}} is your DELACHE access code",
    inviteStaff: "You're invited to the DELACHE portal",
    inviteClient: "DELACHE law firm portal access",
    assignment: "New assignment · {{caseNumber}}",
    caseStatus: "Case update · {{caseNumber}}",
    reportDelivered: "Report available · {{caseNumber}}",
    newCaseIntake: "New case · {{caseNumber}}",
  },
  footer: {
    tagline: "Expert precision, full traceability.",
    help: "Need help? Reply to this email or contact your DELACHE liaison.",
    copyright: "© {{year}} DELACHE. All rights reserved.",
  },
  otp: {
    preheader: "Your code expires in {{minutes}} minutes",
    title: "Access code",
    greeting: "Hi {{name}},",
    introStaff: "Use this code to sign in to the DELACHE internal portal:",
    introClient: "Use this code to sign in to the DELACHE law firm portal:",
    expiry: "Expires in {{minutes}} minutes. Do not share it with anyone.",
    security: "If you did not request this code, you can safely ignore this email.",
  },
  inviteStaff: {
    preheader: "Your operations center access is ready",
    title: "Welcome to the DELACHE team",
    greeting: "Hi {{name}},",
    intro:
      "You've been invited to collaborate in the DELACHE operations center. Sign in with your email — no password, just a one-time code.",
    roleLabel: "Role",
    steps: [
      "Open the internal portal",
      "Sign in with your work email",
      "Confirm the code we send you",
    ],
    cta: "Open internal portal",
  },
  inviteClient: {
    preheader: "Your firm can now track cases",
    title: "Law firm portal access",
    greeting: "Hi {{name}},",
    intro:
      "DELACHE enabled external access so you can review cases, shared notes, and reports. Sign in with your email — we'll send a one-time code.",
    firmLabel: "Firm",
    steps: [
      "Open the law firm portal",
      "Sign in with this invitation email",
      "Confirm the OTP code",
    ],
    cta: "Open law firm portal",
  },
  assignment: {
    preheader: "You were assigned to a case",
    title: "New assignment",
    greeting: "Hi {{name}},",
    intro: "You were assigned to the following case. Open the portal to review details.",
    caseLabel: "Case",
    roleLabel: "Assignment",
    cta: "View case",
  },
  caseStatus: {
    preheader: "A case moved to a new stage",
    title: "Case update",
    greeting: "Hi {{name}},",
    intro: "The case status was updated.",
    caseLabel: "Case",
    fromLabel: "Previous",
    toLabel: "New",
    cta: "View case",
  },
  reportDelivered: {
    preheader: "A technical report is ready to review",
    title: "Report available",
    greeting: "Hi {{name}},",
    intro:
      "DELACHE delivered a technical report on your case. You can review it in the law firm portal.",
    caseLabel: "Case",
    cta: "View report",
  },
  newCaseIntake: {
    preheader: "A law firm submitted a new case",
    title: "New case received",
    greeting: "Hi {{name}},",
    intro: "A law firm submitted a new case into intake.",
    caseLabel: "Case",
    titleLabel: "Title",
    cta: "Open case",
  },
};

const EMAIL_STRINGS: Record<AppLocale, EmailStrings> = {
  es: EMAIL_STRINGS_ES,
  en: EMAIL_STRINGS_EN,
};

export function emailStrings(locale: AppLocale): EmailStrings {
  return EMAIL_STRINGS[locale] ?? EMAIL_STRINGS.es;
}

export function interpolateEmail(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandMarkHtml(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td width="36" height="36" align="center" valign="middle" bgcolor="${EMAIL_BRAND.accent}" style="width:36px;height:36px;border-radius:10px;background:${EMAIL_BRAND.accent};">
      <span style="display:inline-block;width:12px;height:12px;border:2.5px solid #fff;transform:rotate(45deg);"></span>
    </td>
    <td style="padding-left:12px;font-size:18px;font-weight:800;letter-spacing:0.18em;color:#fff;font-family:${EMAIL_BRAND.fontFamily};">DELACHE</td>
  </tr>
</table>`;
}

function emailButton(url: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" bgcolor="${EMAIL_BRAND.accent}" style="border-radius:12px;background:linear-gradient(135deg,${EMAIL_BRAND.accent} 0%,${EMAIL_BRAND.primary} 100%);">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;font-family:${EMAIL_BRAND.fontFamily};">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function otpCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td align="center" style="padding:8px 0 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.codeBg}" style="border:2px solid ${EMAIL_BRAND.primary};border-radius:14px;background:${EMAIL_BRAND.codeBg};">
        <tr>
          <td align="center" style="padding:20px 32px;font-size:34px;font-weight:800;font-family:ui-monospace,'SF Mono',Consolas,monospace;color:${EMAIL_BRAND.primary};letter-spacing:0.14em;line-height:1.2;">${escapeHtml(code)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function stepsList(steps: string[]): string {
  const rows = steps
    .map(
      (step, i) => `<tr>
      <td width="28" valign="top" style="padding:6px 0;font-size:13px;font-weight:800;color:${EMAIL_BRAND.accent};">${i + 1}.</td>
      <td valign="top" style="padding:6px 0;font-size:14px;color:${EMAIL_BRAND.muted};line-height:1.5;">${escapeHtml(step)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 8px;">${rows}</table>`;
}

function metaCard(rows: Array<{ label: string; value: string }>): string {
  const body = rows
    .map(
      (r, i) => `<tr>
      <td style="padding:10px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${EMAIL_BRAND.border};` : ""}">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_BRAND.dim};">${escapeHtml(r.label)}</div>
        <div style="margin-top:4px;font-size:15px;font-weight:700;color:${EMAIL_BRAND.text};">${escapeHtml(r.value)}</div>
      </td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;padding:4px 16px;background:${EMAIL_BRAND.codeBg};border-radius:12px;border:1px solid ${EMAIL_BRAND.border};">
    <tr><td style="padding:8px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${body}</table>
    </td></tr>
  </table>`;
}

interface BaseEmailOptions {
  locale: AppLocale;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  appUrl: string;
}

export function emailShell(opts: BaseEmailOptions): string {
  const { locale, preheader, title, bodyHtml, cta, appUrl } = opts;
  const s = emailStrings(locale);
  const year = new Date().getFullYear();
  const ctaBlock = cta
    ? `<tr><td align="center" style="padding:0 32px 8px;">${emailButton(cta.url, cta.label)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale === "es" ? "es-MX" : "en"}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${escapeHtml(title)}</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
  <style type="text/css">
    body, table, td { margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content, .email-header, .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.bg};font-family:${EMAIL_BRAND.fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:${EMAIL_BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.bg}">
    <tr>
      <td align="center" valign="top" style="padding:36px 16px;">
        <table role="presentation" class="email-container" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.surface}" style="width:560px;max-width:560px;border-radius:16px;border:1px solid ${EMAIL_BRAND.border};overflow:hidden;box-shadow:0 10px 30px rgba(11,30,61,0.06);">
          <tr>
            <td class="email-header" bgcolor="${EMAIL_BRAND.header}" style="padding:28px 32px 22px;background:${EMAIL_BRAND.header};border-bottom:3px solid ${EMAIL_BRAND.accent};">
              ${brandMarkHtml()}
              <h1 style="margin:18px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:28px 32px;font-size:16px;line-height:1.65;color:${EMAIL_BRAND.text};">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td class="email-footer" style="padding:22px 32px 28px;border-top:1px solid ${EMAIL_BRAND.border};background:#f8fafc;">
              <p style="margin:0 0 8px;font-size:13px;color:${EMAIL_BRAND.primary};font-weight:700;">${escapeHtml(s.footer.tagline)}</p>
              <p style="margin:0 0 14px;font-size:12px;color:${EMAIL_BRAND.dim};line-height:1.5;">${escapeHtml(s.footer.help)}</p>
              <p style="margin:0;font-size:11px;color:${EMAIL_BRAND.muted};">${escapeHtml(interpolateEmail(s.footer.copyright, { year }))}</p>
              <p style="margin:10px 0 0;font-size:11px;"><a href="${escapeHtml(appUrl)}" style="color:${EMAIL_BRAND.accent};text-decoration:none;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOtpEmail(opts: {
  locale: AppLocale;
  firstName: string;
  code: string;
  portal: AuthActor;
  minutes?: number;
  appUrl: string;
}): EmailPayload {
  const minutes = opts.minutes ?? 10;
  const s = emailStrings(opts.locale);
  const intro =
    opts.portal === "law_firm" ? s.otp.introClient : s.otp.introStaff;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;color:${EMAIL_BRAND.text};">${escapeHtml(interpolateEmail(s.otp.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(intro)}</p>
    ${otpCodeBlock(opts.code)}
    <p style="margin:16px 0 0;text-align:center;font-size:13px;color:${EMAIL_BRAND.dim};">${escapeHtml(interpolateEmail(s.otp.expiry, { minutes }))}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
      <tr>
        <td style="padding:14px 16px;background:${EMAIL_BRAND.warnBg};border-radius:10px;border-left:3px solid ${EMAIL_BRAND.warn};font-size:13px;color:${EMAIL_BRAND.muted};line-height:1.5;">${escapeHtml(s.otp.security)}</td>
      </tr>
    </table>`;

  return {
    subject: interpolateEmail(s.subjects.otp, { code: opts.code }),
    html: emailShell({
      locale: opts.locale,
      preheader: interpolateEmail(s.otp.preheader, { minutes }),
      title: s.otp.title,
      bodyHtml,
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.otp.greeting, { name: opts.firstName })}\n\n${intro}\n\n${opts.code}\n\n${interpolateEmail(s.otp.expiry, { minutes })}\n\n${opts.appUrl}`,
  };
}

export function buildInviteStaffEmail(opts: {
  locale: AppLocale;
  firstName: string;
  roleLabel: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const loginUrl = `${opts.appUrl.replace(/\/$/, "")}/portal/login`;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.inviteStaff.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.inviteStaff.intro)}</p>
    ${metaCard([{ label: s.inviteStaff.roleLabel, value: opts.roleLabel }])}
    ${stepsList([...s.inviteStaff.steps])}`;

  return {
    subject: s.subjects.inviteStaff,
    html: emailShell({
      locale: opts.locale,
      preheader: s.inviteStaff.preheader,
      title: s.inviteStaff.title,
      bodyHtml,
      cta: { label: s.inviteStaff.cta, url: loginUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.inviteStaff.greeting, { name: opts.firstName })}\n\n${s.inviteStaff.intro}\n\n${s.inviteStaff.roleLabel}: ${opts.roleLabel}\n\n${loginUrl}`,
  };
}

export function buildInviteClientEmail(opts: {
  locale: AppLocale;
  firstName: string;
  firmName?: string | null;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const loginUrl = `${opts.appUrl.replace(/\/$/, "")}/client/login`;
  const meta = opts.firmName
    ? metaCard([{ label: s.inviteClient.firmLabel, value: opts.firmName }])
    : "";
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.inviteClient.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.inviteClient.intro)}</p>
    ${meta}
    ${stepsList([...s.inviteClient.steps])}`;

  return {
    subject: s.subjects.inviteClient,
    html: emailShell({
      locale: opts.locale,
      preheader: s.inviteClient.preheader,
      title: s.inviteClient.title,
      bodyHtml,
      cta: { label: s.inviteClient.cta, url: loginUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.inviteClient.greeting, { name: opts.firstName })}\n\n${s.inviteClient.intro}\n\n${loginUrl}`,
  };
}

export function buildAssignmentEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  roleLabel: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.assignment.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.assignment.intro)}</p>
    ${metaCard([
      {
        label: s.assignment.caseLabel,
        value: `${opts.caseNumber} — ${opts.caseTitle}`,
      },
      { label: s.assignment.roleLabel, value: opts.roleLabel },
    ])}`;

  return {
    subject: interpolateEmail(s.subjects.assignment, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.assignment.preheader,
      title: s.assignment.title,
      bodyHtml,
      cta: { label: s.assignment.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.assignment.greeting, { name: opts.firstName })}\n\n${s.assignment.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n${opts.roleLabel}\n\n${opts.caseUrl}`,
  };
}

export function buildCaseStatusEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  fromStatus: string;
  toStatus: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.caseStatus.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.caseStatus.intro)}</p>
    ${metaCard([
      {
        label: s.caseStatus.caseLabel,
        value: `${opts.caseNumber} — ${opts.caseTitle}`,
      },
      { label: s.caseStatus.fromLabel, value: opts.fromStatus },
      { label: s.caseStatus.toLabel, value: opts.toStatus },
    ])}`;

  return {
    subject: interpolateEmail(s.subjects.caseStatus, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.caseStatus.preheader,
      title: s.caseStatus.title,
      bodyHtml,
      cta: { label: s.caseStatus.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.caseStatus.greeting, { name: opts.firstName })}\n\n${s.caseStatus.intro}\n\n${opts.caseNumber}\n${opts.fromStatus} → ${opts.toStatus}\n\n${opts.caseUrl}`,
  };
}

export function buildReportDeliveredEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.reportDelivered.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.reportDelivered.intro)}</p>
    ${metaCard([
      {
        label: s.reportDelivered.caseLabel,
        value: `${opts.caseNumber} — ${opts.caseTitle}`,
      },
    ])}
    <div style="margin:16px 0 0;padding:14px 16px;background:${EMAIL_BRAND.successBg};border-radius:10px;border-left:3px solid ${EMAIL_BRAND.success};font-size:13px;color:${EMAIL_BRAND.success};font-weight:600;">
      ${opts.locale === "es" ? "Listo para revisar en el portal." : "Ready to review in the portal."}
    </div>`;

  return {
    subject: interpolateEmail(s.subjects.reportDelivered, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.reportDelivered.preheader,
      title: s.reportDelivered.title,
      bodyHtml,
      cta: { label: s.reportDelivered.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.reportDelivered.greeting, { name: opts.firstName })}\n\n${s.reportDelivered.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n\n${opts.caseUrl}`,
  };
}

export function buildNewCaseIntakeEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.newCaseIntake.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.newCaseIntake.intro)}</p>
    ${metaCard([
      { label: s.newCaseIntake.caseLabel, value: opts.caseNumber },
      { label: s.newCaseIntake.titleLabel, value: opts.caseTitle },
    ])}`;

  return {
    subject: interpolateEmail(s.subjects.newCaseIntake, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.newCaseIntake.preheader,
      title: s.newCaseIntake.title,
      bodyHtml,
      cta: { label: s.newCaseIntake.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.newCaseIntake.greeting, { name: opts.firstName })}\n\n${s.newCaseIntake.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n\n${opts.caseUrl}`,
  };
}
