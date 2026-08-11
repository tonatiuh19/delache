import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSearchResults,
  globalSearch,
} from "@/store/slices/portalSlice";

export default function GlobalSearchBar({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar";
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { searchResults, loadingSearch, searchQuery } = useAppSelector(
    (s) => s.portal,
  );
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useFormik({
    initialValues: { q: "" },
    validationSchema: Yup.object({
      q: Yup.string().trim().max(200),
    }),
    onSubmit: (values) => {
      const q = values.q.trim();
      if (!q) {
        dispatch(clearSearchResults());
        setOpen(false);
        return;
      }
      void dispatch(globalSearch(q));
      setOpen(true);
    },
  });

  useEffect(() => {
    const q = form.values.q.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      dispatch(clearSearchResults());
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void dispatch(globalSearch(q));
      setOpen(true);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dispatch, form.values.q]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showDropdown =
    open && (loadingSearch || searchResults.length > 0 || searchQuery.length > 0);

  const inputClass =
    variant === "sidebar"
      ? "h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/30"
      : "h-10 w-full rounded-xl border border-input bg-card pl-9 pr-9 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20";

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full",
        variant === "default" && "max-w-md",
        className,
      )}
    >
      <form onSubmit={form.handleSubmit} className="relative">
        <Search
          size={16}
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2",
            variant === "sidebar" ? "text-white/45" : "text-muted-foreground",
          )}
        />
        <input
          name="q"
          value={form.values.q}
          onChange={form.handleChange}
          onFocus={() => {
            if (form.values.q.trim()) setOpen(true);
          }}
          placeholder={t("search.placeholder")}
          className={inputClass}
          autoComplete="off"
        />
        {form.values.q ? (
          <button
            type="button"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1",
              variant === "sidebar"
                ? "text-white/45 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={t("common.cancel")}
            onClick={() => {
              void form.setFieldValue("q", "");
              dispatch(clearSearchResults());
              setOpen(false);
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </form>

      {showDropdown ? (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card p-2 text-foreground shadow-lg">
          {loadingSearch && searchResults.length === 0 ? (
            <div className="space-y-2 px-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1 rounded-xl px-2 py-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              ))}
            </div>
          ) : null}
          {!loadingSearch && searchResults.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t("search.empty")}
            </p>
          ) : null}
          <ul className="space-y-1">
            {searchResults.map((hit) => (
              <li key={`${hit.kind}-${hit.publicUuid}`}>
                <Link
                  to={hit.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 transition hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {hit.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-muted-foreground">
                      {t(`search.kind.${hit.kind}`, { defaultValue: hit.kind })}
                    </span>
                  </div>
                  {hit.subtitle ? (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {hit.subtitle}
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
