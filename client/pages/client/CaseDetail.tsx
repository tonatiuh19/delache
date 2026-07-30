import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileUp } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientCaseDetail,
  uploadClientDocument,
} from "@/store/slices/clientSlice";

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
  const { selected, notes, documents, technicalReports, detailLoading, error } =
    useAppSelector((s) => s.client);

  useEffect(() => {
    if (publicUuid) void dispatch(fetchClientCaseDetail(publicUuid));
  }, [dispatch, publicUuid]);

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
        category: "lawsuit",
        data,
      }),
    );
  };

  if (detailLoading && !selected) {
    return (
      <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>
    );
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
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
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
        <ul className="mt-3 space-y-2">
          {documents.map((d) => (
            <li
              key={d.publicUuid}
              className="flex justify-between rounded-xl border border-border px-3 py-2 text-xs"
            >
              <span>{d.title}</span>
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
                v{r.versionNumber} · {r.status}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
