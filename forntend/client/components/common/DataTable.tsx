import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  actions?: (row: T) => React.ReactNode;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export default function DataTable<T extends { id?: string; [key: string]: any }>({
  columns,
  data,
  title,
  subtitle,
  actions,
  searchable = false,
  searchFields = [],
  onRowClick,
  loading = false,
  emptyState,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: "asc" | "desc";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter data based on search
  let filteredData = data;
  if (searchQuery && searchFields.length > 0) {
    filteredData = data.filter((row) =>
      searchFields.some((field) =>
        String(row[field])
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    );
  }

  // Sort data
  if (sortConfig) {
    filteredData = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: keyof T) => {
    if (!sortConfig || sortConfig.key !== key) {
      setSortConfig({ key, direction: "asc" });
    } else if (sortConfig.direction === "asc") {
      setSortConfig({ key, direction: "desc" });
    } else {
      setSortConfig(null);
    }
  };

  const getSortIcon = (key: keyof T) => {
    if (sortConfig?.key !== key)
      return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="card-premium p-6 flex flex-col">
      {/* Header */}
      {(title || subtitle || searchable) && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-bold">{title}</h3>}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {searchable && (
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium md:w-48"
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredData.length === 0 ? (
          emptyState ? (
            emptyState
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-4 py-3 text-left font-semibold text-muted-foreground ${column.width || ""}`}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                      >
                        {column.label}
                        {getSortIcon(column.key)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3">
                      {column.render ? (
                        column.render(row[column.key], row)
                      ) : (
                        <span>{row[column.key]}</span>
                      )}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
