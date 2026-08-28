import { isServerGarbage, looksLikeName } from "./quality.ts";
import type { ModelTurn, Phase, WireMessage } from "./types";

export const MIN_SUBSTANTIVE_TURNS = 10;

export function asComplete(value: unknown): boolean {
  return value === true || value === "true";
}

export function isSubstantiveUserTurn(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isServerGarbage(trimmed) || looksLikeName(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 12 || trimmed.length >= 70;
}

export function countSubstantiveTurns(messages: WireMessage[]): number {
  return messages.filter((m) => m.role === "user" && isSubstantiveUserTurn(m.content)).length;
}

export function candidateAskedToClose(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(encerrar|encerramento|pode fechar|vamos fechar|pode concluir|vamos concluir|quero o parecer|emite o parecer|emitir o parecer|pode dar o parecer|pode finalizar|vamos finalizar|acho que é isso|não tenho mais pergunta|nao tenho mais pergunta)\b/.test(
    t,
  );
}

export function lastUserText(messages: WireMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user") return msg.content;
  }
  return "";
}

export function canCloseInterview(messages: WireMessage[]): boolean {
  return (
    countSubstantiveTurns(messages) >= MIN_SUBSTANTIVE_TURNS ||
    candidateAskedToClose(lastUserText(messages))
  );
}

export function gateComplete(turn: ModelTurn, messages: WireMessage[]): ModelTurn {
  if (!turn.complete) {
    return { ...turn, complete: false, scorecard: null };
  }
  if (canCloseInterview(messages)) return turn;
  const phase: Phase = turn.phase === "encerramento" ? "lideranca" : turn.phase;
  return {
    ...turn,
    complete: false,
    scorecard: null,
    phase,
  };
}
