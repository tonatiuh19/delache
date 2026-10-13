import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Eye, Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import DocumentPreviewSheet, {
  asPreviewableDocument,
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDocumentsIndex } from "@/store/slices/portalSlice";
import { runDocumentOcr } from "@/store/slices/casesSlice";
import {
  ContentPageSkeleton,
} from "@/components/portal/PortalSkeletons";

export default function DocumentsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { documentsIndex, documentsPagination, loadingDocuments } =
    useAppSelector((s) => s.portal);
  const [preview, setPreview] = useState<PreviewableDocument | null>(null);

  const searchForm = useFormik({
    initialValues: { q: "" },
    validationSchema: Yup.object({
      q: Yup.string().trim().max(200),
    }),
    onSubmit: (values) => {
      void dispatch(
        fetchDocumentsIndex({
          q: values.q.trim() || undefined,
          page: 1,
          limit: 50,
        }),
      );
    },
  });

  useEffect(() => {
    void dispatch(fetchDocumentsIndex({ limit: 50, page: 1 }));
  }, [dispatch]);

  return (
    <div className="min-w-0 w-full max-w-full space-y-6">
      <MetaHelmet title={t("portal.documents")} noindex />
      {loadingDocuments && documentsIndex.length === 0 ? (
        <ContentPageSkeleton variant="list" withActions />
      ) : (
        <>
          <PortalPageHeader
            eyebrow={t("documents.eyebrow")}
            title={t("portal.documents")}
            description={t("documents.hint")}
          />

          <PortalListPanel
            toolbar={
              <div>
                <form
                  onSubmit={searchForm.handleSubmit}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      name="q"
                      value={searchForm.values.q}
                      onChange={searchForm.handleChange}
                      placeholder={t("documents.searchPlaceholder")}
                      className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    {t("documents.search")}
                  </button>
                </form>
              </div>
            }
          >
            <ul className="divide-y divide-border">
              {documentsIndex.map((d) => (
                <li
                  key={d.publicUuid}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {d.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t(`cases.docCategory.${d.category}`, {
                        defaultValue: d.category,
                      })}{" "}
                      ·{" "}
                      <Link
                        to={`/portal/cases/${d.casePublicUuid}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {d.caseNumber}
                      </Link>
                      {d.ocrStatus ? (
                        <>
                          {" · "}
                          {t(`documents.ocrStatus.${d.ocrStatus}`, {
                            defaultValue: d.ocrStatus,
                          })}
                        </>
                      ) : null}
                    </div>
                    {d.ocrTextPreview ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {d.ocrTextPreview}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreview(asPreviewableDocument(d))}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <Eye size={14} />
                      {t("documents.preview")}
                    </button>
                  </div>
                </li>
              ))}
              {!loadingDocuments && documentsIndex.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  {t("documents.empty")}
                </li>
              ) : null}
            </ul>
            {documentsPagination && documentsPagination.total > 0 ? (
              <p className="mt-4 text-[11px] text-muted-foreground">
                {t("grid.showing", {
                  from: Math.min(
                    (documentsPagination.page - 1) *
                      documentsPagination.limit +
                      1,
                    documentsPagination.total,
                  ),
                  to: Math.min(
                    documentsPagination.page * documentsPagination.limit,
                    documentsPagination.total,
                  ),
                  total: documentsPagination.total,
                })}
              </p>
            ) : null}
          </PortalListPanel>
        </>
      )}

      <DocumentPreviewSheet
        open={Boolean(preview)}
        document={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onRunOcr={async (doc, ocrText) => {
          if (!doc.casePublicUuid) return;
          const result = await dispatch(
            runDocumentOcr({
              publicUuid: doc.casePublicUuid,
              documentUuid: doc.publicUuid,
              ocrText,
            }),
          );
          if (runDocumentOcr.fulfilled.match(result)) {
            setPreview(asPreviewableDocument(result.payload));
            void dispatch(
              fetchDocumentsIndex({
                q: searchForm.values.q.trim() || undefined,
                page: documentsPagination?.page || 1,
                limit: 50,
              }),
            );
          }
        }}
      />
    </div>
  );
}
