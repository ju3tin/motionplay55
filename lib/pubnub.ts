import PubNub from 'pubnub';

const pubnub = new PubNub({
  publishKey: process.env.PUBNUB_PUBLISH_KEY!,   // ← Server-side keys (no NEXT_PUBLIC_)
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
  secretKey: process.env.PUBNUB_SECRET_KEY,   // optional, for PAM/admin
});

export default pubnub;
