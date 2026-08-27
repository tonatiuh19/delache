import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  /** Shown while pending; defaults to `common.saving` */
  pendingLabel?: string;
  children?: ReactNode;
};

/**
 * Primary/secondary submit control with spinner + disabled state while pending.
 * Use for Formik `isSubmitting` and thunk-driven mutations.
 */
export default function PendingSubmitButton({
  pending = false,
  pendingLabel,
  className,
  children,
  disabled,
  type = "submit",
  ...rest
}: PendingSubmitButtonProps) {
  const { t } = useTranslation();
  const label =
    pending && pendingLabel
      ? pendingLabel
      : pending
        ? t("common.saving")
        : children;

  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : null}
      {label}
    </button>
  );
}
