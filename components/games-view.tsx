'use client'

import { useState } from "react"
import { GameCard } from "@/components/game-card"
import Competitions from "@/components/competitions/Competitions"

type ViewMode = 'games' | 'competitions'

interface GamesViewProps {
  games: any[]
}

export function GamesView({ games }: GamesViewProps) {
  const [view, setView] = useState<ViewMode>('games')

  return (
    <>
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
          MotionPlay
        </h1>

        <p className="text-muted-foreground text-lg max-w-2xl">
          Play games or join live competitions.
        </p>
      </div>

      {/* Toggle Buttons */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setView('games')}
          className={`px-5 py-2 rounded-full border transition-all ${
            view === 'games'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-primary/50'
          }`}
        >
          Games
        </button>

        <button
          onClick={() => setView('competitions')}
          className={`px-5 py-2 rounded-full border transition-all ${
            view === 'competitions'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-primary/50'
          }`}
        >
          Competitions
        </button>
      </div>

      {/* Games Grid */}
      {view === 'games' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.game_id}
              id={game.game_id}
              title={game.title}
              description={game.description}
              icon={game.iconComponent}
              difficulty={game.difficulty}
              duration={game.duration}
              calories={game.calories}
              players={game.players}
              color={game.color}
              link={game.link}
              isLocked={game.isLocked}
            />
          ))}
        </div>
      )}

      {/* Competitions Grid */}
      {view === 'competitions' && (
        <Competitions />
      )}
    </>
  )
}