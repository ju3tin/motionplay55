// app/(new)/leaderboard1/page.tsx
import { Suspense } from 'react';
import LeaderboardPage from './LeaderboardPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LeaderboardPage />
    </Suspense>
  );
}