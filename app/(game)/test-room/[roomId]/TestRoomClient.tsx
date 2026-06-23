"use client";

import { use } from "react";
import { useState } from "react";

export default function TestRoomClient({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const [userId] = useState(() =>
    crypto.randomUUID()
  );

  return (
    <div>
      <h1>Room: {roomId}</h1>
      <p>User: {userId}</p>
    </div>
  );
}
