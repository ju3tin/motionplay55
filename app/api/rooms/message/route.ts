import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';

const serverPubNub = new PubNub({
  publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
  subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
  secretKey: process.env.PUBNUB_SECRET_KEY!,
  uuid: 'motionplay-server',
});

export async function POST(req: NextRequest) {
  try {
    console.log("📩 MESSAGE API HIT");

    const body = await req.json();
    console.log("📦 RAW BODY:", body);

    const {
      roomId,
      playerId,
      type = 'CHAT',
      message,
      payload,
    } = body;

    console.log("🔍 PARSED VALUES:", {
      roomId,
      playerId,
      type,
      message,
      payload,
    });

    if (!roomId || !playerId) {
      console.log("❌ Missing roomId or playerId");
      return NextResponse.json(
        { error: 'roomId and playerId are required' },
        { status: 400 }
      );
    }

    const channel = `game-${roomId}`;
    console.log("📡 CHANNEL USED:", channel);

    const event = {
      id: crypto.randomUUID(),
      type,
      playerId,
      message: message || null,
      payload: payload || null,
      timestamp: Date.now(),
    };

    console.log("🚀 EVENT TO SEND:", event);

    const result = await serverPubNub.publish({
      channel,
      message: event,
    });

    console.log("✅ PUBNUB PUBLISH SUCCESS:");
    console.log(result);

    return NextResponse.json({
      success: true,
      channel,
      event,
      pubnub: result,
    });

  } catch (error: any) {
    console.error("🔥 MESSAGE API ERROR:");
    console.error(error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to send message',
      },
      { status: 500 }
    );
  }
}
