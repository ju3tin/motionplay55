import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';
import { v4 as uuidv4 } from 'uuid';
import { addRoom } from '@/lib/lobby';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { hostId, maxPlayers = 4 } = await request.json();

    const finalHostId = hostId || `host-${Date.now()}`;

    const roomCode = uuidv4().slice(0, 8).toUpperCase();
    const channel = `motionplay-room-${roomCode}`;

    const pubnub = new PubNub({
      publishKey: process.env.PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
      userId: 'motionplay-server',
    });

    const newRoom = {
      roomCode,
      channel,
      host: finalHostId,
      players: 1,
      maxPlayers,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    addRoom(newRoom);

    await pubnub.publish({
      channel: 'motionplay-lobby',
      message: { type: 'new-room', ...newRoom },
    });

    return NextResponse.json({
      success: true,
      roomCode,
      channel,
      room: newRoom,
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
