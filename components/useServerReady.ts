"use client";

import { useEffect, useState } from "react";

type Options = {
  url: string;
};

export function useServerReady({ url }: Options) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("starting");

  const sleep = (ms: number) =>
    new Promise((r) => setTimeout(r, ms));

  const checkHealth = async () => {
    try {
      const res = await fetch(url);
      const data = await res.json();

      return res.ok && data.status === "ok";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 🔥 initial warm-up ping (important for Render cold start)
      setStatus("warming server...");
      await fetch(url).catch(() => {});

      let delay = 500;

      while (!cancelled) {
        setStatus("checking server...");

        const ok = await checkHealth();

        if (ok) {
          setStatus("ready");
          setReady(true);
          return;
        }

        setStatus(`waiting (${delay}ms retry)`);

        await sleep(delay);

        // exponential backoff
        delay = Math.min(delay * 2, 5000);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { ready, status };
}
