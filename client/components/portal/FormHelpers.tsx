import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFormHelpersEnabled } from "@/hooks/useFormHelpers";

/**
 * Legacy under-field tip. Tip helpers were removed from product UI;
 * components remain for rare reuse and stay gated (default OFF).
 */
export function FieldHelper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const enabled = useFormHelpersEnabled();
  return (
    <AnimatePresence initial={false}>
      {enabled ? (
        <motion.p
          key="field-helper"
          role="note"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "mt-1.5 flex gap-1.5 text-[11px] leading-snug text-muted-foreground",
            className,
          )}
        >
          <Info
            size={12}
            className="mt-0.5 shrink-0 text-primary"
            aria-hidden
          />
          <span>{children}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Legacy section tip. Same gating as FieldHelper (default OFF).
 */
export function SectionHelper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const enabled = useFormHelpersEnabled();
  return (
    <AnimatePresence initial={false}>
      {enabled ? (
        <motion.div
          key="section-helper"
          role="note"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "mb-3 flex gap-2.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground",
            className,
          )}
        >
          <Info
            size={15}
            className="mt-0.5 shrink-0 text-primary"
            aria-hidden
          />
          <div className="min-w-0">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
