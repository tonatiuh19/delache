import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
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
      await dispatch(
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
                void dispatch(
                  recordPayment({
                    publicUuid: inv.publicUuid,
                    amount: inv.totalAmount,
                    method: "transfer",
                  }),
                ).then(() =>
                  dispatch(
                    fetchInvoices({
                      ...gridParams,
                      q: query.trim() || undefined,
                    }),
                  ),
                );
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

      <form
        onSubmit={form.handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2"
      >
        <select
          name="caseId"
          value={form.values.caseId}
          onChange={form.handleChange}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
        >
          <option value="">{t("finance.selectCase")}</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseNumber} — {c.title}
            </option>
          ))}
        </select>
        <select
          name="invoiceType"
          value={form.values.invoiceType}
          onChange={form.handleChange}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {(["advance", "final", "expense", "other"] as const).map((type) => (
            <option key={type} value={type}>
              {t(`finance.type.${type}`, { defaultValue: type })}
            </option>
          ))}
        </select>
        <input
          name="totalAmount"
          value={form.values.totalAmount}
          onChange={form.handleChange}
          placeholder={t("finance.amountPlaceholder")}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
          <input
            type="checkbox"
            name="issue"
            checked={form.values.issue}
            onChange={form.handleChange}
          />
          {t("finance.issueNow")}
        </label>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
        >
          {t("finance.create")}
        </button>
      </form>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

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
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
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
      </div>
    </div>
  );
}
