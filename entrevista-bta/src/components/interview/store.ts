import { useStore } from "zustand/react";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { sendTurn, writeBriefing } from "@/lib/interview/api";
import { pickOpener } from "@/lib/interview/openers";
import { assessDraft, looksLikeName, rejectionReply } from "@/lib/interview/quality";
import type {
  Briefing,
  BriefingStatus,
  ChatMessage,
  Phase,
  Scorecard,
  Verdict,
} from "@/lib/interview/types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function message(
  role: ChatMessage["role"],
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return { id: uid(), role, content, at: Date.now(), ...extra };
}

type InterviewState = {
  stage: "landing" | "room";
  messages: ChatMessage[];
  phase: Phase;
  notes: string[];
  covered: string[];
  focus: string;
  complete: boolean;
  scorecard: Scorecard | null;
  briefing: Briefing | null;
  briefingStatus: BriefingStatus;
  briefingError: string | null;
  sending: boolean;
  sendingSince: number | null;
  error: string | null;
  startedAt: number | null;
  candidateName: string;
  enterRoom: () => void;
  resume: () => void;
  reset: () => void;
  continueChat: () => void;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  retryBriefing: () => Promise<void>;
  cancelSend: () => void;
};

const empty = {
  stage: "landing" as const,
  messages: [] as ChatMessage[],
  phase: "abertura" as Phase,
  notes: [] as string[],
  covered: [] as string[],
  focus: "",
  complete: false,
  scorecard: null as Scorecard | null,
  briefing: null as Briefing | null,
  briefingStatus: "idle" as BriefingStatus,
  briefingError: null as string | null,
  sending: false,
  sendingSince: null as number | null,
  error: null as string | null,
  startedAt: null as number | null,
  candidateName: "",
};

type Persisted = Pick<
  InterviewState,
  | "stage"
  | "messages"
  | "phase"
  | "notes"
  | "covered"
  | "focus"
  | "complete"
  | "scorecard"
  | "startedAt"
  | "candidateName"
>;

const STORAGE_KEY = "bta-entrevista-v2";

