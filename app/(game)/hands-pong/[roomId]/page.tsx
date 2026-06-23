// app/(game)/test-room/[roomId]/page.tsx
import HandsPong from "./HandsPong";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return <HandsPong roomId={roomId} />;
}
