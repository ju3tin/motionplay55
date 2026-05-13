import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SidebarLayout } from '@/components/SidebarLayout'
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/Sidebar2"




const _inter = Inter({ subsets: ['latin'] })
const _spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://motionplay.vercel.app'),

  title: {
    default: 'MotionPlay',
    template: '%s | MotionPlay',
  },

  description: 'Solana competition platform',

  keywords: [
    'Solana',
    'crypto competitions',
    'web3 gaming',
    'blockchain',
    'MotionPlay',
  ],

  authors: [{ name: 'MotionPlay' }],
  creator: 'MotionPlay',
  publisher: 'MotionPlay',

  openGraph: {
    title: 'MotionPlay',
    description: 'Solana competition platform',
    url: 'https://motionplay.vercel.app',
    siteName: 'MotionPlay',
    images: [
      {
        url: '/og-image.png', // put in /public
        width: 1200,
        height: 630,
        alt: 'MotionPlay',
      },
    ],
    locale: 'en_UK',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'MotionPlay',
    description: 'Solana competition platform',
    creator: '@motionplay',
    images: ['/twitter-image.png'],
  },

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: 'https://motionplay.vercel.app',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
const supabase = await createClient()
const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Sidebar />
        {children}
         
        <Analytics />
      </body>
    </html>
  )
}
