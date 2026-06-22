import PongClient from "./PongClient";

export default function Page({
  params,
}: {
  params: { channelId: string };
}) {
  return <PongClient channelId={params.channelId} />;
}
