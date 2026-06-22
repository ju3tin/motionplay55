"use client"

import { useEffect, useState } from "react"
import PubNub from "pubnub1"
import { useParams } from "next/navigation"

export default function RoomPage() {
  const params = useParams()
  const channelId = params?.channelId as string

  const [userId, setUserId] = useState("")
  const [connectedUserId, setConnectedUserId] = useState<string | null>(null)

  const [pubnub, setPubnub] = useState<PubNub | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState("not connected")

  // Connect ONLY when user clicks join
  const joinRoom = () => {
    if (!userId || !channelId) return

    const client = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: userId,
    })

    client.addListener({
      message: (event) => {
        setMessages((prev) => [
          {
            time: new Date().toISOString(),
            data: event.message,
          },
          ...prev,
        ])
      },

      status: (s) => {
        setStatus(s.category || "unknown")
      },
    })

    client.subscribe({
      channels: [channelId],
    })

    setPubnub(client)
    setConnectedUserId(userId)
    setStatus("connecting...")
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Live Room</h1>

      <p><b>Channel:</b> {channelId}</p>

      {/* USER INPUT */}
      {!connectedUserId && (
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Enter userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{
              padding: 10,
              marginRight: 10,
              border: "1px solid #ccc",
            }}
          />

          <button onClick={joinRoom}>
            Join Room
          </button>
        </div>
      )}

      {connectedUserId && (
        <p><b>User:</b> {connectedUserId}</p>
      )}

      <p><b>Status:</b> {status}</p>

      <hr />

      {messages.length === 0 ? (
        <p>No messages yet...</p>
      ) : (
        messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              marginBottom: 10,
              background: "#f4f4f4",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {msg.time}
            </div>

            <pre style={{ margin: 0 }}>
              {JSON.stringify(msg.data, null, 2)}
            </pre>
          </div>
        ))
      )}
    </div>
  )
}
