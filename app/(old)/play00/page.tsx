import { PlayerStats } from "@/components/achievements/player-stats"
import { AchievementsGrid } from "@/components/achievements/achievements-grid"
import { RecentActivity } from "@/components/achievements/recent-activity"
import { Achievement } from "@/components/achievements/achievement-card"
import { Trophy, Activity, Gamepad2, Medal, User } from "lucide-react"

const achievements: Achievement[] = [
  // Motion Achievements
  {
    id: "first-move",
    title: "First Steps",
    description: "Complete your first motion-controlled game",
    icon: "rocket",
    rarity: "common",
    status: "unlocked",
    xpReward: 50,
    unlockedAt: "May 15, 2026",
    category: "motion",
  },
  {
    id: "pose-perfect",
    title: "Pose Perfect",
    description: "Achieve 100% accuracy on a pose detection challenge",
    icon: "target",
    rarity: "rare",
    status: "unlocked",
    xpReward: 150,
    unlockedAt: "May 18, 2026",
    category: "motion",
  },
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Complete 50 quick-time motion events",
    icon: "zap",
    rarity: "rare",
    status: "in-progress",
    progress: 32,
    maxProgress: 50,
    xpReward: 200,
    category: "motion",
  },
  {
    id: "motion-master",
    title: "Motion Master",
    description: "Unlock all motion-based abilities in TensorFlow games",
    icon: "crown",
    rarity: "legendary",
    status: "locked",
    xpReward: 500,
    category: "motion",
  },
  // Streak Achievements
  { 
    id: "warming-up",
    title: "Warming Up",
    description: "Play games for 3 consecutive days",
    icon: "flame",
    rarity: "common",
    status: "unlocked",
    xpReward: 75,
    unlockedAt: "May 12, 2026",
    category: "streak",
  },
  {
    id: "on-fire",
    title: "On Fire",
    description: "Maintain a 7-day playing streak",
    icon: "flame",
    rarity: "rare",
    status: "unlocked",
    xpReward: 200,
    unlockedAt: "May 19, 2026",
    category: "streak",
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Maintain a 30-day playing streak",
    icon: "flame",
    rarity: "epic",
    status: "in-progress",
    progress: 12,
    maxProgress: 30,
    xpReward: 500,
    category: "streak",
  },
  {
    id: "eternal-flame",
    title: "Eternal Flame",
    description: "Maintain a 100-day playing streak",
    icon: "flame",
    rarity: "legendary",
    status: "locked",
    xpReward: 1500,
    category: "streak",
  },
  // Score Achievements
  {
    id: "first-win",
    title: "First Victory",
    description: "Win your first game",
    icon: "trophy",
    rarity: "common",
    status: "unlocked",
    xpReward: 50,
    unlockedAt: "May 10, 2026",
    category: "score",
  },
  {
    id: "high-roller",
    title: "High Roller",
    description: "Score over 10,000 points in a single game",
    icon: "star",
    rarity: "rare",
    status: "unlocked",
    xpReward: 250,
    unlockedAt: "May 17, 2026",
    category: "score",
  },
  {
    id: "perfectionist",
    title: "Perfectionist",
    description: "Complete a game with no mistakes",
    icon: "medal",
    rarity: "epic",
    status: "in-progress",
    progress: 3,
    maxProgress: 5,
    xpReward: 400,
    category: "score",
  },
  {
    id: "legendary-gamer",
    title: "Legendary Gamer",
    description: "Reach the top 100 global leaderboard",
    icon: "crown",
    rarity: "legendary",
    status: "locked",
    xpReward: 1000,
    category: "score",
  },
  // Social Achievements
  {
    id: "social-butterfly",
    title: "Social Butterfly",
    description: "Add 5 friends to your network",
    icon: "heart",
    rarity: "common",
    status: "unlocked",
    xpReward: 100,
    unlockedAt: "May 11, 2026",
    category: "social",
  },
  {
    id: "team-player",
    title: "Team Player",
    description: "Complete 10 multiplayer sessions",
    icon: "heart",
    rarity: "rare",
    status: "in-progress",
    progress: 7,
    maxProgress: 10,
    xpReward: 300,
    category: "social",
  },
  {
    id: "influencer",
    title: "Influencer",
    description: "Have 50 friends in your network",
    icon: "star",
    rarity: "epic",
    status: "locked",
    xpReward: 600,
    category: "social",
  },
  // Special Achievements
  {
    id: "early-bird",
    title: "Early Adopter",
    description: "Join MotionPlay during the beta phase",
    icon: "rocket",
    rarity: "epic",
    status: "unlocked",
    xpReward: 500,
    unlockedAt: "May 8, 2026",
    category: "special",
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Play a game between midnight and 4 AM",
    icon: "timer",
    rarity: "rare",
    status: "locked",
    xpReward: 150,
    category: "special",
  },
  {
    id: "marathon",
    title: "Marathon Runner",
    description: "Play for 4 hours in a single session",
    icon: "timer",
    rarity: "epic",
    status: "locked",
    xpReward: 350,
    category: "special",
  },
  {
    id: "collector",
    title: "Ultimate Collector",
    description: "Unlock all achievements",
    icon: "crown",
    rarity: "legendary",
    status: "locked",
    xpReward: 2000,
    category: "special",
  },
]

const recentActivities = [
  {
    id: "1",
    type: "achievement" as const,
    title: "Achievement Unlocked!",
    description: "Pose Perfect - Achieve 100% accuracy",
    timestamp: "2 hours ago",
    xp: 150,
  },
  {
    id: "2",
    type: "streak" as const,
    title: "Streak Extended",
    description: "Your daily streak is now 12 days",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    type: "xp" as const,
    title: "XP Bonus",
    description: "Daily challenge completed",
    timestamp: "8 hours ago",
    xp: 75,
  },
  {
    id: "4",
    type: "level" as const,
    title: "Level Up!",
    description: "You reached Level 15",
    timestamp: "Yesterday",
  },
  {
    id: "5",
    type: "achievement" as const,
    title: "Achievement Unlocked!",
    description: "On Fire - 7-day streak",
    timestamp: "2 days ago",
    xp: 200,
  },
]

export default function AchievementsPage() {
  const unlockedCount = achievements.filter(a => a.status === "unlocked").length

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
              <a href="/achievements" className="text-sm text-primary font-medium flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                Achievements
              </a>
              <a href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
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
            <Activity className="w-4 h-4" />
            <span>Your Progress</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground text-balance">Achievements</h2>
          <p className="text-muted-foreground mt-1">
            Track your progress and unlock rewards through motion gaming
          </p>
        </div>

        {/* Player Stats */}
        <PlayerStats
          level={15}
          currentXp={2450}
          xpToNextLevel={3000}
          totalAchievements={achievements.length}
          unlockedAchievements={unlockedCount}
          currentStreak={12}
          highScore={24580}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Achievements Grid */}
          <div className="xl:col-span-3">
            <AchievementsGrid achievements={achievements} />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            <RecentActivity activities={recentActivities} />
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
