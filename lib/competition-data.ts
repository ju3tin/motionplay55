import { Competition } from "@/components/leaderboard/competition-card"

export interface CompetitionDetails extends Competition {
  rules: string[]
  prizes: { place: number; reward: string }[]
  schedule: { event: string; time: string }[]
  leaderboard: { rank: number; playerName: string; avatar: string; score: number; gamesPlayed: number }[]
  joined?: boolean
}

export const competitionsData: Record<string, CompetitionDetails> = {
  "comp1": {
    id: "comp1",
    name: "Weekend Warrior Championship",
    description: "Compete in Pose Rush for the ultimate weekend glory. Show off your best poses and fastest reflexes in this high-intensity competition.",
    game: "Pose Rush",
    startDate: "May 24",
    endDate: "May 26",
    prizePool: "5,000 XP",
    participants: 1247,
    maxParticipants: 2000,
    status: "active",
    userRank: 23,
    joined: true,
    rules: [
      "Complete as many Pose Rush challenges as possible within the competition period",
      "Only scores from games played during the competition count",
      "Top 100 players will receive rewards",
      "Any form of cheating will result in disqualification",
      "Minimum 5 games required to qualify for prizes"
    ],
    prizes: [
      { place: 1, reward: "2,000 XP + Legendary Badge" },
      { place: 2, reward: "1,500 XP + Epic Badge" },
      { place: 3, reward: "1,000 XP + Rare Badge" },
      { place: 4, reward: "300 XP" },
      { place: 5, reward: "200 XP" },
    ],
    schedule: [
      { event: "Registration Opens", time: "May 22, 9:00 AM" },
      { event: "Competition Starts", time: "May 24, 12:00 PM" },
      { event: "Midway Checkpoint", time: "May 25, 12:00 PM" },
      { event: "Competition Ends", time: "May 26, 11:59 PM" },
      { event: "Results Announced", time: "May 27, 10:00 AM" },
    ],
    leaderboard: [
      { rank: 1, playerName: "ProGamer_X", avatar: "#f59e0b", score: 45230, gamesPlayed: 28 },
      { rank: 2, playerName: "MotionMaster99", avatar: "#a855f7", score: 42150, gamesPlayed: 25 },
      { rank: 3, playerName: "SwiftMoves", avatar: "#06b6d4", score: 38920, gamesPlayed: 22 },
      { rank: 4, playerName: "TensorTitan", avatar: "#ec4899", score: 35680, gamesPlayed: 20 },
      { rank: 5, playerName: "PoseProdigy", avatar: "#ef4444", score: 32450, gamesPlayed: 18 },
      { rank: 6, playerName: "FlexKing", avatar: "#22c55e", score: 29870, gamesPlayed: 17 },
      { rank: 7, playerName: "ZenGamer", avatar: "#8b5cf6", score: 27340, gamesPlayed: 15 },
      { rank: 8, playerName: "QuickReflex", avatar: "#14b8a6", score: 24890, gamesPlayed: 14 },
      { rank: 9, playerName: "MotionNinja", avatar: "#f97316", score: 22560, gamesPlayed: 13 },
      { rank: 10, playerName: "SpeedDemon", avatar: "#64748b", score: 20340, gamesPlayed: 12 },
    ],
  },
  "comp2": {
    id: "comp2",
    name: "Rhythm Masters Tournament",
    description: "Show off your rhythm skills in this epic showdown. Sync your moves to the beat and climb the rankings in this week-long musical battle.",
    game: "Rhythm Motion",
    startDate: "May 28",
    endDate: "Jun 2",
    prizePool: "10,000 XP",
    participants: 456,
    maxParticipants: 1000,
    status: "upcoming",
    joined: false,
    rules: [
      "Play Rhythm Motion tracks during the competition period",
      "Perfect combos give bonus points",
      "Each track can only be scored once per day (best score counts)",
      "Must complete at least 10 different tracks to qualify",
      "Tournament uses the Advanced difficulty setting"
    ],
    prizes: [
      { place: 1, reward: "4,000 XP + Legendary Rhythm Badge" },
      { place: 2, reward: "2,500 XP + Epic Badge" },
      { place: 3, reward: "1,500 XP + Rare Badge" },
      { place: 4, reward: "1,000 XP" },
      { place: 5, reward: "500 XP" },
    ],
    schedule: [
      { event: "Registration Opens", time: "May 25, 9:00 AM" },
      { event: "Registration Closes", time: "May 28, 11:00 AM" },
      { event: "Tournament Starts", time: "May 28, 12:00 PM" },
      { event: "Tournament Ends", time: "Jun 2, 11:59 PM" },
      { event: "Results Announced", time: "Jun 3, 10:00 AM" },
    ],
    leaderboard: [],
  },
  "comp3": {
    id: "comp3",
    name: "Fitness Frenzy League",
    description: "Weekly fitness competition for dedicated players. Push your limits and compete for glory in this endurance-focused challenge.",
    game: "Fitness Challenge",
    startDate: "May 18",
    endDate: "May 25",
    prizePool: "3,500 XP",
    participants: 892,
    maxParticipants: 1500,
    status: "active",
    userRank: 8,
    joined: true,
    rules: [
      "Complete fitness challenges to earn points",
      "Bonus points for consecutive daily check-ins",
      "Heart rate data verification required for full points",
      "Minimum 30 minutes of total activity required",
      "Form quality affects score multiplier"
    ],
    prizes: [
      { place: 1, reward: "1,500 XP + Iron Will Badge" },
      { place: 2, reward: "1,000 XP + Epic Badge" },
      { place: 3, reward: "600 XP + Rare Badge" },
      { place: 4, reward: "250 XP" },
      { place: 5, reward: "150 XP" },
    ],
    schedule: [
      { event: "League Started", time: "May 18, 6:00 AM" },
      { event: "Week 1 Ends", time: "May 25, 11:59 PM" },
      { event: "Results Posted", time: "May 26, 8:00 AM" },
    ],
    leaderboard: [
      { rank: 1, playerName: "FlexKing", avatar: "#22c55e", score: 28950, gamesPlayed: 35 },
      { rank: 2, playerName: "TensorTitan", avatar: "#ec4899", score: 26780, gamesPlayed: 32 },
      { rank: 3, playerName: "IronWill", avatar: "#ef4444", score: 24560, gamesPlayed: 30 },
      { rank: 4, playerName: "FitnessFan", avatar: "#06b6d4", score: 22340, gamesPlayed: 28 },
      { rank: 5, playerName: "PowerMove", avatar: "#a855f7", score: 20120, gamesPlayed: 26 },
      { rank: 6, playerName: "EnduranceKing", avatar: "#f59e0b", score: 18900, gamesPlayed: 24 },
      { rank: 7, playerName: "StrengthSeeker", avatar: "#8b5cf6", score: 17680, gamesPlayed: 22 },
      { rank: 8, playerName: "You", avatar: "#22c55e", score: 16450, gamesPlayed: 20 },
      { rank: 9, playerName: "ActiveLife", avatar: "#14b8a6", score: 15230, gamesPlayed: 19 },
      { rank: 10, playerName: "HealthHero", avatar: "#f97316", score: 14010, gamesPlayed: 18 },
    ],
  },
  "comp4": {
    id: "comp4",
    name: "Motion Duel Invitational",
    description: "Invite-only tournament for top 100 players. The ultimate test of motion gaming skill in head-to-head battles.",
    game: "Motion Duel",
    startDate: "Jun 1",
    endDate: "Jun 5",
    prizePool: "25,000 XP",
    participants: 67,
    maxParticipants: 100,
    status: "upcoming",
    joined: false,
    rules: [
      "Invitation only - top 100 ranked Motion Duel players",
      "Single elimination bracket format",
      "Best of 3 matches per round",
      "Finals are best of 5",
      "Players must be available for scheduled match times"
    ],
    prizes: [
      { place: 1, reward: "10,000 XP + Champion Title + Legendary Badge" },
      { place: 2, reward: "7,000 XP + Finalist Badge" },
      { place: 3, reward: "4,000 XP + Semi-Finalist Badge" },
      { place: 4, reward: "2,500 XP" },
      { place: 5, reward: "1,500 XP" },
    ],
    schedule: [
      { event: "Invitations Sent", time: "May 28, 12:00 PM" },
      { event: "RSVP Deadline", time: "May 31, 11:59 PM" },
      { event: "Bracket Reveal", time: "Jun 1, 10:00 AM" },
      { event: "Round 1", time: "Jun 1, 2:00 PM" },
      { event: "Quarter Finals", time: "Jun 2, 2:00 PM" },
      { event: "Semi Finals", time: "Jun 3, 2:00 PM" },
      { event: "Grand Finals", time: "Jun 5, 4:00 PM" },
    ],
    leaderboard: [],
  },
}

export const games = [
  { id: "pose-rush", name: "Pose Rush", icon: "zap", color: "#f59e0b" },
  { id: "target-strike", name: "Target Strike", icon: "target", color: "#ef4444" },
  { id: "rhythm-motion", name: "Rhythm Motion", icon: "music", color: "#a855f7" },
  { id: "fitness-challenge", name: "Fitness Challenge", icon: "dumbbell", color: "#06b6d4" },
  { id: "motion-duel", name: "Motion Duel", icon: "swords", color: "#ec4899" },
]
