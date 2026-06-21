import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';
import { getAllRooms, addRoom, updateRoomPlayers, removeRoom } from '@/lib/lobby';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = getAllRooms();
    return NextResponse.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, roomCode, channel, host, maxPlayers = 4, players } = await request.json();

    const pubnub = new PubNub({
      publishKey: process.env.PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
      userId: 'motionplay-server',
    });

    if (action === 'create') {
      const newRoom = { 
        roomCode, 
        channel, 
        host, 
        players: 1, 
        maxPlayers, 
        createdAt: Date.now() 
      };
      addRoom(newRoom);

      await pubnub.publish({
        channel: 'motionplay-lobby',
        message: { type: 'new-room', ...newRoom },
      });

      return NextResponse.json({ success: true, room: newRoom });
    }

    if (action === 'update') {
      updateRoomPlayers(roomCode, players || 1);
      await pubnub.publish({
        channel: 'motionplay-lobby',
        message: { type: 'room-update', roomCode, players },
      });
    }

    if (action === 'remove') {
      removeRoom(roomCode);
      await pubnub.publish({
        channel: 'motionplay-lobby',
        message: { type: 'room-closed', roomCode },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Lobby error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
