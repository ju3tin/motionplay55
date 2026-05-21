"use client"

import { useState } from "react"
import { AchievementCard, Achievement } from "@/components/achievements/achievement-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const categories = [
  { id: "all", label: "All" },
  { id: "motion", label: "Motion" },
  { id: "streak", label: "Streaks" },
  { id: "score", label: "Scores" },
  { id: "social", label: "Social" },
  { id: "special", label: "Special" },
]

const filters = [
  { id: "all", label: "All" },
  { id: "unlocked", label: "Unlocked" },
  { id: "in-progress", label: "In Progress" },
  { id: "locked", label: "Locked" },
]

interface AchievementsGridProps {
  achievements: Achievement[]
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedFilter, setSelectedFilter] = useState("all")

  const filteredAchievements = achievements.filter((achievement) => {
    const categoryMatch = selectedCategory === "all" || achievement.category === selectedCategory
    const statusMatch = selectedFilter === "all" || achievement.status === selectedFilter
    return categoryMatch && statusMatch
  })

  const unlockedCount = achievements.filter(a => a.status === "unlocked").length
  const inProgressCount = achievements.filter(a => a.status === "in-progress").length
  const lockedCount = achievements.filter(a => a.status === "locked").length

  return (
    <div>
      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-secondary/50 p-1">
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((filter) => {
          let count = 0
          if (filter.id === "all") count = achievements.length
          else if (filter.id === "unlocked") count = unlockedCount
          else if (filter.id === "in-progress") count = inProgressCount
          else if (filter.id === "locked") count = lockedCount

          return (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {filter.label}
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-background/20 text-xs">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No achievements found</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try changing your filters</p>
        </div>
      )}
    </div>
  )
}
