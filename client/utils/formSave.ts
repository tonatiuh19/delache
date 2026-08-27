import { settleAsyncThunkResult } from "@shared/formSaveRules";
import { toast } from "@/hooks/use-toast";

/** Returns true only when the thunk fulfilled; keeps form values on failure. */
export function notifyThunkSave(
  result: unknown,
  opts: {
    successTitle?: string;
    failureTitle: string;
    fallbackError?: string;
    silentSuccess?: boolean;
  },
): boolean {
  const settled = settleAsyncThunkResult(
    result,
    opts.fallbackError || "save_failed",
  );
  if (settled.ok === false) {
    toast({
      title: opts.failureTitle,
      description: settled.error,
      variant: "destructive",
    });
    return false;
  }
  if (!opts.silentSuccess && opts.successTitle) {
    toast({ title: opts.successTitle });
  }
  return true;
}
