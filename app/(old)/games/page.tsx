import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { GamesView } from "@/components/games-view"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function GamesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: games, error } = await supabase
    .from("gameslist")
    .select(`
      id,
      game_id,
      title,
      description,
      icon,
      difficulty,
      duration,
      calories,
      players,
      color,
      link,
      isLocked,
      comingSoon,
      slug
    `)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching games:", error)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <GamesView games={games || []} />
        </div>
      </main>

      <Footer />
    </div>
  )
}