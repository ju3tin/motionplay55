"use client"

import { cn } from "@/lib/utils"
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface LeaderboardEntry {
  rank: number
  previousRank: number
  playerId: string
  playerName: string
  avatar: string
  score: number
  gamesPlayed: number
  winRate: number
  isCurrentUser?: boolean
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  showWinRate?: boolean
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
        <Trophy className="w-4 h-4 text-yellow-900" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Medal className="w-4 h-4 text-slate-800" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-600/30">
        <Award className="w-4 h-4 text-amber-200" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  )
}

function RankChange({ current, previous }: { current: number; previous: number }) {
  const diff = previous - current
  
  if (diff > 0) {
    return (
      <div className="flex items-center gap-0.5 text-primary">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs font-medium">+{diff}</span>
      </div>
    )
  }
  if (diff < 0) {
    return (
      <div className="flex items-center gap-0.5 text-destructive">
        <TrendingDown className="w-3 h-3" />
        <span className="text-xs font-medium">{diff}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center text-muted-foreground">
      <Minus className="w-3 h-3" />
    </div>
  )
}

export function LeaderboardTable({ entries, showWinRate = true }: LeaderboardTableProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div className="col-span-1">Rank</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-2 text-right">Score</div>
        <div className="col-span-2 text-right">Games</div>
        {showWinRate && <div className="col-span-2 text-right">Win Rate</div>}
      </div>
      
      {/* Entries */}
      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.playerId}
            className={cn(
              "grid grid-cols-12 gap-2 px-4 py-3 rounded-lg transition-colors",
              entry.isCurrentUser
                ? "bg-primary/10 border border-primary/30"
                : "bg-card hover:bg-card/80"
            )}
          >
            {/* Rank */}
            <div className="col-span-1 flex items-center gap-2">
              <RankBadge rank={entry.rank} />
            </div>
            
            {/* Player Info */}
            <div className="col-span-5 flex items-center gap-3">
              <div className="relative">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                    entry.rank === 1 && "ring-2 ring-yellow-500",
                    entry.rank === 2 && "ring-2 ring-slate-400",
                    entry.rank === 3 && "ring-2 ring-amber-600"
                  )}
                  style={{ backgroundColor: entry.avatar }}
                >
                  {entry.playerName.charAt(0)}
                </div>
                {entry.isCurrentUser && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-foreground">YOU</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "font-semibold truncate",
                  entry.isCurrentUser ? "text-primary" : "text-foreground"
                )}>
                  {entry.playerName}
                </span>
                <RankChange current={entry.rank} previous={entry.previousRank} />
              </div>
            </div>
            
            {/* Score */}
            <div className="col-span-2 flex items-center justify-end">
              <span className="font-bold text-foreground tabular-nums">
                {entry.score.toLocaleString()}
              </span>
            </div>
            
            {/* Games Played */}
            <div className="col-span-2 flex items-center justify-end">
              <span className="text-muted-foreground tabular-nums">
                {entry.gamesPlayed}
              </span>
            </div>
            
            {/* Win Rate */}
            {showWinRate && (
              <div className="col-span-2 flex items-center justify-end">
                <span className={cn(
                  "font-medium tabular-nums",
                  entry.winRate >= 70 ? "text-primary" :
                  entry.winRate >= 50 ? "text-accent" :
                  "text-muted-foreground"
                )}>
                  {entry.winRate}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
