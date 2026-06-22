// app/api/games/message/route.ts

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
    const {
      roomId,
      playerId,
      type = 'CHAT',
      message,
      payload,
    } = await req.json();

    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: 'roomId and playerId are required' },
        { status: 400 }
      );
    }

    const channel = `game-${roomId}`;

    const event = {
      id: crypto.randomUUID(),
      type,
      playerId,
      message,
      payload,
      timestamp: Date.now(),
    };

    await serverPubNub.publish({
      channel,
      message: event,
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
