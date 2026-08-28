import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asComplete,
  canCloseInterview,
  candidateAskedToClose,
  countSubstantiveTurns,
  gateComplete,
  isSubstantiveUserTurn,
  MIN_SUBSTANTIVE_TURNS,
} from "./close.ts";
import type { ModelTurn, WireMessage } from "./types.ts";

function turn(over: Partial<ModelTurn> = {}): ModelTurn {
  return {
    reply: "Vamos continuar.",
    phase: "operacao",
    verdict: "adequate",
    note: "",
    topics: [],
    focus: "",
    complete: false,
    hint: "",
    scorecard: null,
    ...over,
  };
}

function msgs(userTexts: string[]): WireMessage[] {
  return userTexts.flatMap((content, i) => [
    { role: "assistant" as const, content: `fala ${i}` },
    { role: "user" as const, content },
  ]);
}

const dense =
  "Na planta de Cali subimos o OEE de 75 para 88 em nove meses, com SMED no reator e um quadro de parada que a supervisão atualizava a cada turno.";

describe("asComplete", () => {
  it("only treats boolean true or the string 'true' as complete", () => {
    assert.equal(asComplete(true), true);
    assert.equal(asComplete("true"), true);
    assert.equal(asComplete(false), false);
    assert.equal(asComplete("false"), false);
    assert.equal(asComplete(1), false);
    assert.equal(asComplete("1"), false);
    assert.equal(asComplete(null), false);
    assert.equal(asComplete(undefined), false);
  });
});

describe("substantive turns", () => {
  it("ignores name, garbage and slogans", () => {
    assert.equal(isSubstantiveUserTurn("Ricardo Xavier"), false);
    assert.equal(isSubstantiveUserTurn("xxxxx"), false);
    assert.equal(isSubstantiveUserTurn("ok"), false);
    assert.equal(isSubstantiveUserTurn(dense), true);
  });

  it("counts only real answers", () => {
    const history = msgs(["Ricardo Xavier", "xxxxx", dense, dense]);
    assert.equal(countSubstantiveTurns(history), 2);
  });
});

describe("gateComplete", () => {
  it("blocks a model that tries to close on the third answer", () => {
    const history = msgs([dense, dense, dense]);
    const closed = gateComplete(
      turn({
        complete: true,
        phase: "encerramento",
        scorecard: {
          recommendation: "segunda_entrevista",
          headline: "Cedo demais",
          strengths: [],
          gaps: [],
          advice: [],
          fit: "",
        },
      }),
      history,
    );
    assert.equal(closed.complete, false);
    assert.equal(closed.scorecard, null);
    assert.equal(closed.phase, "lideranca");
  });

  it("allows close after enough substance", () => {
    const history = msgs(Array.from({ length: MIN_SUBSTANTIVE_TURNS }, () => dense));
    const closed = gateComplete(turn({ complete: true, phase: "encerramento" }), history);
    assert.equal(closed.complete, true);
    assert.equal(canCloseInterview(history), true);
  });

  it("allows close when the candidate asks to wrap up", () => {
    assert.equal(candidateAskedToClose("Pode encerrar, quero o parecer."), true);
    const history = msgs([dense, "Pode encerrar, quero o parecer."]);
    const closed = gateComplete(turn({ complete: true }), history);
    assert.equal(closed.complete, true);
  });
});
