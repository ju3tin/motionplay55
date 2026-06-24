"use client";

import LoadingScreen from "./LoadingScreen1";
import { useServerReady } from "./useServerReady";

type Props = {
  children: React.ReactNode;
  healthUrl: string;
};

export default function ServerGate({ children, healthUrl }: Props) {
  const { ready, status } = useServerReady({
    url: healthUrl,
  });

  if (!ready) {
    return <LoadingScreen status={status} />;
  }

  return <>{children}</>;
}
