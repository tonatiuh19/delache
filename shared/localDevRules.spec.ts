import { describe, expect, it } from "vitest";
import { isLocalAppHostname, isLocalAppUrl } from "./localDevRules";

describe("localDevRules", () => {
  it("detects loopback hostnames", () => {
    expect(isLocalAppHostname("localhost")).toBe(true);
    expect(isLocalAppHostname("LOCALHOST")).toBe(true);
    expect(isLocalAppHostname("127.0.0.1")).toBe(true);
    expect(isLocalAppHostname("0.0.0.0")).toBe(true);
    expect(isLocalAppHostname("::1")).toBe(true);
    expect(isLocalAppHostname("app.localhost")).toBe(true);
    expect(isLocalAppHostname("delache.app")).toBe(false);
    expect(isLocalAppHostname("")).toBe(false);
    expect(isLocalAppHostname(null)).toBe(false);
  });

  it("detects local URLs including port", () => {
    expect(isLocalAppUrl("http://localhost:8080")).toBe(true);
    expect(isLocalAppUrl("http://localhost:8080/portal/login")).toBe(true);
    expect(isLocalAppUrl("https://127.0.0.1/client/login")).toBe(true);
    expect(isLocalAppUrl("https://app.delache.mx")).toBe(false);
    expect(isLocalAppUrl("")).toBe(false);
  });
});
