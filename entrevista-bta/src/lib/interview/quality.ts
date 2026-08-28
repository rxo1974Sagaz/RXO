import type { Phase } from "./types";

export type DraftLevel = "empty" | "garbage" | "thin" | "ok" | "strong";

export type DraftQuality = {
  level: DraftLevel;
  label: string;
  canSend: boolean;
};

const GARBAGE_RE =
  /^(x+|ok+|teste+|test+|asdf+|qwer+|zxcv+|lorem|ipsum|n\/?a|sim+|nao+|não+|talvez|abc+|123+|kkk+|haha+|…+|\.+|-+|_+)$/i;

export function looksLikeName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 48) return false;
  const words = trimmed.split(/\s+/);
  return words.length <= 5 && words.every((w) => /^[\p{L}.''-]+$/u.test(w));
}

export function looksLikeQuestion(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.includes("?") && words.length >= 4;
}

function uniqueChars(text: string): number {
  return new Set(text.replace(/\s+/g, "").toLowerCase()).size;
}

function isGarbage(text: string): string | null {
  const trimmed = text.trim();
  const compact = trimmed.replace(/\s+/g, "");
  const lower = trimmed.toLowerCase();

  if (/(.)\1{7,}/.test(compact)) {
    return "Tecla repetida não é resposta. A banca espera conteúdo.";
  }
  const unique = uniqueChars(trimmed);
  if (compact.length >= 10 && unique <= 6) {
    return "Isso não tem informação. Escreva o que de fato aconteceu.";
  }
  if (GARBAGE_RE.test(compact) || /lorem ipsum|xxxxxxxx|tecle aqui|placeholder/.test(lower)) {
    return "Placeholder não entra na ata. Responda de verdade.";
  }
  const letters = compact.replace(/[^a-zà-ú]/gi, "");
  if (letters.length > 14 && !/[aeiouáéíóúâêôãõà]/i.test(letters)) {
    return "Isso não forma uma resposta em português.";
  }
  return null;
}

export function assessDraft(raw: string, phase: Phase): DraftQuality {
  const text = raw.trim();
  if (!text) return { level: "empty", label: "", canSend: false };

  const garbage = isGarbage(text);
  if (garbage) return { level: "garbage", label: garbage, canSend: true };

  const relaxed = phase === "abertura" || phase === "contrapergunta" || phase === "encerramento";
  if (looksLikeName(text) || looksLikeQuestion(text) || relaxed && text.length >= 8) {
    if (text.length < 12 && !looksLikeName(text) && !looksLikeQuestion(text)) {
      return {
        level: "thin",
        label: "Curto. Se for nome, ok. Se for resposta, falta carne.",
        canSend: true,
      };
    }
    return { level: "ok", label: "Pode enviar.", canSend: true };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const hasFact =
    /\d/.test(text) ||
    /\b(oee|hazop|s&op|sap|iso|fssc|planta|fábrica|turno|capex|sku|tonelada|colaborador|equipe|mês|ano|percent|%|amtex|ingredion|bta|clorito|anvisa|mapa|falconi|sorbitol|micotoxina|medellín|medellin|recife)\b/i.test(
      text,
    );

  if (words.length < 12 || text.length < 70) {
    return {
      level: "thin",
      label: "Ainda raso. Falta fato, número, contexto ou consequência.",
      canSend: true,
    };
  }
  if (text.length > 220 && hasFact) {
    return { level: "strong", label: "Há substância. Envie quando terminar.", canSend: true };
  }
  if (text.length > 140) {
    return { level: "ok", label: "Dá para enviar — quanto mais concreto, melhor.", canSend: true };
  }
  return {
    level: "thin",
    label: "Está genérico. Troque adjetivo por evidência.",
    canSend: true,
  };
}

const REJECTIONS: string[] = [
  "Não. Isso não é resposta. Estou aqui para uma conversa de executivo, não para preencher espaço. Me dá conteúdo real: o que você fez, onde, com que resultado.",
  "Vou ser franca: tecla repetida, ‘xxxxx’, ‘teste’ — isso não entra na ata. Respire. Escreva o que de fato aconteceu.",
  "Eu não avanço com isso. A cadeira pede densidade. Tenta de novo, com um caso, um número, um trade-off.",
  "Isso eu recuso. Se a resposta não tem fato, para mim não aconteceu. Vamos outra vez.",
];

export function rejectionReply(): string {
  return REJECTIONS[Math.floor(Math.random() * REJECTIONS.length)] ?? REJECTIONS[0]!;
}

export function isServerGarbage(text: string): boolean {
  return isGarbage(text) !== null;
}
