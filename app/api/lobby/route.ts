import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';

export const dynamic = 'force-dynamic';

// In-memory store for active rooms
let activeRooms = new Map<string, any>();

// Clean up old rooms every 5 minutes (30 min expiration)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of activeRooms.entries()) {
    if (now - room.createdAt > 1000 * 60 * 30) {
      activeRooms.delete(code);
    }
  }
}, 1000 * 60 * 5);

export async function GET() {
  try {
    const rooms = Array.from(activeRooms.values());
    
    return NextResponse.json({
      success: true,
      rooms,
      count: rooms.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json(); // ← Fixed: await the promise
    const { action, roomCode, channel, host, maxPlayers = 4, players } = body;

    const pubnub = new PubNub({
      publishKey: process.env.PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
    });

    if (action === 'create') {
      const newRoom = {
        roomCode,
        channel,
        host,
        players: 1,
        maxPlayers,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };

      activeRooms.set(roomCode, newRoom);

      await pubnub.publish({
        channel: 'motionplay-lobby',
        message: {
          type: 'new-room',
          ...newRoom,
        },
      });

      return NextResponse.json({ success: true, room: newRoom });
    }

    if (action === 'update') {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.players = players || room.players;   // ← Now safe
        room.lastUpdated = Date.now();
        activeRooms.set(roomCode, room);

        // Optional: Broadcast update
        await pubnub.publish({
          channel: 'motionplay-lobby',
          message: { type: 'room-update', roomCode, players: room.players },
        });
      }
    }

    if (action === 'remove') {
      activeRooms.delete(roomCode);
      await pubnub.publish({
        channel: 'motionplay-lobby',
        message: { type: 'room-closed', roomCode },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Lobby API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
