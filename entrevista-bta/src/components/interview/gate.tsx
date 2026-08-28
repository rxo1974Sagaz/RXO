import { Landing } from "./landing";
import { Room } from "./room";
import { useInterview } from "./store";

export function InterviewGate() {
  const stage = useInterview((s) => s.stage);
  const hasSession = useInterview((s) => s.messages.length > 0);
  return stage === "room" || hasSession ? <Room /> : <Landing />;
}
