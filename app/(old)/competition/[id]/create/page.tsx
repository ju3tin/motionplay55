"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { games } from "@/lib/competition-data"
import { format, differenceInDays, addDays } from "date-fns"
import { 
  Trophy, 
  Gamepad2, 
  Medal, 
  ChevronLeft, 
  Calendar as CalendarIcon,
  Users,
  Award,
  Plus,
  Minus,
  Check,
  Zap,
  Target,
  Music,
  Dumbbell,
  Swords,
  Info,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

const gameIcons: Record<string, React.ReactNode> = {
  "zap": <Zap className="w-5 h-5" />,
  "target": <Target className="w-5 h-5" />,
  "music": <Music className="w-5 h-5" />,
  "dumbbell": <Dumbbell className="w-5 h-5" />,
  "swords": <Swords className="w-5 h-5" />,
}

const prizeTemplates = [
  { total: 1000, label: "Bronze", distribution: [500, 300, 200] },
  { total: 5000, label: "Silver", distribution: [2500, 1500, 1000] },
  { total: 10000, label: "Gold", distribution: [5000, 3000, 2000] },
  { total: 25000, label: "Platinum", distribution: [12500, 7500, 5000] },
]

export default function CreateCompetitionPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    game: "",
    startDate: addDays(new Date(), 1),
    endDate: addDays(new Date(), 8),
    maxParticipants: 100,
    prizeTemplate: 1,
    isPrivate: false,
    requiresApproval: false,
  })
  
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [createdId] = useState("new-comp-123")

  const selectedPrize = prizeTemplates[formData.prizeTemplate]
  const duration = differenceInDays(formData.endDate, formData.startDate)
  
  const handleSubmit = async () => {
    if (!formData.name || !formData.game) return
    
    setCreating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setCreating(false)
    setCreated(true)
  }

  const isValid = formData.name.length >= 3 && formData.game !== "" && duration > 0

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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button 
          onClick={() => router.push("/leaderboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Leaderboard</span>
        </button>

        {created ? (
          /* Success State */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Competition Created!</h2>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              <span className="text-foreground font-medium">{formData.name}</span> has been created successfully.
            </p>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Share the link with players to invite them to your competition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => router.push(`/competition/${createdId}`)}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                View Competition
              </button>
              <button 
                onClick={() => router.push("/leaderboard")}
                className="px-8 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
              >
                Back to Leaderboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Create Competition</h2>
              <p className="text-muted-foreground">Set up a new competition and invite players to compete</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Basic Information</h3>
                
                {/* Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Competition Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekend Showdown"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{formData.name.length}/50 characters</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your competition..."
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/200 characters</p>
                </div>
              </div>

              {/* Game Selection */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  Select Game <span className="text-destructive">*</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {games.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setFormData(prev => ({ ...prev, game: game.id }))}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        formData.game === game.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${game.color}20`, color: game.color }}
                      >
                        {gameIcons[game.icon]}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{game.name}</p>
                      </div>
                      {formData.game === game.id && (
                        <Check className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Competition Dates
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Start Date
                    </label>
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                      <div className="mb-3 text-center">
                        <p className="text-2xl font-bold text-primary">
                          {format(formData.startDate, "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(formData.startDate, "EEEE")}
                        </p>
                      </div>
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ 
                              ...prev, 
                              startDate: date,
                              endDate: date >= prev.endDate ? addDays(date, 7) : prev.endDate
                            }))
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        className="rounded-md flex justify-center"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      End Date
                    </label>
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                      <div className="mb-3 text-center">
                        <p className="text-2xl font-bold text-accent">
                          {format(formData.endDate, "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(formData.endDate, "EEEE")}
                        </p>
                      </div>
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, endDate: date }))
                          }
                        }}
                        disabled={(date) => date <= formData.startDate}
                        className="rounded-md flex justify-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration Display */}
                <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground">Competition Duration</p>
                  <p className="text-2xl font-bold text-foreground">
                    {duration} {duration === 1 ? "Day" : "Days"}
                  </p>
                </div>
              </div>

              {/* Participants */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Max Participants
                </h3>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, maxParticipants: Math.max(10, prev.maxParticipants - 50) }))}
                    className="w-12 h-12 rounded-xl border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-bold text-foreground">{formData.maxParticipants}</p>
                    <p className="text-sm text-muted-foreground">players</p>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, maxParticipants: Math.min(5000, prev.maxParticipants + 50) }))}
                    className="w-12 h-12 rounded-xl border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Quick Select */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[50, 100, 250, 500, 1000].map((count) => (
                    <button
                      key={count}
                      onClick={() => setFormData(prev => ({ ...prev, maxParticipants: count }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm transition-colors",
                        formData.maxParticipants === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prize Pool */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  Prize Pool
                </h3>
                <p className="text-sm text-muted-foreground mb-6">Select a prize tier for your competition</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {prizeTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setFormData(prev => ({ ...prev, prizeTemplate: index }))}
                      className={cn(
                        "py-4 px-4 rounded-xl border-2 transition-all text-center",
                        formData.prizeTemplate === index
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/30"
                      )}
                    >
                      <p className="text-2xl font-bold text-accent">{template.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                      <p className="text-sm font-medium text-foreground mt-1">{template.label}</p>
                    </button>
                  ))}
                </div>

                {/* Prize Distribution Preview */}
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-sm font-medium text-foreground mb-3">Prize Distribution</p>
                  <div className="flex gap-4">
                    {selectedPrize.distribution.map((prize, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 && "bg-yellow-500 text-yellow-950",
                          index === 1 && "bg-gray-400 text-gray-900",
                          index === 2 && "bg-orange-500 text-orange-950"
                        )}>
                          {index + 1}
                        </div>
                        <span className="text-sm text-foreground">{prize.toLocaleString()} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Options</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        formData.isPrivate ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Private Competition</p>
                        <p className="text-sm text-muted-foreground">Only invited players can join</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      formData.isPrivate ? "bg-primary" : "bg-secondary"
                    )}>
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                        formData.isPrivate ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>

                  <button
                    onClick={() => setFormData(prev => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        formData.requiresApproval ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Require Approval</p>
                        <p className="text-sm text-muted-foreground">Manually approve join requests</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      formData.requiresApproval ? "bg-primary" : "bg-secondary"
                    )}>
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                        formData.requiresApproval ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground font-medium">Competition Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    Starts on {format(formData.startDate, "MMMM d, yyyy")} and ends on {format(formData.endDate, "MMMM d, yyyy")}. 
                    Players can join once the competition begins.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!isValid || creating}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2",
                  isValid && !creating
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {creating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating Competition...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Create Competition
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
