"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Trophy, Users, Clock, ChevronRight } from "lucide-react"

export interface Competition {
  id: string
  name: string
  description: string
  game: string
  startDate: string
  endDate: string
  prizePool: string
  participants: number
  maxParticipants: number
  status: "upcoming" | "active" | "ended"
  userRank?: number
}

interface CompetitionCardProps {
  competition: Competition
  onJoin?: (competitionId: string) => void
}

export function CompetitionCard({ competition, onJoin }: CompetitionCardProps) {
  const router = useRouter()
  
  const statusConfig = {
    upcoming: {
      label: "Upcoming",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    active: {
      label: "Live Now",
      color: "bg-primary/20 text-primary border-primary/30",
    },
    ended: {
      label: "Ended",
      color: "bg-muted text-muted-foreground border-border",
    },
  }

  const status = statusConfig[competition.status]
  const participantPercentage = (competition.participants / competition.maxParticipants) * 100

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-primary/30",
      competition.status === "active" && "border-primary/20"
    )}>
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium border",
          status.color
        )}>
          {competition.status === "active" && (
            <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
          )}
          {status.label}
        </span>
        {competition.userRank && (
          <div className="flex items-center gap-1.5 text-accent">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold">#{competition.userRank}</span>
          </div>
        )}
      </div>

      {/* Competition Info */}
      <h3 className="text-lg font-bold text-foreground mb-1">{competition.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{competition.description}</p>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{competition.participants.toLocaleString()}/{competition.maxParticipants.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{competition.status === "upcoming" ? `Starts ${competition.startDate}` : `Ends ${competition.endDate}`}</span>
        </div>
      </div>

      {/* Participant Bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${participantPercentage}%` }}
          />
        </div>
      </div>

      {/* Prize Pool & Action */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground">Prize Pool</span>
          <p className="text-lg font-bold text-accent">{competition.prizePool}</p>
        </div>
        {competition.status !== "ended" && (
          <button
            onClick={() => {
              if (competition.userRank) {
                router.push(`/competition/${competition.id}`)
              } else {
                router.push(`/competition/${competition.id}/join`)
              }
              onJoin?.(competition.id)
            }}
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              competition.userRank
                ? "bg-secondary text-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {competition.userRank ? "View" : "Join"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Glow Effect */}
      {competition.status === "active" && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-transparent to-accent/10 rounded-xl" />
        </div>
      )}
    </div>
  )
}
