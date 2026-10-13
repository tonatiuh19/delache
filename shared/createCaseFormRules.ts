/**
 * Create-case sheet helpers (staff intake).
 * Despacho = law_firms row (select / quick-add).
 * Juzgado (`courtName`) is asked on admin create; client create autofills
 * from `law_firms.default_court_name` on the API.
 */

export const CREATE_CASE_LAW_FIRM_QUICK_ADD = "__quick_add__" as const;

export type CreateCaseLawFirmSelection =
  | ""
  | typeof CREATE_CASE_LAW_FIRM_QUICK_ADD
  | `${number}`;

export type CreateCaseDevFillValues = {
  title: string;
  courtName: string;
  propertyCity: string;
  externalReference: string;
  plaintiffName: string;
  defendantName: string;
  priority: "low" | "normal" | "high" | "urgent";
  involvesFatality: boolean;
  deadline: string;
  note: string;
  lawFirmSelection: CreateCaseLawFirmSelection;
  quickAddName: string;
  quickAddEmail: string;
  quickAddCity: string;
  quickAddDefaultCourt: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
};

/** Vite `import.meta.env.DEV` (or equivalent) — never enable in production builds. */
export function isCreateCaseDevFillEnabled(isDev: boolean): boolean {
  return isDev === true;
}

/** Paso 1 (PDF + Miro): note cap on the create form. */
export const INTAKE_CREATE_NOTE_MAX = 500;

/** Paso 1 legend: PDF, JPG, PNG, 10 MB per file. */
export const INTAKE_CREATE_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const INTAKE_CREATE_REQUIRED_CATEGORIES = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
] as const;

export type IntakeCreateRequiredCategory =
  (typeof INTAKE_CREATE_REQUIRED_CATEGORIES)[number];

export type IntakeCreateFieldError =
  | "title"
  | "deadline"
  | "note"
  | "documents"
  | "fileType"
  | "fileSize";

const INTAKE_CREATE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);
const INTAKE_CREATE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export function intakeCreateFileIssue(file: {
  name: string;
  type?: string;
  size: number;
}): "type" | "size" | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = (file.type || "").toLowerCase();
  const typeOk =
    INTAKE_CREATE_EXTENSIONS.has(ext) || INTAKE_CREATE_MIME.has(mime);
  if (!typeOk) return "type";
  if (file.size <= 0 || file.size > INTAKE_CREATE_MAX_FILE_BYTES) return "size";
  return null;
}

/**
 * Paso 1 draft: folio, fecha límite, the four initial documents, optional note.
 * Extra files are included in `files` with category `other`.
 */
export function validateIntakeCreateDraft(input: {
  title: string;
  deadline: string;
  note: string;
  files: ReadonlyArray<{
    name: string;
    type?: string;
    size: number;
    category: string;
  }>;
}): IntakeCreateFieldError | null {
  if (!input.title.trim()) return "title";
  const deadline = input.deadline.trim();
  if (
    !deadline ||
    Number.isNaN(new Date(`${deadline.slice(0, 10)}T12:00:00`).getTime())
  ) {
    return "deadline";
  }
  if (input.note.length > INTAKE_CREATE_NOTE_MAX) return "note";
  const present = new Set(input.files.map((file) => file.category));
  for (const category of INTAKE_CREATE_REQUIRED_CATEGORIES) {
    if (!present.has(category)) return "documents";
  }
  for (const file of input.files) {
    const issue = intakeCreateFileIssue(file);
    if (issue === "type") return "fileType";
    if (issue === "size") return "fileSize";
  }
  return null;
}

/** True when every required create field is present. Notes and extra files stay optional. */
export function isIntakeCreateReady(input: {
  title: string;
  deadline: string;
  note: string;
  files: ReadonlyArray<{
    name: string;
    type?: string;
    size: number;
    category: string;
  }>;
  /** Staff create on behalf of a despacho. Omit for the despacho's own form. */
  lawFirmSelection?: string | null;
  quickAddName?: string | null;
  ownerEmail?: string | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
}): boolean {
  if (input.lawFirmSelection !== undefined) {
    const selection = input.lawFirmSelection?.trim() ?? "";
    if (!selection) return false;
    if (isLawFirmQuickAdd(selection)) {
      if (!input.quickAddName?.trim()) return false;
      if (
        !input.ownerEmail?.trim() ||
        !input.ownerFirstName?.trim() ||
        !input.ownerLastName?.trim()
      ) {
        return false;
      }
    } else if (parseLawFirmSelectionId(selection) == null) {
      return false;
    }
  }
  return validateIntakeCreateDraft(input) == null;
}

export function isLawFirmQuickAdd(
  selection: string | null | undefined,
): boolean {
  return selection === CREATE_CASE_LAW_FIRM_QUICK_ADD;
}

/** Parse select value → numeric law firm id, or null when empty / quick-add. */
export function parseLawFirmSelectionId(
  selection: string | null | undefined,
): number | null {
  if (!selection || selection === CREATE_CASE_LAW_FIRM_QUICK_ADD) return null;
  const id = Number(selection);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

/**
 * Prefer a seeded/demo firm name match, else first active firm, else open quick-add.
 */
export function pickDevLawFirmSelection(
  lawFirms: ReadonlyArray<{ id: number; name: string; status?: string }>,
): CreateCaseLawFirmSelection {
  const active = lawFirms.filter(
    (f) => !f.status || f.status === "active",
  );
  const preferred =
    active.find((f) => /prueba|test|delache/i.test(f.name)) ?? active[0];
  if (preferred) return String(preferred.id) as `${number}`;
  return CREATE_CASE_LAW_FIRM_QUICK_ADD;
}

export function buildCreateCaseDevFillValues(opts: {
  lawFirms: ReadonlyArray<{ id: number; name: string; status?: string }>;
  now?: Date;
}): CreateCaseDevFillValues {
  const now = opts.now ?? new Date();
  const stamp = now.toISOString().slice(0, 19).replace("T", " ");
  const lawFirmSelection = pickDevLawFirmSelection(opts.lawFirms);
  const needsQuickAdd = isLawFirmQuickAdd(lawFirmSelection);

  return {
    title: `Cortocircuito — Reforma 120 (DEV ${stamp})`,
    courtName: "Juzgado Primero Civil de Ciudad de México",
    propertyCity: "Ciudad de México",
    externalReference: `DEV-${now.getTime().toString(36).toUpperCase()}`,
    plaintiffName: "María Elena Ruiz García",
    defendantName: "CFE Distribución",
    priority: "normal",
    involvesFatality: false,
    deadline: now.toISOString().slice(0, 10),
    note: "Ingreso de prueba — documentos iniciales pendientes de selección.",
    lawFirmSelection,
    quickAddName: needsQuickAdd ? "Despacho Prueba Delache" : "",
    quickAddEmail: needsQuickAdd ? "despacho.prueba@example.test" : "",
    quickAddCity: needsQuickAdd ? "Ciudad de México" : "",
    quickAddDefaultCourt: needsQuickAdd
      ? "Juzgado Primero Civil de Ciudad de México"
      : "",
    ownerEmail: needsQuickAdd ? "owner.prueba@example.test" : "",
    ownerFirstName: needsQuickAdd ? "Ana" : "",
    ownerLastName: needsQuickAdd ? "Ruiz" : "",
  };
}
