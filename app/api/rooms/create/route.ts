import { NextRequest, NextResponse } from 'next/server';
import pubnub from '@/lib/pubnub';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { hostId, maxPlayers = 4 } = await request.json();

    const roomCode = uuidv4().slice(0, 8).toUpperCase();
    const channel = `motionplay-room-${roomCode}`;

    // Announce new room in lobby
    await pubnub.publish({
      channel: 'motionplay-lobby',
      message: {
        type: 'new-room',
        roomCode,
        channel,
        host: hostId,
        players: 1,
        maxPlayers,
        createdAt: Date.now(),
      },
    });

    return NextResponse.json({ success: true, roomCode, channel });
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
