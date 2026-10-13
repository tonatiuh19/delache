import { describe, expect, it } from "vitest";
import {
  editorHtmlFromContentJson,
  isQuestionnaireEditorReady,
  mergeQuestionnaireEditorHtml,
  plainTextFromHtml,
} from "./questionnaireDocxRules";

describe("questionnaireDocxRules", () => {
  it("reads plain text from html and gates readiness", () => {
    expect(plainTextFromHtml("<p>Hola <b>mundo</b></p>")).toBe("Hola mundo");
    expect(isQuestionnaireEditorReady("<p>corto</p>")).toBe(false);
    expect(
      isQuestionnaireEditorReady(
        "<p>Este cuestionario tiene texto suficiente para guardar.</p>",
      ),
    ).toBe(true);
  });

  it("merges editor html into contentJson", () => {
    const next = mergeQuestionnaireEditorHtml(
      { foo: 1 },
      "<p>Texto de cuestionario suficientemente largo aquí.</p>",
    );
    expect(next.foo).toBe(1);
    expect(next.editorHtml).toContain("cuestionario");
    expect(String(next.defendantQuestionnaire).length).toBeGreaterThan(20);
  });

  it("falls back to defendantQuestionnaire plain text", () => {
    expect(
      editorHtmlFromContentJson({
        defendantQuestionnaire: "Solo texto plano",
      }),
    ).toContain("Solo texto plano");
  });
});
