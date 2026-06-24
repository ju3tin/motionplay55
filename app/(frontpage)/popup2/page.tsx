import ServerGate from "@/components/ServerGate";
import Chat from "@/app/(frontpage)/popup/Chat";

export default function Page() {
  return (
    <ServerGate healthUrl="https://node-gameserver.onrender.com/health">
      <Chat />
    </ServerGate>
  );
}
