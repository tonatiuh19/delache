import { describe, expect, it } from "vitest";
import {
  buildInviteClientEmail,
  buildInviteStaffEmail,
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

  it("builds invite emails with portal CTAs", () => {
    const staff = buildInviteStaffEmail({
      locale: "es",
      firstName: "Luis",
      roleLabel: "expert",
      appUrl: "https://app.delache.mx",
    });
    expect(staff.html).toContain("/portal/login");
    expect(staff.html).toContain("expert");

    const client = buildInviteClientEmail({
      locale: "en",
      firstName: "Sofia",
      firmName: "García & Co",
      appUrl: "https://app.delache.mx",
    });
    expect(client.html).toContain("/client/login");
    expect(client.html).toContain("García &amp; Co");
  });
});
