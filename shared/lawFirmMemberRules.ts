/**
 * Despacho membership + firm create/invite rules.
 * External lawyers are law_firm_users (never staff.legal).
 */

export const LAW_FIRM_MEMBER_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;

export type LawFirmMemberRole = (typeof LAW_FIRM_MEMBER_ROLES)[number];

export function isLawFirmMemberRole(
  role: string | null | undefined,
): role is LawFirmMemberRole {
  return (LAW_FIRM_MEMBER_ROLES as readonly string[]).includes(String(role));
}

/** Owner/admin can invite and manage firm roster. */
export function canManageFirmMembers(
  role: string | null | undefined,
): boolean {
  return role === "owner" || role === "admin";
}

/** Viewer is read-only; member+ can upload/review on cases they own as firm. */
export function canMutateFirmCaseWork(
  role: string | null | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

/**
 * One email = one actor (Q5-A).
 * Intending to create staff while law_firm exists (or vice versa) is forbidden.
 */
export function emailActorConflict(opts: {
  intendingActor: "staff" | "law_firm";
  staffExists: boolean;
  lawFirmExists: boolean;
}): { ok: true } | { ok: false; error: string; code: "email_actor_conflict" } {
  if (opts.intendingActor === "staff" && opts.lawFirmExists) {
    return {
      ok: false,
      error: "Email already registered as a despacho user",
      code: "email_actor_conflict",
    };
  }
  if (opts.intendingActor === "law_firm" && opts.staffExists) {
    return {
      ok: false,
      error: "Email already registered as DELACHE staff",
      code: "email_actor_conflict",
    };
  }
  return { ok: true };
}

export type EmailActorRow = { id: number; deleted: boolean };

/**
 * Invite occupancy: cross-actor forever blocked; same-actor soft-delete → reactivate.
 */
export function resolveEmailInviteOccupancy(opts: {
  intendingActor: "staff" | "law_firm";
  staff: EmailActorRow | null;
  lawFirm: EmailActorRow | null;
}):
  | { ok: true; action: "create" }
  | {
      ok: true;
      action: "reactivate";
      actor: "staff" | "law_firm";
      id: number;
    }
  | {
      ok: false;
      error: string;
      code: "email_actor_conflict" | "email_already_registered";
    } {
  const other =
    opts.intendingActor === "staff" ? opts.lawFirm : opts.staff;
  if (other) {
    return {
      ok: false,
      error:
        opts.intendingActor === "staff"
          ? "Email already registered as a despacho user"
          : "Email already registered as DELACHE staff",
      code: "email_actor_conflict",
    };
  }
  const same =
    opts.intendingActor === "staff" ? opts.staff : opts.lawFirm;
  if (!same) {
    return { ok: true, action: "create" };
  }
  if (!same.deleted) {
    return {
      ok: false,
      error: "Email already registered",
      code: "email_already_registered",
    };
  }
  return {
    ok: true,
    action: "reactivate",
    actor: opts.intendingActor,
    id: same.id,
  };
}

/** Login blocked when the same email is alive in both actor tables. */
export function resolveLoginEmailDualActor(opts: {
  staffAlive: boolean;
  lawFirmAlive: boolean;
}):
  | { ok: true }
  | { ok: false; error: string; code: "email_actor_conflict" } {
  if (opts.staffAlive && opts.lawFirmAlive) {
    return {
      ok: false,
      error:
        "This email is registered as both staff and despacho. Contact an admin to resolve.",
      code: "email_actor_conflict",
    };
  }
  return { ok: true };
}

export type CreateLawFirmDraft = {
  name: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  defaultCourtName?: string | null;
};

export type FirmInviteTarget =
  | { mode: "existing"; lawFirmId: number }
  | { mode: "create"; firm: CreateLawFirmDraft };

/**
 * Despacho invite must attach to an existing firm or create one inline.
 * New firm primary contact defaults to owner.
 */
export function resolveDespachoInviteTarget(input: {
  lawFirmId?: number | null;
  createLawFirm?: Partial<CreateLawFirmDraft> | null;
  memberRole?: string | null;
  isPrimaryContact?: boolean;
}):
  | {
      ok: true;
      target: FirmInviteTarget;
      memberRole: LawFirmMemberRole;
      isPrimaryContact: boolean;
    }
  | {
      ok: false;
      error: string;
      code: "law_firm_required" | "invalid_firm_name" | "invalid_member_role";
    } {
  const createName = String(input.createLawFirm?.name || "").trim();
  const lawFirmId = Number(input.lawFirmId);
  const hasExisting = Number.isFinite(lawFirmId) && lawFirmId > 0;
  const hasCreate = createName.length > 0;

  if (!hasExisting && !hasCreate) {
    return {
      ok: false,
      error: "Select an existing despacho or create a new one",
      code: "law_firm_required",
    };
  }
  if (hasCreate && createName.length < 2) {
    return {
      ok: false,
      error: "Despacho name is required",
      code: "invalid_firm_name",
    };
  }

  const creating = hasCreate && !hasExisting;
  const rawRole = String(input.memberRole || "").trim();
  const memberRole: LawFirmMemberRole = creating
    ? "owner"
    : isLawFirmMemberRole(rawRole)
      ? rawRole
      : "member";

  if (rawRole && !creating && !isLawFirmMemberRole(rawRole)) {
    return {
      ok: false,
      error: "Invalid despacho member role",
      code: "invalid_member_role",
    };
  }

  if (creating) {
    return {
      ok: true,
      target: {
        mode: "create",
        firm: {
          name: createName,
          email: input.createLawFirm?.email?.trim() || null,
          city: input.createLawFirm?.city?.trim() || null,
          state: input.createLawFirm?.state?.trim() || null,
          defaultCourtName:
            input.createLawFirm?.defaultCourtName?.trim() || null,
        },
      },
      memberRole,
      isPrimaryContact: true,
    };
  }

  return {
    ok: true,
    target: { mode: "existing", lawFirmId },
    memberRole,
    isPrimaryContact: Boolean(input.isPrimaryContact),
  };
}

/**
 * Creating a despacho org always requires a primary owner invite (Q2-C).
 */
export function validateCreateLawFirmWithOwner(input: {
  name: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
}):
  | {
      ok: true;
      name: string;
      ownerEmail: string;
      ownerFirstName: string;
      ownerLastName: string;
    }
  | { ok: false; error: string; code: "invalid_payload" } {
  const name = String(input.name || "").trim();
  const ownerEmail = String(input.ownerEmail || "").trim().toLowerCase();
  const ownerFirstName = String(input.ownerFirstName || "").trim();
  const ownerLastName = String(input.ownerLastName || "").trim();
  if (!name || !ownerEmail || !ownerFirstName || !ownerLastName) {
    return {
      ok: false,
      error: "name and primary owner (email, firstName, lastName) are required",
      code: "invalid_payload",
    };
  }
  return { ok: true, name, ownerEmail, ownerFirstName, ownerLastName };
}
