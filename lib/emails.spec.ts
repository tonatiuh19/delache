import { describe, expect, it } from "vitest";
import {
  buildInviteClientEmail,
  buildInviteStaffEmail,
  buildOpsNotificationEmail,
  buildOtpEmail,
  EMAIL_BRAND,
  escapeHtml,
  interpolateEmail,
} from "./emails";

describe("email templates", () => {
  it("escapes html", () => {
    expect(escapeHtml(`<a href="x">a&b</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;a&amp;b&lt;/a&gt;",
    );
  });

  it("interpolates placeholders", () => {
    expect(interpolateEmail("Hi {{name}}, code {{code}}", { name: "Ana", code: 123456 })).toBe(
      "Hi Ana, code 123456",
    );
  });

  it("builds branded OTP email for staff and client", () => {
    const staff = buildOtpEmail({
      locale: "es",
      firstName: "Alex",
      code: "482913",
      portal: "staff",
      minutes: 10,
      appUrl: "https://app.delache.mx",
    });
    expect(staff.subject).toContain("482913");
    expect(staff.html).toContain("DELACHE");
    expect(staff.html).toContain("482913");
    expect(staff.html).toContain(EMAIL_BRAND.primary);
    expect(staff.html).toContain("portal interno");
    expect(staff.html).toContain("https://app.delache.mx/brand/logo-full.png");
    expect(staff.html).toContain('align="center"');
    expect(staff.text).toContain("482913");

    const client = buildOtpEmail({
      locale: "en",
      firstName: "Maria",
      code: "111222",
      portal: "law_firm",
      appUrl: "https://app.delache.mx",
    });
    expect(client.html).toContain("law firm portal");
    expect(client.subject).toContain("111222");
  });

  it("uses a public asset origin for logos when appUrl is localhost", () => {
    const staff = buildOtpEmail({
      locale: "es",
      firstName: "Alex",
      code: "123456",
      portal: "staff",
      appUrl: "http://localhost:8080",
    });
    expect(staff.html).toContain(
      "https://www.delache.mx/brand/logo-full.png",
    );
    expect(staff.html).not.toContain("localhost:8080/brand/");
  });

  it("builds invite emails with portal CTAs", () => {
    const staff = buildInviteStaffEmail({
      locale: "es",
      firstName: "Luis",
      role: "expert",
      appUrl: "https://app.delache.mx",
    });
    expect(staff.html).toContain("/login");
    expect(staff.html).toContain("Perito");
    expect(staff.html).not.toContain(">expert<");
    expect(staff.html).toContain("Sin contraseña");

    const client = buildInviteClientEmail({
      locale: "en",
      firstName: "Sofia",
      firmName: "García & Co",
      appUrl: "https://app.delache.mx",
      resend: true,
    });
    expect(client.html).toContain("/login");
    expect(client.html).toContain("García &amp; Co");
    expect(client.subject.toLowerCase()).toContain("reminder");
  });

  it("builds ops notification emails with tone banner", () => {
    const ops = buildOpsNotificationEmail({
      locale: "en",
      firstName: "Ana",
      notificationType: "missing_documents",
      title: "Missing documents · C-1",
      body: "Missing: power_of_attorney",
      caseNumber: "C-1",
      ctaUrl: "https://app.delache.mx/portal/cases/x",
      appUrl: "https://app.delache.mx",
    });
    expect(ops.html).toContain("Missing documents");
    expect(ops.html).toContain(EMAIL_BRAND.warnBg);
    expect(ops.text).toContain("power_of_attorney");
  });
});
