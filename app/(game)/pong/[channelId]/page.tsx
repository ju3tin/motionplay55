import PongClient from "./PongClient";

export default function Page({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  return <PongClient params={params} />;
}
