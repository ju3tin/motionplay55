// app/api/games/join/route.ts
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
    const { playerId, roomId } = await req.json();

    if (!playerId || !roomId) {
      return NextResponse.json({ error: 'playerId and roomId required' }, { status: 400 });
    }

    const channel = `game-${roomId}`;

    const token = await serverPubNub.grantToken({
      ttl: 720, // 12 hours for long game sessions
      authorized_uuid: playerId,
      resources: {
        channels: {
          [channel]: { read: true, write: true },
          [`player-${playerId}`]: { read: true, write: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      roomId,
      channel,
      token,
    });
  } catch (error: any) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: error.message || 'Failed to join game' }, { status: 500 });
  }
}
