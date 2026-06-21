import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, playerId } = await request.json();

    if (!roomCode || !playerId) {
      return NextResponse.json(
        { success: false, error: 'roomCode and playerId are required' }, 
        { status: 400 }
      );
    }

    const pubnub = new PubNub({
      publishKey: process.env.PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY!,
      userId: 'motionplay-server',
    });

    // Notify everyone in the room that a new player joined
    await pubnub.publish({
      channel: `motionplay-room-${roomCode}`,
      message: {
        type: 'player-joined',
        playerId,
        timestamp: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined room ${roomCode}`,
    });
  } catch (error: any) {
    console.error('Join room error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to join room'
    }, { status: 500 });
  }
}
