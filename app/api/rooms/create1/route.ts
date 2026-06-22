// app/api/games/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import PubNub from 'pubnub';

const serverPubNub = new PubNub({
  publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
  subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
  secretKey: process.env.PUBNUB_SECRET_KEY!,
  uuid: 'motionplay-server',
});

export async function POST(req: NextRequest) {
  try {
    const { gameType, hostId, maxPlayers = 8, settings = {} } = await req.json();

    if (!hostId) {
      return NextResponse.json({ error: 'hostId is required' }, { status: 400 });
    }

    const roomId = `motion-${uuidv4().slice(0, 12)}`;
    const channel = `game-${roomId}`;

    // 1. Create room data
    const gameRoom = {
      id: roomId,
      gameType,
      host: hostId,
      maxPlayers,
      players: [hostId],
      status: "waiting",
      settings,
      createdAt: new Date().toISOString(),
      channel,
    };

    // TODO: Save to database
    // await prisma.gameRoom.create({ data: gameRoom });

    // 2. Generate token for host
    const token = await serverPubNub.grantToken({
      ttl: 720, // 12 hours
      authorized_uuid: hostId,
      resources: {
        channels: {
          [channel]: { read: true, write: true },
          [`player-${hostId}`]: { read: true, write: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      room: gameRoom,
      token,
      channel,
    });
  } catch (error: any) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create game' }, { status: 500 });
  }
}
