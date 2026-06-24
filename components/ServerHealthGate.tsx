"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "./LoadingScreen";

type Props = {
  wsUrl: string;
  children: React.ReactNode;
};

export default function ServerHealthGate({ wsUrl, children }: Props) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Checking server...");

  const httpUrl = wsUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://");

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const waitForServer = async () => {
    while (true) {
      try {
        const res = await fetch(`${httpUrl}/health`);
        const data = await res.json();

        if (res.ok && data.status === "ok") {
          setStatus("Server ready!");
          await sleep(300);
          setReady(true);
          return;
        }

        setStatus("Server starting...");
      } catch {
        setStatus("Connecting...");
      }

      await sleep(1000);
    }
  };

  useEffect(() => {
    waitForServer();
  }, []);

  if (!ready) {
    return <LoadingScreen status={status} />;
  }

  return <>{children}</>;
}
