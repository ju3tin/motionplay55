import { NextRequest, NextResponse } from "next/server";
import PubNub from "pubnub";

const pubnub = new PubNub({
  publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
  subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
  uuid: "game-server",
});

const SHAPES = ["STAR", "SQUAT", "ARMS_UP"];

const rooms = new Map<string, any>();

function getRandomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

export async function POST(req: NextRequest) {
  const { roomId, playerId, pose } = await req.json();

  const channel = `game-${roomId}`;

  console.log("📩 REQUEST:", { roomId, playerId, pose });

  // INIT ROOM
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      targetShape: getRandomShape(),
      players: {},
    });
  }

  const room = rooms.get(roomId);

  // INIT PLAYER
  if (!room.players[playerId]) {
    room.players[playerId] = {
      pose: "IDLE",
      correct: false,
    };
  }

  // UPDATE PLAYER POSE
  room.players[playerId].pose = pose;

  // CHECK MATCH
  room.players[playerId].correct = pose === room.targetShape;

  console.log("🎮 ROOM STATE:", room);

  // CHECK IF ALL PLAYERS ARE CORRECT
  const allCorrect = Object.values(room.players).every(
    (p: any) => p.correct === true
  );

  if (allCorrect) {
    console.log("🏆 ROUND COMPLETE");

    room.targetShape = getRandomShape();

    Object.keys(room.players).forEach((id) => {
      room.players[id].correct = false;
    });
  }

  // BROADCAST STATE
  await pubnub.publish({
    channel,
    message: {
      type: "GAME_STATE",
      state: room,
    },
  });

  console.log("📡 BROADCAST SENT");

  return NextResponse.json({ success: true, room });
}
