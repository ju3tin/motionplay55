// app/api/games/messages/[roomId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import PubNub from 'pubnub';

const serverPubNub = new PubNub({
  publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
  subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
  secretKey: process.env.PUBNUB_SECRET_KEY!,
  uuid: 'motionplay-server',
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const channel = `${roomId}`;

    const history = await serverPubNub.fetchMessages({
      channels: [channel],
      count: 100,
    });

    return NextResponse.json({
      success: true,
      messages: history.channels[channel] || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
