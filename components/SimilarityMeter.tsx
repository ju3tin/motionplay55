export default function SimilarityMeter({ similarity }: { similarity: number }) {
  const color = similarity >= 85 ? 'text-green-400' : similarity >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="text-center">
      <div className={`text-7xl font-bold ${color}`}>{similarity}%</div>
      <p className="text-xl mt-2">Match Accuracy</p>
      <div className="w-full bg-gray-700 h-4 rounded-full mt-4 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-400 transition-all duration-200"
          style={{ width: `${similarity}%` }}
        />
      </div>
    </div>
  );
}
