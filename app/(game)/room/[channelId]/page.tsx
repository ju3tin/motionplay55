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
  publishKey: "pub-c-a2b04589-4986-4d7f-a61b-7cb9b8a205cd",
  subscribeKey: "sub-c-01167be0-7e5f-43e6-8342-7cd97053cebd",
      userId: "web-user-" + Math.random().toString(36).slice(2),
    })

    pubnub.addListener({
      status: (s) => {
        console.log("STATUS:", s)
        setStatus(s.category || "unknown")
      },

      message: (event) => {
        console.log("MESSAGE:", event.message)

        setMessages((prev) => [
          {
            time: new Date().toISOString(),
            data: event.message,
          },
          ...prev,
        ])
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
              background: "#f3f3f3",
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
