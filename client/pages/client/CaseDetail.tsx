import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileUp } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import DocumentCategorySelect from "@/components/portal/DocumentCategorySelect";
import { FieldHelper } from "@/components/portal/FormHelpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientCaseDetail,
  reviewClientReport,
  updateClientCaseFlags,
  updateClientDocumentCategory,
  uploadClientDocument,
} from "@/store/slices/clientSlice";
import type { DocumentCategory } from "@shared/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ClientCaseDetailPage() {
  const { publicUuid = "" } = useParams();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selected,
    notes,
    documents,
    technicalReports,
    documentCompleteness,
    detailLoading,
    reviewingReport,
    error,
  } = useAppSelector((s) => s.client);
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>("lawsuit");

  useEffect(() => {
    if (publicUuid) void dispatch(fetchClientCaseDetail(publicUuid));
  }, [dispatch, publicUuid]);

  const refresh = () => {
    if (publicUuid) void dispatch(fetchClientCaseDetail(publicUuid));
  };

  const onUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const data = await fileToBase64(file);
    await dispatch(
      uploadClientDocument({
        publicUuid,
        title: file.name,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        category: uploadCategory,
        data,
      }),
    );
    refresh();
  };

  const onReview = (
    reportUuid: string,
    outcome: "approved" | "changes_requested" | "rejected",
  ) => {
    void dispatch(
      reviewClientReport({
        publicUuid,
        reportUuid,
        outcome,
      }),
    ).then(() => refresh());
  };

  if (detailLoading && !selected) {
    return <ContentPageSkeleton variant="detail" withHeader={false} />;
  }
  if (!selected) {
    return (
      <p className="p-8 text-sm text-muted-foreground">{t("cases.notFound")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <MetaHelmet title={selected.caseNumber} noindex />
      <Link
        to="/client"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} /> {t("cases.backToList")}
      </Link>
      <div>
        <div className="text-[10px] font-bold tracking-wide text-primary">
          {selected.caseNumber}
        </div>
        <h1 className="mt-1 font-[Manrope] text-2xl font-bold">{selected.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`cases.status.${selected.status}`, {
            defaultValue: selected.status,
          })}
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-foreground">
          <input
            type="checkbox"
            checked={Boolean(selected.involvesFatality)}
            onChange={(e) => {
              void dispatch(
                updateClientCaseFlags({
                  publicUuid,
                  involvesFatality: e.target.checked,
                }),
              ).then(() => {
                void dispatch(fetchClientCaseDetail(publicUuid));
              });
            }}
            className="h-4 w-4 rounded border-input"
          />
          {t("cases.involvesFatality")}
        </label>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error === "flags_failed"
            ? t("cases.flagsFailed")
            : error === "category_failed"
              ? t("cases.categoryFailed")
              : error}
        </p>
      ) : null}

      {documentCompleteness ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.documentCompleteness")}</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {(
              [
                ["intake", documentCompleteness.intake],
                ["additionalDocs", documentCompleteness.additionalDocs],
              ] as const
            ).map(([key, info]) => (
              <li key={key}>
                <p className="font-semibold">
                  {t(`cases.docPhase.${key}`)} ·{" "}
                  {info.complete
                    ? t("cases.docComplete")
                    : t("cases.docIncomplete")}
                </p>
                {info.missing.length > 0 ? (
                  <p className="mt-0.5 text-muted-foreground">
                    {t("cases.docMissing")}:{" "}
                    {info.missing
                      .map((cat) =>
                        t(`cases.docCategory.${cat}`, { defaultValue: cat }),
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-0.5 text-muted-foreground">
                    {t("cases.docNoneMissing")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-bold">{t("cases.documents")}</h2>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
            <FileUp size={14} />
            {t("cases.upload")}
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                void onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="mt-3 max-w-xs">
          <DocumentCategorySelect
            value={uploadCategory}
            onChange={setUploadCategory}
            clientPortal
          />
          <FieldHelper>{t("help.caseDetail.documentCategoryClient")}</FieldHelper>
        </div>
        <ul className="mt-3 space-y-2">
          {documents.map((d) => (
            <li
              key={d.publicUuid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{d.title}</p>
                <div className="mt-1 max-w-[14rem]">
                  <DocumentCategorySelect
                    value={d.category}
                    clientPortal
                    onChange={(category) => {
                      void dispatch(
                        updateClientDocumentCategory({
                          publicUuid,
                          documentUuid: d.publicUuid,
                          category,
                        }),
                      ).then(() => refresh());
                    }}
                  />
                </div>
              </div>
              {d.storageKey ? (
                <a
                  href={d.storageKey}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary"
                >
                  {t("cases.open")}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">{t("client.sharedNotes")}</h2>
        <ul className="mt-3 space-y-2">
          {notes.length === 0 ? (
            <li className="text-xs text-muted-foreground">{t("client.noNotes")}</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
                {n.body}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">{t("client.reports")}</h2>
        <ul className="mt-3 space-y-2">
          {technicalReports.length === 0 ? (
            <li className="text-xs text-muted-foreground">
              {t("client.noReports")}
            </li>
          ) : (
            technicalReports.map((r) => (
              <li
                key={r.publicUuid}
                className="rounded-xl border border-border px-3 py-2 text-xs"
              >
                <div className="font-semibold">
                  v{r.versionNumber} ·{" "}
                  {t(`client.reportStatus.${r.status}`, {
                    defaultValue: r.status,
                  })}
                </div>
                {r.status === "external_review" ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
                      onClick={() => onReview(r.publicUuid, "approved")}
                    >
                      {t("client.approveReport")}
                    </button>
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
                      onClick={() => onReview(r.publicUuid, "changes_requested")}
                    >
                      {t("client.requestChanges")}
                    </button>
                    <button
                      type="button"
                      disabled={reviewingReport}
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-destructive hover:text-destructive disabled:opacity-60"
                      onClick={() => onReview(r.publicUuid, "rejected")}
                    >
                      {t("client.rejectReport")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
