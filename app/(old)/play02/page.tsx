"use client"

import { useState } from "react"
import { GameSelector, GameOption } from "@/components/leaderboard/game-selector"
import { LeaderboardTable, LeaderboardEntry } from "@/components/leaderboard/leaderboard-table"
import { CompetitionCard, Competition } from "@/components/leaderboard/competition-card"
import { TimeFilterTabs, TimeFilter } from "@/components/leaderboard/time-filter"
import { Trophy, Gamepad2, Medal, Search, Plus, User } from "lucide-react"

const games: GameOption[] = [
  { id: "all", name: "All Games", icon: "gamepad", playerCount: 45892, color: "#22c55e" },
  { id: "pose-rush", name: "Pose Rush", icon: "zap", playerCount: 12453, color: "#f59e0b" },
  { id: "target-strike", name: "Target Strike", icon: "target", playerCount: 8921, color: "#ef4444" },
  { id: "rhythm-motion", name: "Rhythm Motion", icon: "music", playerCount: 15234, color: "#a855f7" },
  { id: "fitness-challenge", name: "Fitness Challenge", icon: "dumbbell", playerCount: 6782, color: "#06b6d4" },
  { id: "motion-duel", name: "Motion Duel", icon: "swords", playerCount: 2502, color: "#ec4899" },
]

