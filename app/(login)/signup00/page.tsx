// app/(login)/signup00/page.tsx
import dynamic from 'next/dynamic';

const SolanaSignupClient = dynamic(
  () => import('./SolanaSignupClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading wallet connection...</div>
      </div>
    )
  }
);

export default function SolanaSignup() {
  return <SolanaSignupClient />;
}

// Force fully dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
