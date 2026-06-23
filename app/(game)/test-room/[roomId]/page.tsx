// app/(game)/test-room/[roomId]/page.tsx
import TestRoomClient from "./TestRoomClient";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return <TestRoomClient roomId={roomId} />;
}