const leaderboardData: Record<string, LeaderboardEntry[]> = {
  "all": [
    { rank: 1, previousRank: 1, playerId: "p1", playerName: "ProGamer_X", avatar: "#f59e0b", score: 1250430, gamesPlayed: 342, winRate: 87 },
    { rank: 2, previousRank: 3, playerId: "p2", playerName: "MotionMaster99", avatar: "#a855f7", score: 1180250, gamesPlayed: 298, winRate: 82 },
    { rank: 3, previousRank: 2, playerId: "p3", playerName: "SwiftMoves", avatar: "#06b6d4", score: 1095780, gamesPlayed: 276, winRate: 79 },
    { rank: 4, previousRank: 4, playerId: "p4", playerName: "FlexKing", avatar: "#22c55e", score: 985420, gamesPlayed: 245, winRate: 75 },
    { rank: 5, previousRank: 7, playerId: "p5", playerName: "TensorTitan", avatar: "#ec4899", score: 892350, gamesPlayed: 221, winRate: 72 },
    { rank: 6, previousRank: 5, playerId: "p6", playerName: "PoseProdigy", avatar: "#ef4444", score: 856200, gamesPlayed: 198, winRate: 70 },
    { rank: 7, previousRank: 6, playerId: "p7", playerName: "ZenGamer", avatar: "#8b5cf6", score: 823100, gamesPlayed: 187, winRate: 68 },
    { rank: 8, previousRank: 10, playerId: "current", playerName: "You", avatar: "#22c55e", score: 789500, gamesPlayed: 156, winRate: 65, isCurrentUser: true },
    { rank: 9, previousRank: 8, playerId: "p9", playerName: "MotionNinja", avatar: "#f97316", score: 756800, gamesPlayed: 172, winRate: 63 },
    { rank: 10, previousRank: 9, playerId: "p10", playerName: "QuickReflex", avatar: "#14b8a6", score: 721450, gamesPlayed: 165, winRate: 61 },
  ],
  "pose-rush": [
    { rank: 1, previousRank: 2, playerId: "p2", playerName: "MotionMaster99", avatar: "#a855f7", score: 458920, gamesPlayed: 89, winRate: 91 },
    { rank: 2, previousRank: 1, playerId: "p1", playerName: "ProGamer_X", avatar: "#f59e0b", score: 445230, gamesPlayed: 95, winRate: 88 },
    { rank: 3, previousRank: 3, playerId: "p5", playerName: "TensorTitan", avatar: "#ec4899", score: 398450, gamesPlayed: 78, winRate: 85 },
    { rank: 4, previousRank: 5, playerId: "current", playerName: "You", avatar: "#22c55e", score: 356780, gamesPlayed: 62, winRate: 79, isCurrentUser: true },
    { rank: 5, previousRank: 4, playerId: "p3", playerName: "SwiftMoves", avatar: "#06b6d4", score: 342100, gamesPlayed: 71, winRate: 76 },
  ],
  "target-strike": [
    { rank: 1, previousRank: 1, playerId: "p6", playerName: "PoseProdigy", avatar: "#ef4444", score: 287650, gamesPlayed: 65, winRate: 89 },
    { rank: 2, previousRank: 2, playerId: "p1", playerName: "ProGamer_X", avatar: "#f59e0b", score: 276430, gamesPlayed: 58, winRate: 86 },
    { rank: 3, previousRank: 4, playerId: "p9", playerName: "MotionNinja", avatar: "#f97316", score: 254890, gamesPlayed: 52, winRate: 82 },
    { rank: 4, previousRank: 3, playerId: "p4", playerName: "FlexKing", avatar: "#22c55e", score: 248760, gamesPlayed: 49, winRate: 80 },
    { rank: 5, previousRank: 6, playerId: "current", playerName: "You", avatar: "#22c55e", score: 198450, gamesPlayed: 35, winRate: 71, isCurrentUser: true },
  ],
  "rhythm-motion": [
    { rank: 1, previousRank: 1, playerId: "p3", playerName: "SwiftMoves", avatar: "#06b6d4", score: 512340, gamesPlayed: 112, winRate: 94 },
    { rank: 2, previousRank: 3, playerId: "p7", playerName: "ZenGamer", avatar: "#8b5cf6", score: 487290, gamesPlayed: 98, winRate: 90 },
    { rank: 3, previousRank: 2, playerId: "p2", playerName: "MotionMaster99", avatar: "#a855f7", score: 456780, gamesPlayed: 87, winRate: 87 },
    { rank: 4, previousRank: 4, playerId: "p1", playerName: "ProGamer_X", avatar: "#f59e0b", score: 398560, gamesPlayed: 76, winRate: 83 },
    { rank: 5, previousRank: 5, playerId: "p10", playerName: "QuickReflex", avatar: "#14b8a6", score: 345890, gamesPlayed: 68, winRate: 79 },
    { rank: 6, previousRank: 8, playerId: "current", playerName: "You", avatar: "#22c55e", score: 287650, gamesPlayed: 45, winRate: 72, isCurrentUser: true },
  ],
  "fitness-challenge": [
    { rank: 1, previousRank: 1, playerId: "p4", playerName: "FlexKing", avatar: "#22c55e", score: 342890, gamesPlayed: 78, winRate: 92 },
    { rank: 2, previousRank: 2, playerId: "p5", playerName: "TensorTitan", avatar: "#ec4899", score: 298760, gamesPlayed: 65, winRate: 88 },
    { rank: 3, previousRank: 3, playerId: "current", playerName: "You", avatar: "#22c55e", score: 256430, gamesPlayed: 52, winRate: 82, isCurrentUser: true },
    { rank: 4, previousRank: 5, playerId: "p6", playerName: "PoseProdigy", avatar: "#ef4444", score: 234560, gamesPlayed: 48, winRate: 78 },
    { rank: 5, previousRank: 4, playerId: "p9", playerName: "MotionNinja", avatar: "#f97316", score: 212340, gamesPlayed: 42, winRate: 74 },
  ],
  "motion-duel": [
    { rank: 1, previousRank: 2, playerId: "p1", playerName: "ProGamer_X", avatar: "#f59e0b", score: 156780, gamesPlayed: 42, winRate: 95 },
    { rank: 2, previousRank: 1, playerId: "p5", playerName: "TensorTitan", avatar: "#ec4899", score: 148920, gamesPlayed: 38, winRate: 91 },
    { rank: 3, previousRank: 3, playerId: "p9", playerName: "MotionNinja", avatar: "#f97316", score: 132450, gamesPlayed: 35, winRate: 86 },
    { rank: 4, previousRank: 6, playerId: "current", playerName: "You", avatar: "#22c55e", score: 98760, gamesPlayed: 22, winRate: 77, isCurrentUser: true },
    { rank: 5, previousRank: 4, playerId: "p3", playerName: "SwiftMoves", avatar: "#06b6d4", score: 87650, gamesPlayed: 28, winRate: 71 },
  ],
}

