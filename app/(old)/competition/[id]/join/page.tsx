"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { competitionsData } from "@/lib/competition-data"
import { 
  Trophy, 
  Gamepad2, 
  Medal, 
  Users, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  Award,
  Play,
  Share2,
  Star,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ViewCompetitionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  if (!params?.id) {
    return null
  }

  const competitionId = params.id
  const competition = competitionsData[competitionId]
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "rules">("overview")

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Competition Not Found</h1>
          <p className="text-muted-foreground mb-4">The competition you are looking for does not exist.</p>
          <button 
            onClick={() => router.push("/leaderboard")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Back to Leaderboard
          </button>
        </div>
      </div>
    )
  }

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
        {/* Back Button */}
        <button 
          onClick={() => router.push("/leaderboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Leaderboard</span>
        </button>

        {/* Competition Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 mb-8">
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <span className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mb-3",
                  status.color
                )}>
                  {competition.status === "active" && (
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
                  )}
                  {status.label}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-balance">{competition.name}</h2>
                <p className="text-muted-foreground max-w-2xl">{competition.description}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
                  <Star className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Meta Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Gamepad2 className="w-4 h-4" />
                  <span className="text-xs">Game</span>
                </div>
                <p className="font-semibold text-foreground">{competition.game}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Participants</span>
                </div>
                <p className="font-semibold text-foreground">{competition.participants.toLocaleString()} / {competition.maxParticipants.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-xs">Prize Pool</span>
                </div>
                <p className="font-semibold text-accent">{competition.prizePool}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Duration</span>
                </div>
                <p className="font-semibold text-foreground">{competition.startDate} - {competition.endDate}</p>
              </div>
            </div>

            {/* Participant Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Registration Progress</span>
                <span className="text-foreground font-medium">{Math.round(participantPercentage)}% full</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${participantPercentage}%` }}
                />
              </div>
            </div>

            {/* Your Rank (if joined) */}
            {competition.joined && competition.userRank && (
              <div className="flex flex-wrap items-center gap-6 p-4 bg-primary/10 border border-primary/30 rounded-xl mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Current Rank</p>
                    <p className="text-2xl font-bold text-primary">#{competition.userRank}</p>
                  </div>
                </div>
                <button className="ml-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  <Play className="w-5 h-5" />
                  Play Now
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {!competition.joined && competition.status !== "ended" && (
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => router.push(`/competition/${competitionId}/join`)}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Join Competition
                </button>
                <button className="px-8 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors">
                  View Rules
                </button>
              </div>
            )}
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-fit mb-8">
          {(["overview", "leaderboard", "rules"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {activeTab === "overview" && (
            <>
              {/* Schedule */}
              <div className="lg:col-span-2">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Schedule
                  </h3>
                  <div className="space-y-4">
                    {competition.schedule.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-primary/50 ring-4 ring-primary/20" />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-foreground font-medium">{item.event}</span>
                          <span className="text-muted-foreground text-sm">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prize Distribution */}
              <div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Award className="w-5 h-5 text-accent" />
                    Prizes
                  </h3>
                  <div className="space-y-3">
                    {competition.prizes.map((prize, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg",
                          index === 0 && "bg-yellow-500/10 border border-yellow-500/30",
                          index === 1 && "bg-gray-400/10 border border-gray-400/30",
                          index === 2 && "bg-orange-500/10 border border-orange-500/30",
                          index > 2 && "bg-secondary"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          index === 0 && "bg-yellow-500 text-yellow-950",
                          index === 1 && "bg-gray-400 text-gray-900",
                          index === 2 && "bg-orange-500 text-orange-950",
                          index > 2 && "bg-secondary text-muted-foreground"
                        )}>
                          {prize.place}
                        </div>
                        <span className="text-foreground text-sm">{prize.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "leaderboard" && (
            <div className="lg:col-span-3">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Competition Leaderboard
                </h3>
                {competition.leaderboard.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rank</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Player</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Score</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competition.leaderboard.map((entry) => (
                          <tr 
                            key={entry.rank}
                            className={cn(
                              "border-b border-border/50 hover:bg-secondary/30 transition-colors",
                              entry.playerName === "You" && "bg-primary/10"
                            )}
                          >
                            <td className="py-4 px-4">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                entry.rank === 1 && "bg-yellow-500 text-yellow-950",
                                entry.rank === 2 && "bg-gray-400 text-gray-900",
                                entry.rank === 3 && "bg-orange-500 text-orange-950",
                                entry.rank > 3 && "bg-secondary text-muted-foreground"
                              )}>
                                {entry.rank}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                  style={{ backgroundColor: entry.avatar }}
                                >
                                  {entry.playerName.charAt(0)}
                                </div>
                                <span className={cn(
                                  "font-medium",
                                  entry.playerName === "You" ? "text-primary" : "text-foreground"
                                )}>
                                  {entry.playerName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right font-semibold text-foreground">
                              {entry.score.toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-right text-muted-foreground">
                              {entry.gamesPlayed}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Competition has not started yet.</p>
                    <p className="text-sm text-muted-foreground">Check back when the competition begins.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="lg:col-span-3">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Competition Rules</h3>
                <ul className="space-y-4">
                  {competition.rules.map((rule, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-foreground">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
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
