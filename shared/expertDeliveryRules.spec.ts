import { describe, expect, it } from "vitest";
import {
  parseExpertDeliveryDueDateInput,
  shouldApplyExpertDeliveryOnAssignment,
} from "./expertDeliveryRules";
import { assignmentNotificationCopy, expertDeliverySetNotificationCopy } from "./notificationCopy";

describe("expertDeliveryRules", () => {
  it("parses ISO and date-only delivery inputs", () => {
    const iso = parseExpertDeliveryDueDateInput("2026-09-15T12:00:00.000Z");
    expect(iso.ok).toBe(true);
    if (iso.ok) expect(iso.dateOnly).toBe(false);

    const day = parseExpertDeliveryDueDateInput("2026-09-15");
    expect(day.ok).toBe(true);
    if (day.ok) {
      expect(day.dateOnly).toBe(true);
      expect(day.dueAt.getFullYear()).toBe(2026);
    }
  });

  it("rejects empty delivery date", () => {
    expect(parseExpertDeliveryDueDateInput("").ok).toBe(false);
    expect(parseExpertDeliveryDueDateInput(null).ok).toBe(false);
  });

  it("includes delivery date in assignment notification for primary expert", () => {
    const due = new Date("2026-09-20T12:00:00.000Z");
    const en = assignmentNotificationCopy({
      locale: "en",
      caseNumber: "DEL-2026-0001",
      role: "expert",
      deliveryDueAt: due,
    });
    expect(en.body).toContain("Deliver by");

    const es = assignmentNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0001",
      role: "expert",
      deliveryDueAt: due,
    });
    expect(es.body).toContain("Entrega antes del");

    const noDate = assignmentNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0001",
      role: "coordinator",
      deliveryDueAt: due,
    });
    expect(noDate.body).not.toContain("Entrega antes");
  });

  it("builds standalone delivery-set notification copy", () => {
    const copy = expertDeliverySetNotificationCopy({
      locale: "es",
      caseNumber: "DEL-2026-0002",
      dueAt: new Date("2026-10-01T12:00:00.000Z"),
    });
    expect(copy.title).toContain("DEL-2026-0002");
    expect(copy.body).toContain("fecha de entrega");
  });

  it("only applies delivery deadline on primary expert assignment", () => {
    expect(
      shouldApplyExpertDeliveryOnAssignment({
        assignmentRole: "expert",
        isPrimary: true,
        deliveryDueAt: "2026-09-15",
      }),
    ).toBe(true);
    expect(
      shouldApplyExpertDeliveryOnAssignment({
        assignmentRole: "expert",
        isPrimary: false,
        deliveryDueAt: "2026-09-15",
      }),
    ).toBe(false);
    expect(
      shouldApplyExpertDeliveryOnAssignment({
        assignmentRole: "logistics",
        isPrimary: true,
        deliveryDueAt: "2026-09-15",
      }),
    ).toBe(false);
  });
});
