import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useTableSort<T>(data: T[] | undefined, defaultSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: "", direction: null }
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        // Cycle: asc -> desc -> null
        if (current.direction === "asc") return { key, direction: "desc" };
        if (current.direction === "desc") return { key: "", direction: null };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue, "es", { sensitivity: "base" });
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue), "es", { sensitivity: "base" });
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return sortedData;
    const query = searchQuery.toLowerCase().trim();
    return sortedData.filter((item) => {
      // Search in all string fields
      return Object.values(item as Record<string, unknown>).some((value) => {
        if (typeof value === "string") {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === "number") {
          return String(value).includes(query);
        }
        return false;
      });
    });
  }, [sortedData, searchQuery]);

  return {
    sortConfig,
    handleSort,
    searchQuery,
    setSearchQuery,
    sortedData,
    filteredData,
  };
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;
  for (const key of keys) {
    if (value === null || value === undefined) return null;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
