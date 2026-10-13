import type { ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PaginationInfo } from "@shared/api";

export interface DataGridColumn<T> {
  /** Field name — also used as the sort key when `sortable: true` */
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  sticky?: boolean;
  shrink?: boolean;
  wrap?: boolean;
  render?: (item: T, index: number) => ReactNode;
}

interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  rowKey: (item: T) => string | number;
  sortBy: string;
  sortDir: "ASC" | "DESC";
  onSort: (key: string) => void;
  pagination?: PaginationInfo | null;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  mobileCard?: (item: T) => ReactNode;
  /** @deprecated Ignored — table scrolls dynamically */
  tableMinWidth?: string;
  colSpan?: number;
  onRowClick?: (item: T) => void;
  noBleeding?: boolean;
  showingLabel?: (opts: {
    from: number;
    to: number;
    total: number;
  }) => string;
  pageLabel?: (opts: { page: number; totalPages: number }) => string;
}

function SortIcon({
  column,
  sortBy,
  sortDir,
}: {
  column: string;
  sortBy: string;
  sortDir: "ASC" | "DESC";
}) {
  if (sortBy !== column)
    return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "ASC" ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}

function stickyClasses(isSticky: boolean, bg = "bg-card") {
  return isSticky
    ? `sticky left-0 z-10 ${bg} shadow-[1px_0_0_0_hsl(var(--border))]`
    : "";
}

export function DataGrid<T>({
  data,
  columns,
  rowKey,
  sortBy,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  isLoading = false,
  emptyMessage = "No data found.",
  mobileCard,
  onRowClick,
  noBleeding = true,
  showingLabel,
  pageLabel,
}: DataGridProps<T>) {
  const paginationFooter = pagination && pagination.total > 0 && (
    <div className="mt-4 flex flex-col gap-3 px-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {showingLabel
          ? showingLabel({
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              ),
              total: pagination.total,
            })
          : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`}
      </span>
      {pagination.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs">
            {pageLabel
              ? pageLabel({
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {mobileCard || columns.length > 0 ? (
        <div className="block space-y-3 sm:hidden">
          {data.map((item, index) =>
            mobileCard ? (
              <div key={rowKey(item)}>{mobileCard(item)}</div>
            ) : (
              <div
                key={rowKey(item)}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "rounded-xl border border-border bg-background p-4 text-left",
                  onRowClick && "cursor-pointer transition hover:border-primary/40",
                )}
              >
                {columns.slice(0, 5).map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      "py-1.5",
                      col.key !== columns[0]?.key && "border-t border-border/60",
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {col.label}
                    </p>
                    <div className="mt-0.5 text-sm text-foreground">
                      {col.render
                        ? col.render(item, index)
                        : String(
                            (item as Record<string, unknown>)[col.key] ?? "—",
                          )}
                    </div>
                  </div>
                ))}
              </div>
            ),
          )}
        </div>
      ) : null}

      <div
        className={cn(
          mobileCard || columns.length > 0 ? "hidden sm:block" : "block",
          "max-w-full",
          noBleeding ? "overflow-x-auto overscroll-x-contain" : "-mx-6 overflow-x-auto overscroll-x-contain px-0",
        )}
      >
        <Table className="w-max min-w-full">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap",
                    col.shrink && "w-px",
                    col.sticky && stickyClasses(true, "bg-card"),
                    col.sticky && "z-20",
                    col.className,
                    col.headerClassName,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {col.label}{" "}
                      <SortIcon
                        column={col.key}
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={rowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      !col.wrap && "whitespace-nowrap",
                      col.wrap && "max-w-[260px] break-words",
                      col.shrink && "w-px",
                      col.sticky && stickyClasses(true),
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(item, index)
                      : String(
                          (item as Record<string, unknown>)[col.key] ?? "—",
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {paginationFooter}
    </>
  );
}
