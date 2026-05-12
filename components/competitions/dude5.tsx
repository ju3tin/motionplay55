'use client'

import { useEffect, useState } from 'react'

interface Competition {
  id: string
  title: string
  prize: number
  players: number
  maxPlayers: number
  status: 'live' | 'ended'
}

export default function Competitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([])

  useEffect(() => {
    async function loadCompetitions() {
      // Replace with real fetch later
      setCompetitions([
        {
          id: '1',
          title: 'Push-Up Challenge',
          prize: 2.5,
          players: 8,
          maxPlayers: 10,
          status: 'live',
        },
        {
          id: '2',
          title: 'Reaction Speed Cup',
          prize: 5,
          players: 16,
          maxPlayers: 20,
          status: 'live',
        },
        {
          id: '3',
          title: 'Dance Battle',
          prize: 1.2,
          players: 12,
          maxPlayers: 12,
          status: 'ended',
        },
      ])
    }

    loadCompetitions()
  }, [])

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {competitions.map((comp) => (
        <div
          key={comp.id}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                comp.status === 'live'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {comp.status === 'live' ? '● LIVE' : 'ENDED'}
            </span>

            <span className="text-sm text-muted-foreground">
              {comp.players}/{comp.maxPlayers}
            </span>
          </div>

          <h3 className="text-xl font-semibold mb-3">
            {comp.title}
          </h3>

          <div className="mb-5">
            <p className="text-sm text-muted-foreground mb-1">
              Prize Pool
            </p>

            <p className="text-2xl font-bold text-primary">
              {comp.prize} SOL
            </p>
          </div>

          <button
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Join Competition
          </button>
        </div>
      ))}
    </div>
  )
}