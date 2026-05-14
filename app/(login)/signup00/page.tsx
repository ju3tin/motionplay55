// app/(login)/signup00/page.tsx
import dynamic from 'next/dynamic';

const SignupClient = dynamic(
  () => import('./SolanaSignupClient'),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>
  }
);

export default function SignupPage() {
  return <SignupClient />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
