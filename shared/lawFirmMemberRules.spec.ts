import { describe, expect, it } from "vitest";
import {
  canManageFirmMembers,
  canMutateFirmCaseWork,
  emailActorConflict,
  resolveDespachoInviteTarget,
  resolveEmailInviteOccupancy,
  resolveLoginEmailDualActor,
  validateCreateLawFirmWithOwner,
} from "./lawFirmMemberRules";

describe("emailActorConflict", () => {
  it("blocks staff invite when email is already a despacho user", () => {
    expect(
      emailActorConflict({
        intendingActor: "staff",
        staffExists: false,
        lawFirmExists: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: "email_actor_conflict" }));
  });

  it("blocks despacho invite when email is already staff", () => {
    expect(
      emailActorConflict({
        intendingActor: "law_firm",
        staffExists: true,
        lawFirmExists: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: "email_actor_conflict" }));
  });

  it("allows clean emails", () => {
    expect(
      emailActorConflict({
        intendingActor: "law_firm",
        staffExists: false,
        lawFirmExists: false,
      }).ok,
    ).toBe(true);
  });
});

describe("resolveEmailInviteOccupancy", () => {
  it("creates when email is free", () => {
    expect(
      resolveEmailInviteOccupancy({
        intendingActor: "law_firm",
        staff: null,
        lawFirm: null,
      }),
    ).toEqual({ ok: true, action: "create" });
  });

  it("reactivates same-actor soft-deleted row", () => {
    expect(
      resolveEmailInviteOccupancy({
        intendingActor: "law_firm",
        staff: null,
        lawFirm: { id: 9, deleted: true },
      }),
    ).toEqual({
      ok: true,
      action: "reactivate",
      actor: "law_firm",
      id: 9,
    });
  });

  it("blocks active same-actor email", () => {
    expect(
      resolveEmailInviteOccupancy({
        intendingActor: "staff",
        staff: { id: 3, deleted: false },
        lawFirm: null,
      }),
    ).toEqual(
      expect.objectContaining({ ok: false, code: "email_already_registered" }),
    );
  });

  it("blocks cross-actor even when other row is soft-deleted", () => {
    expect(
      resolveEmailInviteOccupancy({
        intendingActor: "staff",
        staff: null,
        lawFirm: { id: 2, deleted: true },
      }),
    ).toEqual(
      expect.objectContaining({ ok: false, code: "email_actor_conflict" }),
    );
  });
});

describe("resolveLoginEmailDualActor", () => {
  it("blocks dual alive emails", () => {
    expect(
      resolveLoginEmailDualActor({
        staffAlive: true,
        lawFirmAlive: true,
      }).ok,
    ).toBe(false);
  });

  it("allows single alive actor", () => {
    expect(
      resolveLoginEmailDualActor({
        staffAlive: false,
        lawFirmAlive: true,
      }).ok,
    ).toBe(true);
  });
});

describe("resolveDespachoInviteTarget", () => {
  it("requires existing firm or create payload", () => {
    expect(resolveDespachoInviteTarget({}).ok).toBe(false);
  });

  it("accepts existing firm id", () => {
    const result = resolveDespachoInviteTarget({
      lawFirmId: 9,
      memberRole: "admin",
    });
    expect(result).toEqual({
      ok: true,
      target: { mode: "existing", lawFirmId: 9 },
      memberRole: "admin",
      isPrimaryContact: false,
    });
  });

  it("creates firm as owner primary contact", () => {
    const result = resolveDespachoInviteTarget({
      createLawFirm: { name: "Bufete Norte", city: "CDMX" },
      memberRole: "member",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.mode).toBe("create");
      expect(result.memberRole).toBe("owner");
      expect(result.isPrimaryContact).toBe(true);
    }
  });
});

describe("validateCreateLawFirmWithOwner", () => {
  it("requires owner identity", () => {
    expect(
      validateCreateLawFirmWithOwner({
        name: "Firm",
        ownerEmail: "",
        ownerFirstName: "A",
        ownerLastName: "B",
      }).ok,
    ).toBe(false);
  });

  it("accepts complete owner pack", () => {
    expect(
      validateCreateLawFirmWithOwner({
        name: "Firm",
        ownerEmail: " Owner@Firm.mx ",
        ownerFirstName: "Ana",
        ownerLastName: "Ruiz",
      }),
    ).toEqual({
      ok: true,
      name: "Firm",
      ownerEmail: "owner@firm.mx",
      ownerFirstName: "Ana",
      ownerLastName: "Ruiz",
    });
  });
});

describe("firm member capability gates", () => {
  it("limits manage vs mutate", () => {
    expect(canManageFirmMembers("owner")).toBe(true);
    expect(canManageFirmMembers("member")).toBe(false);
    expect(canMutateFirmCaseWork("member")).toBe(true);
    expect(canMutateFirmCaseWork("viewer")).toBe(false);
  });
});
