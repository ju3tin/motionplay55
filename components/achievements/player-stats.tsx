"use client"

import { Progress } from "@/components/ui/progress"
import { Trophy, Flame, Zap, Target } from "lucide-react"

interface PlayerStatsProps {
  level: number
  currentXp: number
  xpToNextLevel: number
  totalAchievements: number
  unlockedAchievements: number
  currentStreak: number
  highScore: number
}

export function PlayerStats({
  level,
  currentXp,
  xpToNextLevel,
  totalAchievements,
  unlockedAchievements,
  currentStreak,
  highScore,
}: PlayerStatsProps) {
  const xpProgress = (currentXp / xpToNextLevel) * 100
  const achievementPercent = (unlockedAchievements / totalAchievements) * 100

  return (
    <div className="bg-card rounded-2xl border border-border p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Level & XP Section */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-black text-primary">{level}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">Level {level}</h2>
              <p className="text-sm text-muted-foreground mb-2">Motion Master</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>
          <Progress value={xpProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {(xpToNextLevel - currentXp).toLocaleString()} XP to next level
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Achievements"
            value={`${unlockedAchievements}/${totalAchievements}`}
            subtext={`${achievementPercent.toFixed(0)}% complete`}
            color="text-primary"
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Day Streak"
            value={currentStreak.toString()}
            subtext="Keep it going!"
            color="text-orange-500"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="High Score"
            value={highScore.toLocaleString()}
            subtext="Personal best"
            color="text-blue-400"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  color: string
}) {
  return (
    <div className="text-center p-4 rounded-xl bg-secondary/50">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
    </div>
  )
}
