// app/(login)/signup00/page.tsx
import dynamicImport from 'next/dynamic';   // ← Renamed to avoid conflict

const SolanaSignupClient = dynamicImport(
  () => import('./SolanaSignupClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading wallet...
      </div>
    )
  }
);

export default function SolanaSignupPage() {
  return <SolanaSignupClient />;
}

// Force dynamic rendering - Important for wallet pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;
