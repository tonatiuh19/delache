import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { InvoiceSummary } from "@shared/api";
import type { ListadoProgress } from "@shared/processGates";
import { cn } from "@/lib/utils";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { useAppDispatch } from "@/store/hooks";
import { recordPayment } from "@/store/slices/portalSlice";
import { fetchCaseDetail } from "@/store/slices/casesSlice";
import { notifyThunkSave } from "@/utils/formSave";

export default function CaseFinancePanel({
  publicUuid,
  caseId,
  invoices,
  listado,
}: {
  publicUuid: string;
  caseId: number;
  invoices: InvoiceSummary[];
  listado?: ListadoProgress | null;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-6">
      {listado ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["advanceReleased", listado.advanceReleased],
              ["advancePaid", listado.advancePaid],
              ["finalReleased", listado.finalReleased],
              ["finalPaid", listado.finalPaid],
            ] as const
          ).map(([key, on]) => (
            <div
              key={key}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                on
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/20",
              )}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t(`listado.flag.${key}`)}
              </div>
              <div className="mt-1 font-semibold text-foreground">
                {on ? t("cases.financeFlagOn") : t("cases.financeFlagOff")}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/portal/finance?caseId=${caseId}`}
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t("cases.financeOpenFull")}
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("cases.noInvoices")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {invoices.map((inv) => (
            <li
              key={inv.publicUuid}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm"
            >
              <div>
                <div className="font-semibold">
                  {inv.invoiceNumber} ·{" "}
                  {t(`finance.type.${inv.invoiceType}`, {
                    defaultValue: inv.invoiceType,
                  })}
                </div>
                <div className="text-muted-foreground">
                  {inv.totalAmount.toLocaleString()} {inv.currency} ·{" "}
                  {t(`finance.status.${inv.status}`, {
                    defaultValue: inv.status,
                  })}
                </div>
              </div>
              {inv.status !== "paid" && inv.status !== "void" ? (
                <PendingSubmitButton
                  type="button"
                  className="h-9 w-full text-xs font-bold"
                  onClick={() => {
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
                        void dispatch(fetchCaseDetail(publicUuid));
                      }
                    })();
                  }}
                >
                  {t("finance.markPaid")}
                </PendingSubmitButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
