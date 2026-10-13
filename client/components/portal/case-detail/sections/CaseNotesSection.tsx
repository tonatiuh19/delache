import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus } from "lucide-react";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { addCaseNote } from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseNotesSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, notes } = useAppSelector((s) => s.cases);

  const noteForm = useFormik({
    initialValues: { body: "" },
    validationSchema: Yup.object({ body: Yup.string().trim().required() }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        addCaseNote({ publicUuid, body: values.body.trim() }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.noteSaveSuccess"),
          failureTitle: t("cases.noteSaveFailed"),
          fallbackError: "note_failed",
        })
      ) {
        helpers.resetForm();
      }
    },
  });

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-notes"
      sectionId="notes"
      title={t("cases.notes")}
      icon={<MessageSquarePlus size={18} />}
    >
        <form
          onSubmit={noteForm.handleSubmit}
          className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start"
        >
          <textarea
            name="body"
            rows={4}
            value={noteForm.values.body}
            onChange={noteForm.handleChange}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20 lg:min-h-[7rem]"
            placeholder={t("cases.notePlaceholder")}
          />
          <PendingSubmitButton
            pending={noteForm.isSubmitting}
            className="h-11 px-6 text-sm font-bold lg:mt-0"
          >
            {t("cases.addNote")}
          </PendingSubmitButton>
        </form>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground"
            >
              {n.body}
              <div className="mt-2 text-[11px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
    </CaseDetailSectionPanel>
  );
}
