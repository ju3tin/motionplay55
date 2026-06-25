export default function TargetPoseDisplay({ target }: { target: any }) {
  return (
    <div className="bg-[#1a1a2e] p-8 rounded-3xl text-center">
      <h2 className="text-3xl mb-6">Copy This Pose</h2>
      <div className="text-5xl mb-6">{target?.name}</div>
      <div className="h-96 bg-gray-800 rounded-2xl flex items-center justify-center text-8xl border-4 border-dashed border-gray-600">
        {target?.emoji || '🕴️'}
      </div>
    </div>
  );
}
