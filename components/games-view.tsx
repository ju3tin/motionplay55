'use client'

import { useState } from "react"
import { GameCard } from "@/components/game-card"
import Competitions from "@/components/competitions/dude5"

import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

type ViewMode = 'games' | 'competitions'

interface GamesViewProps {
  games: any[]
}

const iconMap: Record<string, LucideIcon> = {
  Hand: Icons.Hand,
  Target: Icons.Target,
  Swords: Icons.Swords,
  Music: Icons.Music,
  Dumbbell: Icons.Dumbbell,
  Bird: Icons.Bird,
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
          Choose a game or join a live competition.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3 mb-10">
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

      {/* Games */}
      {view === 'games' && (
        <>
          {/* Filter */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-sm text-muted-foreground">
              Filter by difficulty:
            </span>

            {["All", "Easy", "Medium", "Hard"].map(filter => (
              <button
                key={filter}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                  filter === "All"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const Icon = iconMap[game.icon]

              return (
                <GameCard
                  key={game.game_id}
                  id={game.game_id}
                  title={game.title}
                  description={game.description}
                  icon={Icon}
                  difficulty={game.difficulty}
                  duration={game.duration}
                  calories={game.calories}
                  players={game.players}
                  color={game.color}
                  link={game.link}
                  isLocked={game.isLocked}
                />
              )
            })}
          </div>

          {/* Tips */}
          <div className="mt-16 p-8 rounded-2xl bg-secondary/50 border border-border">
            <h2 className="font-serif text-2xl font-bold mb-4">
              Tips for Best Experience
            </h2>

            <ul className="grid md:grid-cols-2 gap-4 text-muted-foreground">
              {[
                "Make sure you have good lighting so the camera can see you clearly.",
                "Stand about 6–8 feet away from your camera for full body detection.",
                "Wear fitted clothing for more accurate pose detection.",
                "Clear the space around you to avoid bumping into objects.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>

                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Competitions */}
      {view === 'competitions' && (
        <Competitions />
      )}
    </>
  )
}