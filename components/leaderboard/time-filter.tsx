"use client"

import { cn } from "@/lib/utils"

export type TimeFilter = "daily" | "weekly" | "monthly" | "all-time"

interface TimeFilterProps {
  selected: TimeFilter
  onSelect: (filter: TimeFilter) => void
}

const filters: { id: TimeFilter; label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "all-time", label: "All Time" },
]

export function TimeFilterTabs({ selected, onSelect }: TimeFilterProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-secondary rounded-lg">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onSelect(filter.id)}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            selected === filter.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
