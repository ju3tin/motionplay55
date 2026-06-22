import PubNub from "pubnub";

export const pubnub = new PubNub({
  publishKey: "YOUR_PUB_KEY",
  subscribeKey: "YOUR_SUB_KEY",
  userId: Math.random().toString(36).slice(2)
});
