"use client"

import { cn } from "@/lib/utils"
import { 
  Gamepad2, 
  Target, 
  Zap, 
  Dumbbell, 
  Music, 
  Swords,
  LucideIcon
} from "lucide-react"

export interface GameOption {
  id: string
  name: string
  icon: string
  playerCount: number
  color: string
}

interface GameSelectorProps {
  games: GameOption[]
  selectedGame: string
  onSelectGame: (gameId: string) => void
}

const iconMap: Record<string, LucideIcon> = {
  gamepad: Gamepad2,
  target: Target,
  zap: Zap,
  dumbbell: Dumbbell,
  music: Music,
  swords: Swords,
}

export function GameSelector({ games, selectedGame, onSelectGame }: GameSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {games.map((game) => {
        const Icon = iconMap[game.icon] || Gamepad2
        const isSelected = selectedGame === game.id
        
        return (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap",
              isSelected
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-card border-border text-muted-foreground hover:bg-card/80 hover:text-foreground"
            )}
          >
            <div 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isSelected ? "bg-primary/20" : "bg-secondary"
              )}
              style={isSelected ? { backgroundColor: `${game.color}20` } : undefined}
            >
              <Icon 
                className="w-4 h-4" 
                style={isSelected ? { color: game.color } : undefined}
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{game.name}</span>
              <span className="text-xs text-muted-foreground">
                {game.playerCount.toLocaleString()} players
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
