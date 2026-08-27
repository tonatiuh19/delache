import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Info, Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createInvoice,
  fetchInvoices,
  recordPayment,
} from "@/store/slices/portalSlice";
import { fetchCases } from "@/store/slices/casesSlice";
import type { InvoiceSummary } from "@shared/api";
import { useGridListState } from "@/hooks/useGridListState";
import { notifyThunkSave } from "@/utils/formSave";

export default function FinancePage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { invoices, invoicesPagination, loadingInvoices, error } =
    useAppSelector((s) => s.portal);
  const { items: cases } = useAppSelector((s) => s.cases);
  const [query, setQuery] = useState("");
  const { page, setPage, sortBy, sortDir, onSort, gridParams } =
    useGridListState("created_at", 20);

  useEffect(() => {
    void dispatch(
      fetchCases({ limit: 100, sortBy: "case_number", sortDir: "ASC" }),
    );
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      fetchInvoices({
        ...gridParams,
        q: query.trim() || undefined,
      }),
    );
  }, [dispatch, gridParams, query]);

  const form = useFormik({
    initialValues: {
      caseId: "",
      invoiceType: "advance",
      totalAmount: "",
      issue: true,
    },
    validationSchema: Yup.object({
      caseId: Yup.string().required(),
      totalAmount: Yup.number().typeError("n").min(0).required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createInvoice({
          caseId: Number(values.caseId),
          invoiceType: values.invoiceType as
            | "advance"
            | "final"
            | "expense"
            | "other",
          totalAmount: Number(values.totalAmount),
          issue: values.issue,
        }),
      );
      if (
        notifyThunkSave(result, {
          failureTitle: t("finance.invoiceSaveFailed"),
          fallbackError: "invoice_create_failed",
          silentSuccess: true,
        })
      ) {
        helpers.resetForm({
          values: {
            caseId: "",
            invoiceType: "advance",
            totalAmount: "",
            issue: true,
          },
        });
        void dispatch(
          fetchInvoices({
            ...gridParams,
            q: query.trim() || undefined,
          }),
        );
      }
    },
  });

  const columns = useMemo((): DataGridColumn<InvoiceSummary>[] => {
    return [
      {
        key: "invoice_number",
        label: t("finance.colNumber"),
        sortable: true,
        sticky: true,
        render: (inv) => (
          <span className="font-semibold">{inv.invoiceNumber}</span>
        ),
      },
      {
        key: "invoice_type",
        label: t("finance.colType"),
        sortable: true,
        shrink: true,
        render: (inv) =>
          t(`finance.type.${inv.invoiceType}`, {
            defaultValue: inv.invoiceType,
          }),
      },
      {
        key: "status",
        label: t("finance.colStatus"),
        sortable: true,
        shrink: true,
      },
      {
        key: "total_amount",
        label: t("finance.colAmount"),
        sortable: true,
        shrink: true,
        render: (inv) =>
          `${inv.totalAmount.toLocaleString()} ${inv.currency}`,
      },
      {
        key: "due_at",
        label: t("finance.colDue"),
        sortable: true,
        shrink: true,
        render: (inv) =>
          inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : "—",
      },
      {
        key: "actions",
        label: "",
        shrink: true,
        render: (inv) =>
          inv.status !== "paid" && inv.status !== "void" ? (
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase"
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  const result = await dispatch(
                    recordPayment({
                      publicUuid: inv.publicUuid,
                      amount: inv.totalAmount,
                      method: "transfer",
                    }),
                  );
                  if (
                    notifyThunkSave(result, {
                      failureTitle: t("finance.paymentSaveFailed"),
                      fallbackError: "payment_failed",
                      silentSuccess: true,
                    })
                  ) {
                    void dispatch(
                      fetchInvoices({
                        ...gridParams,
                        q: query.trim() || undefined,
                      }),
                    );
                  }
                })();
              }}
            >
              {t("finance.markPaid")}
            </button>
          ) : (
            "—"
          ),
      },
    ];
  }, [t, dispatch, gridParams, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <MetaHelmet title={t("portal.finance")} noindex />
      <PortalPageHeader
        eyebrow={t("finance.eyebrow")}
        title={t("portal.finance")}
        description={t("finance.subtitle")}
      />

      <div
        role="note"
        className="flex gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground"
      >
        <Info
          size={18}
          className="mt-0.5 shrink-0 text-primary"
          aria-hidden
        />
        <p className="leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t("finance.captureOnlyTitle")}
          </span>{" "}
          {t("finance.captureOnlyBody")}
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <SectionHelper>{t("help.finance.section")}</SectionHelper>
        </div>
        <div className="sm:col-span-2">
          <select
            name="caseId"
            value={form.values.caseId}
            onChange={form.handleChange}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("finance.selectCase")}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {c.title}
              </option>
            ))}
          </select>
          <FieldHelper>{t("help.finance.case")}</FieldHelper>
        </div>
        <div>
          <select
            name="invoiceType"
            value={form.values.invoiceType}
            onChange={form.handleChange}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {(["advance", "final", "expense", "other"] as const).map((type) => (
              <option key={type} value={type}>
                {t(`finance.type.${type}`, { defaultValue: type })}
              </option>
            ))}
          </select>
          <FieldHelper>{t("help.finance.type")}</FieldHelper>
        </div>
        <div>
          <input
            name="totalAmount"
            value={form.values.totalAmount}
            onChange={form.handleChange}
            placeholder={t("finance.amountPlaceholder")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.finance.amount")}</FieldHelper>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              name="issue"
              checked={form.values.issue}
              onChange={form.handleChange}
            />
            {t("finance.issueNow")}
          </span>
          <FieldHelper className="mt-0">{t("help.finance.issue")}</FieldHelper>
        </label>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
        >
          {t("finance.create")}
        </button>
      </form>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <PortalListPanel
        toolbar={
          <div>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("finance.searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
              />
            </div>
            <FieldHelper className="mt-2">{t("help.finance.search")}</FieldHelper>
          </div>
        }
      >
        <DataGrid<InvoiceSummary>
          data={invoices}
          columns={columns}
          rowKey={(inv) => inv.publicUuid}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          pagination={invoicesPagination}
          onPageChange={setPage}
          isLoading={loadingInvoices}
          emptyMessage={t("finance.empty")}
          noBleeding
          showingLabel={({ from, to, total }) =>
            t("grid.showing", { from, to, total })
          }
          pageLabel={({ page: p, totalPages }) =>
            t("grid.pageOf", { page: p, totalPages })
          }
        />
      </PortalListPanel>
    </div>
  );
}
