import PubNub from "pubnub";

export const pubnub = new PubNub({
  publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
  subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
  userId: Math.random().toString(36).slice(2)
});
