import { describe, expect, it } from "vitest";
import { assignmentNotificationCopy, expertDeliveryClearNotificationCopy } from "./notificationCopy";

describe("assignmentNotificationCopy", () => {
  it("localizes Spanish assignment alerts with role labels", () => {
    const copy = assignmentNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0002",
      role: "expert",
    });
    expect(copy.title).toBe("Asignado a DEL-2026-0002");
    expect(copy.body).toContain("Perito");
    expect(copy.body).toContain("DEL-2026-0002");
    expect(copy.body).not.toContain("expert");
  });

  it("localizes English assignment alerts", () => {
    const copy = assignmentNotificationCopy({
      locale: "en",
      caseNumber: "DEL-1",
      role: "coordinator",
    });
    expect(copy.title).toBe("Assigned to DEL-1");
    expect(copy.body).toContain("Coordinator");
  });

  it("includes expert delivery date in assignment body", () => {
    const copy = assignmentNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0002",
      role: "expert",
      deliveryDueAt: new Date("2026-09-20T12:00:00.000Z"),
    });
    expect(copy.body).toContain("Entrega antes del");
  });
});

describe("expertDeliveryClearNotificationCopy", () => {
  it("localizes Spanish clear alerts", () => {
    const copy = expertDeliveryClearNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0002",
    });
    expect(copy.title).toContain("Fecha de entrega eliminada");
    expect(copy.body).toContain("DEL-2026-0002");
  });

  it("localizes English clear alerts", () => {
    const copy = expertDeliveryClearNotificationCopy({
      locale: "en",
      caseNumber: "DEL-1",
    });
    expect(copy.title).toBe("Delivery date cleared · DEL-1");
    expect(copy.body).toContain("removed");
  });
});
