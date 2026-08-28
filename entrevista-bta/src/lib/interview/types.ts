export type Phase =
  | "abertura"
  | "trajetoria"
  | "operacao"
  | "risco"
  | "lideranca"
  | "contrapergunta"
  | "encerramento";

export type Verdict = "rejected" | "thin" | "adequate" | "strong" | "exceptional";

export type Recommendation = "avancar" | "segunda_entrevista" | "nao_avancar";

export type Scorecard = {
  recommendation: Recommendation;
  headline: string;
  strengths: string[];
  gaps: string[];
  advice: string[];
  fit: string;
};

export type BriefingRewrite = {
  original: string;
  rewrite: string;
  why: string;
};

export type Briefing = {
  title: string;
  lead: string;
  positives: string;
  improvements: string;
  rewrites: BriefingRewrite[];
  close: string;
};

export type BriefingStatus = "idle" | "writing" | "ready" | "error";

export type ModelTurn = {
  reply: string;
  phase: Phase;
  verdict: Verdict;
  note: string;
  topics: string[];
  focus: string;
  complete: boolean;
  hint: string;
  scorecard: Scorecard | null;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  at: number;
  verdict?: Verdict;
  note?: string;
  hint?: string;
};

export type WireMessage = {
  role: ChatRole;
  content: string;
};

export const PHASE_LABEL: Record<Phase, string> = {
  abertura: "Abertura",
  trajetoria: "Trajetória",
  operacao: "Operação e capacidade",
  risco: "Risco e cadeia",
  lideranca: "Liderança",
  contrapergunta: "Suas perguntas",
  encerramento: "Parecer",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  rejected: "Não aceita",
  thin: "Rasa",
  adequate: "Suficiente",
  strong: "Densa",
  exceptional: "Excepcional",
};

export const REC_LABEL: Record<Recommendation, string> = {
  avancar: "Avançar",
  segunda_entrevista: "Segunda entrevista",
  nao_avancar: "Não avançar",
};

export function briefingWordCount(briefing: Briefing): number {
  const text = [
    briefing.lead,
    briefing.positives,
    briefing.improvements,
    ...briefing.rewrites.flatMap((r) => [r.original, r.rewrite, r.why]),
    briefing.close,
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
