"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import SearchField from "@/components/ui/SearchField";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  accessor?: (row: T) => string | number | null | undefined;
  render: (row: T, index: number) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: Array<(row: T) => string | number | null | undefined>;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
};

export default function DataTable<T>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Rechercher...",
  searchKeys,
  pagination = false,
  pageSize = 10,
  emptyMessage = "Aucune donnée à afficher",
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((fn) => String(fn(row) ?? "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return filtered;
    const accessor = col.accessor;
    const arr = [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = pagination ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = pagination
    ? sorted.slice((page - 1) * pageSize, page * pageSize)
    : sorted;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-3">
      {searchable && (
        <SearchField
          wrapperClassName="max-w-xs"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="table-dark min-w-full">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      col.className,
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 text-slate-600 transition hover:text-slate-900"
                      >
                        {col.header}
                        <span className="flex flex-col">
                          <ChevronUp
                            className={cn(
                              "h-2.5 w-2.5 -mb-0.5",
                              sortKey === col.key && sortDir === "asc"
                                ? "text-[#2F5F9D]"
                                : "text-slate-300"
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              "h-2.5 w-2.5",
                              sortKey === col.key && sortDir === "desc"
                                ? "text-[#2F5F9D]"
                                : "text-slate-300"
                            )}
                          />
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                current.map((row, idx) => (
                  <motion.tr
                    key={rowKey(row, idx)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          col.className,
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center"
                        )}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-slate-600">
          <span>
            <span className="font-mono font-medium text-slate-900">{(page - 1) * pageSize + 1}</span>
            {" – "}
            <span className="font-mono font-medium text-slate-900">
              {Math.min(page * pageSize, sorted.length)}
            </span>
            {" sur "}
            <span className="font-mono font-medium text-slate-900">{sorted.length}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-slate-900">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
