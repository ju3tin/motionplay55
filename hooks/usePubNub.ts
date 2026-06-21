import { useEffect, useState, useRef } from 'react';
import PubNub from 'pubnub';

export function usePubNub(userId: string) {
  const [pubnub] = useState(() => new PubNub({
    publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
    subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
    userId: userId,           // Must be unique per user
    // heartbeatInterval: 10, // Optional: keep connection alive
  }));

  const [messages, setMessages] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  // Add listener
  useEffect(() => {
    const listener = {
      message: (event: any) => {
        setMessages((prev) => [...prev, event.message]);
        // Handle game events here (move, score, etc.)
      },
      presence: (event: any) => {
        console.log('Presence:', event); // join, leave, state
      },
      status: (event: any) => {
        console.log('Status:', event.category);
      },
    };

    pubnub.addListener(listener);

    return () => {
      pubnub.removeListener(listener);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [pubnub]);

  const subscribeToChannel = (channel: string) => {
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();

    const subscription = pubnub.channel(channel).subscription();
    subscription.subscribe();
    subscriptionRef.current = subscription;
  };

  const publish = async (channel: string, message: any) => {
    try {
      await pubnub.publish({ channel, message });
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const setPresenceState = (channel: string, state: any) => {
    pubnub.setState({ channels: [channel], state });
  };

  return { pubnub, subscribeToChannel, publish, messages, setPresenceState };
}
