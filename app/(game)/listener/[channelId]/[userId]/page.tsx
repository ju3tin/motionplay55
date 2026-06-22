"use client"

import { useEffect, useState } from "react"
import PubNub from "pubnub"

export default function Page({
  params,
}: {
  params: { channelId: string; userId: string }
}) {
  const { channelId, userId } = params

  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState("connecting")

  useEffect(() => {
    const pubnub = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: userId,
    })

    // 1. Add listener FIRST
    pubnub.addListener({
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

      status: (s) => {
        console.log("STATUS:", s)
        setStatus(s.category || "unknown")
      },
    })

    // 2. Subscribe
    pubnub.subscribe({
      channels: [channelId],
    })

    // 3. Cleanup
    return () => {
      pubnub.unsubscribeAll()
    }
  }, [channelId, userId])

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Live Listener</h1>

      <p>
        <b>Channel:</b> {channelId}
      </p>

      <p>
        <b>User:</b> {userId}
      </p>

      <p>
        <b>Status:</b> {status}
      </p>

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