const competitions: Competition[] = [
  {
    id: "comp1",
    name: "Weekend Warrior Championship",
    description: "Compete in Pose Rush for the ultimate weekend glory",
    game: "Pose Rush",
    startDate: "May 24",
    endDate: "May 26",
    prizePool: "5,000 XP",
    participants: 1247,
    maxParticipants: 2000,
    status: "active",
    userRank: 23,
  },
  {
    id: "comp2",
    name: "Rhythm Masters Tournament",
    description: "Show off your rhythm skills in this epic showdown",
    game: "Rhythm Motion",
    startDate: "May 28",
    endDate: "Jun 2",
    prizePool: "10,000 XP",
    participants: 456,
    maxParticipants: 1000,
    status: "upcoming",
  },
  {
    id: "comp3",
    name: "Fitness Frenzy League",
    description: "Weekly fitness competition for dedicated players",
    game: "Fitness Challenge",
    startDate: "May 18",
    endDate: "May 25",
    prizePool: "3,500 XP",
    participants: 892,
    maxParticipants: 1500,
    status: "active",
    userRank: 8,
  },
  {
    id: "comp4",
    name: "Motion Duel Invitational",
    description: "Invite-only tournament for top 100 players",
    game: "Motion Duel",
    startDate: "Jun 1",
    endDate: "Jun 5",
    prizePool: "25,000 XP",
    participants: 67,
    maxParticipants: 100,
    status: "upcoming",
  },
]

export default function LeaderboardPage() {
  const [selectedGame, setSelectedGame] = useState("all")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekly")
  const [searchQuery, setSearchQuery] = useState("")

  const currentLeaderboard = leaderboardData[selectedGame] || leaderboardData["all"]
  const currentUser = currentLeaderboard.find(e => e.isCurrentUser)
  const activeCompetitions = competitions.filter(c => c.status === "active")
  const upcomingCompetitions = competitions.filter(c => c.status === "upcoming")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">MotionPlay</h1>
                <p className="text-xs text-muted-foreground">TensorFlow Motion Games</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Games</a>
              <a href="/achievements" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                Achievements
              </a>
              <a href="/leaderboard" className="text-sm text-primary font-medium flex items-center gap-1.5">
                <Medal className="w-4 h-4" />
                Leaderboard
              </a>
              <a href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Profile
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Medal className="w-4 h-4" />
            <span>Global Rankings</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground text-balance">Leaderboard</h2>
          <p className="text-muted-foreground mt-1">
            Compete with players worldwide across all motion games
          </p>
        </div>

        {/* Your Current Standing */}
        {currentUser && (
          <div className="mb-8 p-4 bg-primary/10 border border-primary/30 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                  {currentUser.playerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Current Rank</p>
                  <p className="text-2xl font-bold text-primary">#{currentUser.rank}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{currentUser.score.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{currentUser.gamesPlayed}</p>
                  <p className="text-xs text-muted-foreground">Games Played</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{currentUser.winRate}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Selector */}
        <div className="mb-6">
          <GameSelector
            games={games}
            selectedGame={selectedGame}
            onSelectGame={setSelectedGame}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TimeFilterTabs selected={timeFilter} onSelect={setTimeFilter} />
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Leaderboard Table */}
          <div className="xl:col-span-2">
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Top Players
                </h3>
                <span className="text-sm text-muted-foreground">
                  {games.find(g => g.id === selectedGame)?.name || "All Games"}
                </span>
              </div>
              <LeaderboardTable entries={currentLeaderboard} />
            </div>
          </div>

          {/* Competitions Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Active Competitions */}
            {activeCompetitions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Active Competitions
                  </h3>
                </div>
                <div className="space-y-4">
                  {activeCompetitions.map((comp) => (
                    <CompetitionCard key={comp.id} competition={comp} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Competitions */}
            {upcomingCompetitions.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-4">Upcoming Competitions</h3>
                <div className="space-y-4">
                  {upcomingCompetitions.map((comp) => (
                    <CompetitionCard key={comp.id} competition={comp} />
                  ))}
                </div>
              </div>
            )}

            {/* Create Competition Button */}
            <a 
              href="/competition/create"
              className="flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Competition</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              MotionPlay - Powered by TensorFlow.js
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
