"use client"

import { useEffect, useState } from "react"
import PubNub from "pubnub"
import { useParams } from "next/navigation"

export default function RoomPage() {
  const params = useParams()
  const channelId = params?.channelId as string

  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState("connecting")

  useEffect(() => {
    if (!channelId) return

    const pubnub = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: "user-" + Math.random().toString(36).slice(2), // auto userId
    })

    pubnub.addListener({
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

    pubnub.subscribe({
      channels: [channelId],
    })

    return () => {
      pubnub.unsubscribeAll()
    }
  }, [channelId])

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Live Room</h1>

      <p><b>Channel:</b> {channelId}</p>
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
