import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { GamesView } from "@/components/games-view"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

export default async function GamesPage() {
  const supabase = await createClient()

  const iconMap: Record<string, LucideIcon> = {
    Hand: Icons.Hand,
    Target: Icons.Target,
    Swords: Icons.Swords,
    Music: Icons.Music,
    Dumbbell: Icons.Dumbbell,
    Bird: Icons.Bird,
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: games } = await supabase
    .from("gameslist")
    .select("*")
    .order("created_at", { ascending: true })

  const mappedGames =
    games?.map((game) => ({
      ...game,
      iconComponent: iconMap[game.icon],
    })) || []

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">

          <GamesView games={mappedGames} />

        </div>
      </main>

      <Footer />
    </div>
  )
}