import { useEffect, useState, useRef, useCallback } from 'react';
import PubNub from 'pubnub';

export function usePubNub(userId: string) {
  const [pubnub] = useState(() => {
    if (!process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY || 
        !process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY) {
      console.error('❌ PubNub keys are missing in .env.local');
    }

    return new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: userId || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      // heartbeatInterval: 10, // helps with connection stability
    });
  });

  const [messages, setMessages] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  const publish = useCallback(async (channel: string, message: any) => {
    if (!channel) {
      console.error('Cannot publish: channel is empty');
      return;
    }

    try {
      const result = await pubnub.publish({
        channel,
        message,
        // store: false, // uncomment for high-frequency game updates (saves quota)
      });
      console.log('✅ PubNub Publish Success:', result);
    } catch (error: any) {
      console.error('❌ PubNub Publish Error Details:');
      console.error('Status Code:', error.statusCode);
      console.error('Category:', error.category);
      console.error('Message:', error.message);
      console.error('Full Error:', error);

      // Common friendly messages
      if (error.statusCode === 400) {
        console.error('💡 Likely cause: Invalid channel name, malformed message, or missing keys');
      } else if (error.statusCode === 403) {
        console.error('💡 Likely cause: Access Manager (PAM) permissions issue');
      }
    }
  }, [pubnub]);

  // ... rest of your listener code

  useEffect(() => {
    const listener = {
      message: (event: any) => {
        setMessages((prev) => [...prev, event.message]);
      },
      presence: (event: any) => {
        console.log('Presence event:', event);
      },
      status: (event: any) => {
        console.log('PubNub Status:', event.category, event);
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
    if (!channel) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const subscription = pubnub.channel(channel).subscription();
    subscription.subscribe();
    subscriptionRef.current = subscription;
    console.log(`✅ Subscribed to channel: ${channel}`);
  };

  const setPresenceState = (channel: string, state: any) => {
    try {
      pubnub.setState({ channels: [channel], state });
    } catch (e) {
      console.error('Presence state error:', e);
    }
  };

  return { 
    pubnub, 
    subscribeToChannel, 
    publish, 
    messages, 
    setPresenceState 
  };
}
