import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "./table";
import type { SortDirection } from "@/hooks/useTableSort";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSortKey: string;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  children: React.ReactNode;
}

export function SortableTableHead({
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  children,
  className,
  ...props
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="ml-1">
          {isActive && currentDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : isActive && currentDirection === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </span>
      </div>
    </TableHead>
  );
}
