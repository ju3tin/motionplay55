import CompetitionsHub from '@/components/CompetitionsHub';
import Leaderboard from '@/components/Leaderboard';

export default function Page() {
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  if (selectedComp) {
    return (
      <div>
        <button onClick={() => setSelectedComp(null)}>← Back to all competitions</button>
        <Leaderboard compAddress={selectedComp} />
      </div>
    );
  }

  return (
    <CompetitionsHub onViewLeaderboard={(addr) => setSelectedComp(addr)} />
  );
}