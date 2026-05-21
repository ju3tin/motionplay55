"use client"

import { useState } from "react"
import { 
  Trophy, 
  Gamepad2, 
  Medal, 
  User,
  Settings,
  Edit3,
  Camera,
  Flame,
  Target,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  ChevronRight,
  Zap,
  Music,
  Dumbbell,
  Swords
} from "lucide-react"
import { cn } from "@/lib/utils"

const gameIcons: Record<string, React.ReactNode> = {
  "zap": <Zap className="w-4 h-4" />,
  "target": <Target className="w-4 h-4" />,
  "music": <Music className="w-4 h-4" />,
  "dumbbell": <Dumbbell className="w-4 h-4" />,
  "swords": <Swords className="w-4 h-4" />,
}

const userData = {
  name: "Alex Chen",
  username: "motionmaster",
  avatar: null,
  level: 42,
  xp: 84500,
  xpToNextLevel: 100000,
  rank: 156,
  totalPlayers: 25000,
  joinedDate: "March 2024",
  bio: "Motion gaming enthusiast. Always looking for new challenges!",
  stats: {
    totalGames: 847,
    wins: 412,
    hoursPlayed: 156,
    streak: 23,
    highestStreak: 45,
    achievementsUnlocked: 38,
    totalAchievements: 75,
    competitionsWon: 8,
    competitionsJoined: 24,
  },
  favoriteGames: [
    { id: "pose-rush", name: "Pose Rush", icon: "zap", color: "#22c55e", gamesPlayed: 312, winRate: 68 },
    { id: "target-strike", name: "Target Strike", icon: "target", color: "#f97316", gamesPlayed: 245, winRate: 52 },
    { id: "rhythm-motion", name: "Rhythm Motion", icon: "music", color: "#a855f7", gamesPlayed: 189, winRate: 71 },
  ],
  recentActivity: [
    { type: "achievement", title: "Speed Demon", description: "Unlocked achievement", time: "2 hours ago", icon: "trophy" },
    { type: "competition", title: "Weekend Showdown", description: "Placed 3rd", time: "1 day ago", icon: "medal" },
    { type: "streak", title: "23 Day Streak", description: "Streak extended", time: "1 day ago", icon: "flame" },
    { type: "levelup", title: "Level 42", description: "Reached new level", time: "3 days ago", icon: "zap" },
    { type: "game", title: "Pose Rush", description: "New high score: 15,420", time: "3 days ago", icon: "target" },
  ],
  badges: [
    { name: "Early Adopter", description: "Joined during beta", color: "#22c55e", rarity: "rare" },
    { name: "Competition King", description: "Won 5+ competitions", color: "#f97316", rarity: "epic" },
    { name: "Streak Master", description: "30+ day streak", color: "#eab308", rarity: "legendary" },
    { name: "Social Butterfly", description: "100+ friends", color: "#3b82f6", rarity: "common" },
  ]
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "badges">("overview")
  
  const xpProgress = (userData.xp / userData.xpToNextLevel) * 100
  const winRate = Math.round((userData.stats.wins / userData.stats.totalGames) * 100)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "trophy": return <Trophy className="w-4 h-4" />
      case "medal": return <Medal className="w-4 h-4" />
      case "flame": return <Flame className="w-4 h-4" />
      case "zap": return <Zap className="w-4 h-4" />
      case "target": return <Target className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

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
              <a href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Medal className="w-4 h-4" />
                Leaderboard
              </a>
              <a href="/profile" className="text-sm text-primary font-medium flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Profile
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-4 border-background shadow-xl">
                <User className="w-16 h-16 text-foreground/50" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
              {/* Level Badge */}
              <div className="absolute -top-2 -left-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-bold shadow-lg">
                Lv.{userData.level}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{userData.name}</h2>
                <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground mb-3">@{userData.username}</p>
              <p className="text-foreground/80 mb-4 max-w-lg">{userData.bio}</p>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Medal className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">Rank #{userData.rank}</span>
                  <span className="text-muted-foreground">of {userData.totalPlayers.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined {userData.joinedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Flame className="w-4 h-4 text-accent" />
                  <span className="text-foreground font-medium">{userData.stats.streak} day streak</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-8 bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Level Progress</span>
              <span className="text-sm font-medium text-foreground">
                {userData.xp.toLocaleString()} / {userData.xpToNextLevel.toLocaleString()} XP
              </span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(userData.xpToNextLevel - userData.xp).toLocaleString()} XP to Level {userData.level + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {(["overview", "stats", "badges"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 font-medium text-sm transition-colors relative",
                activeTab === tab 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Games Played</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{userData.stats.totalGames}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{winRate}%</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Hours Played</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{userData.stats.hoursPlayed}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">Achievements</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {userData.stats.achievementsUnlocked}
                    <span className="text-sm font-normal text-muted-foreground">/{userData.stats.totalAchievements}</span>
                  </p>
                </div>
              </div>

              {/* Favorite Games */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  Favorite Games
                </h3>
                <div className="space-y-4">
                  {userData.favoriteGames.map((game) => (
                    <div key={game.id} className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${game.color}20`, color: game.color }}
                      >
                        {gameIcons[game.icon]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{game.name}</p>
                        <p className="text-sm text-muted-foreground">{game.gamesPlayed} games played</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{game.winRate}%</p>
                        <p className="text-xs text-muted-foreground">win rate</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <a href="/" className="mt-4 block text-center text-sm text-primary hover:underline">
                  View All Games
                </a>
              </div>

              {/* Competition Stats */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Medal className="w-5 h-5 text-accent" />
                  Competition History
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-accent">{userData.stats.competitionsWon}</p>
                    <p className="text-sm text-muted-foreground">Competitions Won</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-foreground">{userData.stats.competitionsJoined}</p>
                    <p className="text-sm text-muted-foreground">Competitions Joined</p>
                  </div>
                </div>
                <a href="/leaderboard" className="mt-4 block text-center text-sm text-primary hover:underline">
                  View Leaderboard
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {userData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        activity.type === "achievement" && "bg-yellow-500/20 text-yellow-400",
                        activity.type === "competition" && "bg-accent/20 text-accent",
                        activity.type === "streak" && "bg-orange-500/20 text-orange-400",
                        activity.type === "levelup" && "bg-primary/20 text-primary",
                        activity.type === "game" && "bg-blue-500/20 text-blue-400"
                      )}>
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges Preview */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Featured Badges
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {userData.badges.slice(0, 4).map((badge, index) => (
                    <div 
                      key={index} 
                      className="bg-secondary/50 rounded-xl p-3 text-center hover:bg-secondary/70 transition-colors cursor-pointer"
                    >
                      <div 
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: `${badge.color}20` }}
                      >
                        <Award className="w-5 h-5" style={{ color: badge.color }} />
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{badge.name}</p>
                      <p className={cn(
                        "text-xs capitalize",
                        badge.rarity === "legendary" && "text-yellow-400",
                        badge.rarity === "epic" && "text-purple-400",
                        badge.rarity === "rare" && "text-blue-400",
                        badge.rarity === "common" && "text-muted-foreground"
                      )}>
                        {badge.rarity}
                      </p>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setActiveTab("badges")}
                  className="mt-4 w-full text-center text-sm text-primary hover:underline"
                >
                  View All Badges
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Gameplay Stats */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                Gameplay
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Games</span>
                  <span className="font-medium text-foreground">{userData.stats.totalGames}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Wins</span>
                  <span className="font-medium text-foreground">{userData.stats.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Losses</span>
                  <span className="font-medium text-foreground">{userData.stats.totalGames - userData.stats.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-medium text-primary">{winRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Hours Played</span>
                  <span className="font-medium text-foreground">{userData.stats.hoursPlayed}h</span>
                </div>
              </div>
            </div>

            {/* Streak Stats */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" />
                Streaks
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Streak</span>
                  <span className="font-medium text-accent">{userData.stats.streak} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Highest Streak</span>
                  <span className="font-medium text-foreground">{userData.stats.highestStreak} days</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mt-4">
                  <div 
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(userData.stats.streak / userData.stats.highestStreak) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {userData.stats.highestStreak - userData.stats.streak} days to beat your record!
                </p>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Achievements
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Unlocked</span>
                  <span className="font-medium text-foreground">{userData.stats.achievementsUnlocked}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium text-foreground">{userData.stats.totalAchievements}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium text-primary">
                    {Math.round((userData.stats.achievementsUnlocked / userData.stats.totalAchievements) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mt-4">
                  <div 
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${(userData.stats.achievementsUnlocked / userData.stats.totalAchievements) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Competition Stats */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Medal className="w-5 h-5 text-accent" />
                Competitions
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium text-foreground">{userData.stats.competitionsJoined}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Won</span>
                  <span className="font-medium text-accent">{userData.stats.competitionsWon}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-medium text-foreground">
                    {Math.round((userData.stats.competitionsWon / userData.stats.competitionsJoined) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Ranking */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Ranking
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Global Rank</span>
                  <span className="font-medium text-primary">#{userData.rank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Top</span>
                  <span className="font-medium text-foreground">
                    {((userData.rank / userData.totalPlayers) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Players</span>
                  <span className="font-medium text-foreground">{userData.totalPlayers.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* XP */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Experience
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Level</span>
                  <span className="font-medium text-foreground">{userData.level}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total XP</span>
                  <span className="font-medium text-foreground">{userData.xp.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">XP to Next Level</span>
                  <span className="font-medium text-primary">{(userData.xpToNextLevel - userData.xp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "badges" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userData.badges.map((badge, index) => (
                <div 
                  key={index}
                  className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${badge.color}20` }}
                  >
                    <Award className="w-8 h-8" style={{ color: badge.color }} />
                  </div>
                  <p className="font-semibold text-foreground mb-1">{badge.name}</p>
                  <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                  <span className={cn(
                    "text-xs font-medium capitalize px-3 py-1 rounded-full",
                    badge.rarity === "legendary" && "bg-yellow-500/20 text-yellow-400",
                    badge.rarity === "epic" && "bg-purple-500/20 text-purple-400",
                    badge.rarity === "rare" && "bg-blue-500/20 text-blue-400",
                    badge.rarity === "common" && "bg-secondary text-muted-foreground"
                  )}>
                    {badge.rarity}
                  </span>
                </div>
              ))}
              
              {/* Locked Badges */}
              {[...Array(4)].map((_, index) => (
                <div 
                  key={`locked-${index}`}
                  className="bg-card/50 border border-border rounded-2xl p-6 text-center opacity-50"
                >
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-secondary">
                    <Award className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-muted-foreground mb-1">???</p>
                  <p className="text-sm text-muted-foreground mb-2">Keep playing to unlock</p>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary text-muted-foreground">
                    Locked
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