function safeStorage() {
  const memory = new Map<string, string>();
  const local =
    typeof window !== "undefined"
      ? window.localStorage
      : {
          getItem: (k: string) => memory.get(k) ?? null,
          setItem: (k: string, v: string) => {
            memory.set(k, v);
          },
          removeItem: (k: string) => {
            memory.delete(k);
          },
        };
  return {
    getItem: (name: string) => {
      try {
        return local.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        local.setItem(name, value);
      } catch {
        /* quota / private mode */
      }
    },
    removeItem: (name: string) => {
      try {
        local.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

function readSaved(): Partial<Persisted> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<Persisted> };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

function seed() {
  const saved = readSaved();
  if (!saved) return empty;
  const messages = Array.isArray(saved.messages) ? saved.messages : [];
  const last = messages[messages.length - 1];
  return {
    ...empty,
    ...saved,
    messages,
    stage: (messages.length > 0 ? "room" : "landing") as "landing" | "room",
    sending: false,
    sendingSince: null,
    briefingStatus: "idle" as BriefingStatus,
    error:
      last?.role === "user"
        ? "A última fala não chegou na banca. Tente de novo — nada se perdeu."
        : null,
  };
}

function buildStore() {
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let flight = 0;

  return createStore<InterviewState>()(
    persist(
      (set, get) => {
        function armWatchdog(mine: number) {
          clearTimeout(watchdog);
          watchdog = setTimeout(() => {
            if (get().sending && flight === mine) {
              set({
                sending: false,
                sendingSince: null,
                error: "A banca demorou nesta fala. Tente de novo — a conversa está salva.",
              });
            }
          }, 20000);
        }

        async function requestBriefing(history: ChatMessage[]) {
          const state = get();
          if (state.briefingStatus === "writing") return;
          set({ briefingStatus: "writing", briefingError: null });
          try {
            const result = await writeBriefing({
              data: {
                messages: history.map((m) => ({ role: m.role, content: m.content })),
                candidateName: state.candidateName || "Ricardo",
                notes: state.notes,
                scorecard: state.scorecard,
              },
            });
            if (!result.ok) {
              set({ briefingStatus: "error", briefingError: result.error });
              return;
            }
            set({ briefing: result.briefing, briefingStatus: "ready", briefingError: null });
          } catch {
            set({
              briefingStatus: "error",
              briefingError: "Não consegui redigir o informe. Tente de novo.",
            });
          }
        }

        async function requestReply(
          nextMessages: ChatMessage[],
          name: string,
          continuing: boolean,
        ) {
          const mine = ++flight;
          const userTurns = nextMessages.filter((m) => m.role === "user").length;
          armWatchdog(mine);
          try {
            const result = await sendTurn({
              data: {
                messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
                phase: get().phase,
                turnIndex: userTurns,
                candidateName: name,
                continuing,
              },
            });

            if (flight !== mine) return;
            if (result.ok) {
              const turn = result.turn;
              const assistant = message("assistant", turn.reply, {
                verdict: turn.verdict as Verdict,
                note: turn.note,
                hint: turn.hint,
              });
              const notes = turn.note ? [...get().notes, turn.note].slice(-12) : get().notes;
              const covered = Array.from(new Set([...get().covered, ...turn.topics])).slice(-16);
              set({
                stage: "room",
                messages: [...nextMessages, assistant],
                phase: turn.phase,
                notes,
                covered,
                focus: turn.focus,
                complete: turn.complete,
                scorecard: turn.scorecard ?? get().scorecard,
                sending: false,
                sendingSince: null,
                error: null,
              });
              if (turn.complete) {
                void requestBriefing([...nextMessages, assistant]);
              }
              return;
            }
            set({ sending: false, sendingSince: null, error: result.error });
          } catch {
            if (flight !== mine) return;
            set({
              sending: false,
              sendingSince: null,
              error: "Falha de conexão com a banca. Tente enviar de novo.",
            });
          } finally {
            clearTimeout(watchdog);
            if (flight === mine && get().sending) {
              set({
                sending: false,
                sendingSince: null,
                error: get().error ?? "A banca não respondeu. Tente de novo — nada se perdeu.",
              });
            }
          }
        }

        return {
          ...seed(),
          enterRoom: () => {
            const opener = pickOpener();
            set({
              ...empty,
              stage: "room",
              messages: [message("assistant", opener)],
              startedAt: Date.now(),
              candidateName: "Ricardo",
            });
          },
          resume: () => set({ stage: "room", error: null, sending: false, sendingSince: null }),
          reset: () => {
            flight += 1;
            clearTimeout(watchdog);
            set({ ...empty });
          },
          continueChat: () =>
            set({
              complete: false,
              phase: get().phase === "encerramento" ? "contrapergunta" : get().phase,
              error: null,
            }),
          cancelSend: () => {
            flight += 1;
            clearTimeout(watchdog);
            set({
              sending: false,
              sendingSince: null,
              error: "Envio interrompido. A fala está na ata — tente de novo.",
            });
          },
          send: async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || get().sending) return;

            const quality = assessDraft(trimmed, get().phase);
            if (quality.level === "garbage") {
              const userMsg = message("user", trimmed, { verdict: "rejected" });
              const reply = rejectionReply();
              set({
                stage: "room",
                messages: [
                  ...get().messages,
                  userMsg,
                  message("assistant", reply, {
                    verdict: "rejected",
                    note: "Resposta recusada.",
                    hint: "Fato, número, contexto. Sem isso ela não segue.",
                  }),
                ],
                notes: [...get().notes, "Tentou enviar conteúdo vazio. Recusado."].slice(-12),
                error: null,
                sending: false,
                sendingSince: null,
              });
              return;
            }

            const name =
              looksLikeName(trimmed) && !get().candidateName ? trimmed : get().candidateName;
            const continuing = get().complete;
            const userMsg = message("user", trimmed);
            const nextMessages = [...get().messages, userMsg];
            set({
              stage: "room",
              messages: nextMessages,
              sending: true,
              sendingSince: Date.now(),
              error: null,
              candidateName: name,
              complete: false,
            });
            await requestReply(nextMessages, name, continuing);
          },
          retry: async () => {
            const state = get();
            if (state.sending) return;
            const last = state.messages[state.messages.length - 1];
            if (last?.role !== "user") return;
            set({ sending: true, sendingSince: Date.now(), error: null, stage: "room" });
            await requestReply(state.messages, state.candidateName, false);
          },
          retryBriefing: async () => {
            const state = get();
            if (state.briefingStatus === "writing" || !state.complete) return;
            await requestBriefing(state.messages);
          },
        };
      },
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(safeStorage),
        partialize: (s): Persisted => ({
          stage: s.messages.length > 0 ? "room" : s.stage,
          messages: s.messages.slice(-30),
          phase: s.phase,
          notes: s.notes,
          covered: s.covered,
          focus: s.focus,
          complete: s.complete,
          scorecard: s.scorecard,
          startedAt: s.startedAt,
          candidateName: s.candidateName,
        }),
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<Persisted>;
          const messages = saved.messages ?? current.messages;
          const last = messages[messages.length - 1];
          return {
            ...current,
            ...saved,
            messages,
            stage: messages.length > 0 ? "room" : (saved.stage ?? current.stage),
            sending: false,
            sendingSince: null,
            briefing: current.briefing,
            briefingStatus: current.briefingStatus,
            error:
              current.error ??
              (last?.role === "user"
                ? "A última fala não chegou na banca. Tente de novo — nada se perdeu."
                : null),
          };
        },
      },
    ),
  );
}

type InterviewStore = ReturnType<typeof buildStore>;

let singleton: InterviewStore | undefined;

export function getInterviewStore(): InterviewStore {
  if (!singleton) singleton = buildStore();
  return singleton;
}

export function useInterview<T>(selector: (state: InterviewState) => T): T {
  return useStore(getInterviewStore(), selector);
}
