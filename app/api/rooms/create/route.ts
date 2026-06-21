import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { hostId, maxPlayers = 4 } = await request.json();

    if (!hostId) {
      return NextResponse.json({ success: false, error: 'hostId is required' }, { status: 400 });
    }

    const roomCode = uuidv4().slice(0, 8).toUpperCase();
    const channel = `motionplay-room-${roomCode}`;

    const pubnub = new PubNub({
      publishKey: process.env.PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
      userId: 'motionplay-server',   // ← Fixed: Required userId
    });

    const newRoom = {
      roomCode,
      channel,
      host: hostId,
      players: 1,
      maxPlayers,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // Save to lobby
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/lobby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        roomCode,
        channel,
        host: hostId,
        maxPlayers,
      }),
    });

    await pubnub.publish({
      channel: 'motionplay-lobby',
      message: {
        type: 'new-room',
        ...newRoom,
      },
    });

    return NextResponse.json({ 
      success: true, 
      roomCode, 
      channel,
      room: newRoom 
    });

  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create room' 
    }, { status: 500 });
  }
}
