"use client"

import { Trophy, Zap, Flame, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface Activity {
  id: string
  type: "achievement" | "xp" | "streak" | "level"
  title: string
  description: string
  timestamp: string
  xp?: number
}

const typeConfig = {
  achievement: {
    icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/20",
  },
  xp: {
    icon: Zap,
    color: "text-accent",
    bg: "bg-accent/20",
  },
  streak: {
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-500/20",
  },
  level: {
    icon: Star,
    color: "text-yellow-400",
    bg: "bg-yellow-400/20",
  },
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type]
          const Icon = config.icon

          return (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-4 pb-4",
                index !== activities.length - 1 && "border-b border-border"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{activity.timestamp}</p>
              </div>
              {activity.xp && (
                <div className="flex items-center gap-1 text-accent">
                  <Zap className="w-4 h-4" />
                  <span className="font-semibold text-sm">+{activity.xp}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
