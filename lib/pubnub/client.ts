import PubNub from "pubnub";

let client: PubNub | null = null;

export function getPubNub(userId: string) {
  if (!client) {
    client = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId,
    });
  }

  return client;
}
