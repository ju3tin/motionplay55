"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { 
  Trophy, 
  Flame, 
  Zap, 
  Target, 
  Star, 
  Medal, 
  Crown, 
  Rocket,
  Timer,
  Heart,
  Lock
} from "lucide-react"

export type AchievementRarity = "common" | "rare" | "epic" | "legendary"
export type AchievementStatus = "locked" | "in-progress" | "unlocked"

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: AchievementRarity
  status: AchievementStatus
  progress?: number
  maxProgress?: number
  xpReward: number
  unlockedAt?: string
  category: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  zap: Zap,
  target: Target,
  star: Star,
  medal: Medal,
  crown: Crown,
  rocket: Rocket,
  timer: Timer,
  heart: Heart,
}

const rarityStyles: Record<AchievementRarity, { border: string; glow: string; badge: string; text: string }> = {
  common: {
    border: "border-muted-foreground/30",
    glow: "",
    badge: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
  },
  rare: {
    border: "border-blue-500/50",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    badge: "bg-blue-500/20 text-blue-400",
    text: "text-blue-400",
  },
  epic: {
    border: "border-purple-500/50",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.25)]",
    badge: "bg-purple-500/20 text-purple-400",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-accent/60",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.3)]",
    badge: "bg-accent/20 text-accent",
    text: "text-accent",
  },
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [isHovered, setIsHovered] = useState(false)
  const IconComponent = iconMap[achievement.icon] || Trophy
  const rarityStyle = rarityStyles[achievement.rarity]
  const isLocked = achievement.status === "locked"
  const isUnlocked = achievement.status === "unlocked"
  const progressPercent = achievement.progress && achievement.maxProgress 
    ? (achievement.progress / achievement.maxProgress) * 100 
    : 0

  return (
    <div
      className={cn(
        "relative group rounded-xl border-2 p-5 transition-all duration-300 cursor-pointer",
        "bg-card hover:bg-card/80",
        rarityStyle.border,
        isUnlocked && rarityStyle.glow,
        isHovered && !isLocked && "scale-[1.02]",
        isLocked && "opacity-60 grayscale"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rarity Badge */}
      <div className={cn(
        "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
        rarityStyle.badge
      )}>
        {achievement.rarity}
      </div>

      {/* Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300",
        isUnlocked ? "bg-primary/20" : "bg-muted",
        isHovered && !isLocked && "rotate-6"
      )}>
        {isLocked ? (
          <Lock className="w-7 h-7 text-muted-foreground" />
        ) : (
          <IconComponent className={cn(
            "w-7 h-7",
            isUnlocked ? "text-primary" : rarityStyle.text
          )} />
        )}
      </div>

      {/* Content */}
      <h3 className={cn(
        "font-bold text-lg mb-1",
        isUnlocked ? "text-foreground" : "text-foreground/80"
      )}>
        {achievement.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {achievement.description}
      </p>

      {/* Progress Bar */}
      {achievement.status === "in-progress" && achievement.progress !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{achievement.progress}/{achievement.maxProgress}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent">+{achievement.xpReward} XP</span>
        </div>
        {isUnlocked && achievement.unlockedAt && (
          <span className="text-xs text-muted-foreground">
            {achievement.unlockedAt}
          </span>
        )}
      </div>

      {/* Unlocked Checkmark */}
      {isUnlocked && (
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}
