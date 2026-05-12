import { HeroSection } from '@/components/hero-section'
import { FeaturesSection } from '@/components/features-section'
import  GamesGrid  from '@/components/games-grid'
import { GamesView } from "@/components/games-view"
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar2'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
       <GamesView games={games || []} />
      </main>
      <Footer />
    </div>
  )
}