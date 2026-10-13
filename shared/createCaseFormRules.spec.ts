import { describe, expect, it } from "vitest";
import {
  CREATE_CASE_LAW_FIRM_QUICK_ADD,
  INTAKE_CREATE_MAX_FILE_BYTES,
  buildCreateCaseDevFillValues,
  isCreateCaseDevFillEnabled,
  isLawFirmQuickAdd,
  parseLawFirmSelectionId,
  pickDevLawFirmSelection,
  isIntakeCreateReady,
  validateIntakeCreateDraft,
} from "./createCaseFormRules";

describe("isCreateCaseDevFillEnabled", () => {
  it("only enables when isDev is true", () => {
    expect(isCreateCaseDevFillEnabled(true)).toBe(true);
    expect(isCreateCaseDevFillEnabled(false)).toBe(false);
  });
});

describe("law firm selection", () => {
  it("detects quick-add sentinel", () => {
    expect(isLawFirmQuickAdd(CREATE_CASE_LAW_FIRM_QUICK_ADD)).toBe(true);
    expect(isLawFirmQuickAdd("12")).toBe(false);
    expect(isLawFirmQuickAdd("")).toBe(false);
  });

  it("parses positive ids and rejects empty/quick-add/invalid", () => {
    expect(parseLawFirmSelectionId("42")).toBe(42);
    expect(parseLawFirmSelectionId("")).toBeNull();
    expect(parseLawFirmSelectionId(CREATE_CASE_LAW_FIRM_QUICK_ADD)).toBeNull();
    expect(parseLawFirmSelectionId("0")).toBeNull();
    expect(parseLawFirmSelectionId("abc")).toBeNull();
  });

  it("prefers prueba/test/delache firm for dev fill", () => {
    expect(
      pickDevLawFirmSelection([
        { id: 1, name: "Bufete Alpha" },
        { id: 2, name: "Despacho Prueba Delache" },
      ]),
    ).toBe("2");
  });

  it("falls back to quick-add when no firms exist", () => {
    expect(pickDevLawFirmSelection([])).toBe(CREATE_CASE_LAW_FIRM_QUICK_ADD);
  });
});

describe("buildCreateCaseDevFillValues", () => {
  it("fills court/parties and selects preferred firm", () => {
    const values = buildCreateCaseDevFillValues({
      lawFirms: [{ id: 9, name: "Despacho Prueba Delache", status: "active" }],
      now: new Date("2026-09-29T19:00:00.000Z"),
    });
    expect(values.title).toContain("Cortocircuito");
    expect(values.courtName).toContain("Juzgado");
    expect(values.plaintiffName.length).toBeGreaterThan(0);
    expect(values.lawFirmSelection).toBe("9");
    expect(values.quickAddName).toBe("");
  });

  it("opens quick-add when no firms are available", () => {
    const values = buildCreateCaseDevFillValues({ lawFirms: [] });
    expect(values.lawFirmSelection).toBe(CREATE_CASE_LAW_FIRM_QUICK_ADD);
    expect(values.quickAddName).toMatch(/Despacho/i);
    expect(values.ownerEmail).toContain("@");
    expect(values.ownerFirstName.length).toBeGreaterThan(0);
  });
});

const requiredFiles = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
].map((category) => ({
  name: `${category}.pdf`,
  type: "application/pdf",
  size: 1200,
  category,
}));

describe("validateIntakeCreateDraft", () => {
  it("accepts folio, deadline, the four documents, and a short note", () => {
    expect(
      validateIntakeCreateDraft({
        title: "Terreno El Roble",
        deadline: "2026-12-01",
        note: "Comentario",
        files: requiredFiles,
      }),
    ).toBeNull();
  });

  it("requires the deadline and every initial document", () => {
    expect(
      validateIntakeCreateDraft({
        title: "Terreno",
        deadline: "",
        note: "",
        files: requiredFiles,
      }),
    ).toBe("deadline");
    expect(
      validateIntakeCreateDraft({
        title: "Terreno",
        deadline: "2026-12-01",
        note: "",
        files: requiredFiles.slice(0, 3),
      }),
    ).toBe("documents");
  });

  it("rejects a long note, the wrong type, and a file over 10 MB", () => {
    expect(
      validateIntakeCreateDraft({
        title: "Terreno",
        deadline: "2026-12-01",
        note: "x".repeat(501),
        files: requiredFiles,
      }),
    ).toBe("note");
    expect(
      validateIntakeCreateDraft({
        title: "Terreno",
        deadline: "2026-12-01",
        note: "",
        files: [
          ...requiredFiles.slice(0, 3),
          {
            name: "fotos.docx",
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 100,
            category: "preliminary_photo",
          },
        ],
      }),
    ).toBe("fileType");
    expect(
      validateIntakeCreateDraft({
        title: "Terreno",
        deadline: "2026-12-01",
        note: "",
        files: requiredFiles.map((file, index) =>
          index === 0
            ? { ...file, size: INTAKE_CREATE_MAX_FILE_BYTES + 1 }
            : file,
        ),
      }),
    ).toBe("fileSize");
  });
});

describe("isIntakeCreateReady", () => {
  it("stays false until folio, deadline, and the four files are set", () => {
    expect(
      isIntakeCreateReady({
        title: "",
        deadline: "2026-12-01",
        note: "",
        files: requiredFiles,
      }),
    ).toBe(false);
    expect(
      isIntakeCreateReady({
        title: "Terreno",
        deadline: "2026-12-01",
        note: "",
        files: requiredFiles,
      }),
    ).toBe(true);
  });

  it("requires a despacho when the staff picker is present", () => {
    const base = {
      title: "Terreno",
      deadline: "2026-12-01",
      note: "",
      files: requiredFiles,
    };
    expect(isIntakeCreateReady({ ...base, lawFirmSelection: "" })).toBe(false);
    expect(isIntakeCreateReady({ ...base, lawFirmSelection: "4" })).toBe(true);
    expect(
      isIntakeCreateReady({
        ...base,
        lawFirmSelection: CREATE_CASE_LAW_FIRM_QUICK_ADD,
        quickAddName: "",
      }),
    ).toBe(false);
    expect(
      isIntakeCreateReady({
        ...base,
        lawFirmSelection: CREATE_CASE_LAW_FIRM_QUICK_ADD,
        quickAddName: "Bufete Norte",
      }),
    ).toBe(false);
    expect(
      isIntakeCreateReady({
        ...base,
        lawFirmSelection: CREATE_CASE_LAW_FIRM_QUICK_ADD,
        quickAddName: "Bufete Norte",
        ownerEmail: "owner@firm.mx",
        ownerFirstName: "Ana",
        ownerLastName: "Ruiz",
      }),
    ).toBe(true);
  });
});
