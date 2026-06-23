import TestRoomClient from "./TestRoomClient";

export default function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  return <TestRoomClient params={params} />;
}
