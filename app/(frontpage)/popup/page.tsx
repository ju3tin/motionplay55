import ServerHealthGate from "@/components/ServerHealthGate";
import Chat from "./Chat";

export default function Page() {
  return (
    <ServerHealthGate wsUrl={process.env.NEXT_PUBLIC_WS_URL!}>
      <Chat />
    </ServerHealthGate>
  );
}
