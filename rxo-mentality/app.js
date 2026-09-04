import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.84";
import {
  BASE_SYSTEM_PROMPT,
  CLOSING_BLOCK,
  FINAL_INSTRUCTION,
  FIRST_MESSAGE,
  selectKnowledge
} from "./knowledge.js";

const MODEL_OPTIONS = {
  light: {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Leve",
    description: "O modelo leve exige cerca de 1 GB de download e memória gráfica compatível. Depois, ele permanece no cache do navegador."
  },
  balanced: {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Equilibrado",
    description: "O modelo equilibrado raciocina melhor, mas pode consumir aproximadamente 2,7 GB de memória gráfica e download. Depois, ele permanece no cache do navegador."
  }
};

const STORAGE_KEY = "rxo-mentality-conversation-v1";
const CONTINUITY_PATTERN = /\n?─{8,}[\s\S]*$/u;
const FINAL_REQUEST_PATTERN = /^(?:\[?2\]?|finalizar(?:\s+a)?\s+conversa|encerrar(?:\s+a)?\s+conversa)\s*[.!]?$/i;

const elements = {
  messages: document.querySelector("#messages"),
  composer: document.querySelector("#composer"),
  input: document.querySelector("#composer-input"),
  send: document.querySelector("#send-button"),
  reset: document.querySelector("#reset-button"),
  modelSelect: document.querySelector("#model-select"),
  loaderCard: document.querySelector("#loader-card"),
  loadButton: document.querySelector("#load-model-button"),
  loaderDescription: document.querySelector("#loader-description"),
  progressWrap: document.querySelector("#progress-wrap"),
  progressBar: document.querySelector("#progress-bar"),
  progressText: document.querySelector("#progress-text"),
  compatibility: document.querySelector("#compatibility-message"),
  engineStatus: document.querySelector("#engine-status"),
  suggestions: [...document.querySelectorAll(".suggestion")]
};

let engine = null;
let isGenerating = false;

const state = loadState();
renderConversation();
checkCompatibility();
updateModelDescription();

elements.modelSelect.addEventListener("change", updateModelDescription);
elements.loadButton.addEventListener("click", initializeEngine);
elements.composer.addEventListener("submit", handleSubmit);
elements.reset.addEventListener("click", resetConversation);
elements.input.addEventListener("input", resizeInput);
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    elements.composer.requestSubmit();
  }
});

elements.suggestions.forEach((button) => {
  button.addEventListener("click", () => {
    if (!engine || isGenerating || state.finalized) return;
    elements.input.value = button.dataset.prompt || "";
    resizeInput();
    elements.input.focus();
  });
});

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.messages)) {
      return {
        messages: stored.messages.slice(-30),
        finalized: Boolean(stored.finalized)
      };
    }
  } catch (error) {
    console.warn("Não foi possível restaurar a conversa local.", error);
  }

  return {
    messages: [{ role: "assistant", content: FIRST_MESSAGE, sources: [] }],
    finalized: false
  };
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Não foi possível salvar a conversa local.", error);
  }
}

function resetConversation() {
  state.messages = [{ role: "assistant", content: FIRST_MESSAGE, sources: [] }];
  state.finalized = false;
  persistState();
  renderConversation();
  setComposerEnabled(Boolean(engine));
  if (engine) elements.input.focus();
}

function renderConversation() {
  elements.messages.replaceChildren();
  state.messages.forEach((message) => appendMessageElement(message));
  scrollToLatest();
}

function appendMessageElement(message, streaming = false) {
  const article = document.createElement("article");
  article.className = `message message-${message.role}`;

  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = message.role === "user" ? "Você" : "RXO Mentality";

  const content = document.createElement("div");
  content.className = "message-content";
  if (streaming) {
    content.innerHTML = '<span class="typing" aria-label="Pensando"><span></span><span></span><span></span></span>';
  } else {
    content.innerHTML = renderMarkdown(message.content);
  }

  article.append(label, content);

  if (message.sources?.length) {
    const sourceLine = document.createElement("p");
    sourceLine.className = "message-sources";
    sourceLine.textContent = `Base consultada: ${message.sources.join(" · ")}`;
    article.append(sourceLine);
  }

  elements.messages.append(article);
  scrollToLatest();
  return { article, content };
}

async function checkCompatibility() {
  if (!window.isSecureContext) {
    showCompatibilityError("A IA local exige HTTPS. Abra esta página pelo endereço publicado no GitHub Pages.");
    return;
  }

  if (!("gpu" in navigator)) {
    showCompatibilityError("Este navegador não oferece WebGPU. Use uma versão atual do Chrome ou Edge em um computador compatível.");
  }
}

function showCompatibilityError(message) {
  elements.compatibility.hidden = false;
  elements.compatibility.textContent = message;
  elements.loadButton.disabled = true;
  setEngineStatus("Incompatível", "error");
}

function updateModelDescription() {
  const selected = MODEL_OPTIONS[elements.modelSelect.value];
  elements.loaderDescription.textContent = selected.description;
}

async function initializeEngine() {
  if (engine) return;

  const selected = MODEL_OPTIONS[elements.modelSelect.value];
  elements.loadButton.disabled = true;
  elements.modelSelect.disabled = true;
  elements.progressWrap.hidden = false;
  elements.compatibility.hidden = true;
  setEngineStatus("Carregando", "loading");

  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) throw new Error("Nenhum adaptador WebGPU compatível foi encontrado.");

    engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
      selected.id,
      {
        initProgressCallback: (report) => {
          const progress = Math.max(0, Math.min(1, Number(report.progress) || 0));
          elements.progressBar.style.width = `${Math.round(progress * 100)}%`;
          elements.progressText.textContent = report.text || `Carregando ${Math.round(progress * 100)}%`;
        }
      }
    );

    elements.loaderCard.hidden = true;
    setEngineStatus(`${selected.label} pronto`, "ready");
    setComposerEnabled(!state.finalized);
    if (!state.finalized) elements.input.focus();
  } catch (error) {
    engine = null;
    elements.loadButton.disabled = false;
    elements.modelSelect.disabled = false;
    elements.progressWrap.hidden = true;
    showCompatibilityError(humanizeEngineError(error));
    console.error(error);
  }
}

function humanizeEngineError(error) {
  const detail = String(error?.message || error || "Erro desconhecido");
  if (/memory|allocation|buffer|device lost/i.test(detail)) {
    return "O dispositivo não possui memória gráfica suficiente para este modelo. Selecione o modelo leve, feche outras abas e tente novamente.";
  }
  if (/webgpu|adapter|gpu/i.test(detail)) {
    return "Não foi possível iniciar o WebGPU neste dispositivo. Use uma versão atual do Chrome ou Edge e verifique se a aceleração de hardware está habilitada.";
  }
  return `Não foi possível carregar a IA local. ${detail}`;
}

function setEngineStatus(text, stateName) {
  elements.engineStatus.textContent = text;
  elements.engineStatus.dataset.state = stateName;
}

function setComposerEnabled(enabled) {
  elements.input.disabled = !enabled;
  elements.send.disabled = !enabled;
  elements.suggestions.forEach((button) => { button.disabled = !enabled; });
  if (state.finalized) {
    elements.input.placeholder = "Conversa finalizada. Use ↻ para começar outra.";
  } else {
    elements.input.placeholder = "Escreva uma tese, pergunta ou argumento…";
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text || !engine || isGenerating || state.finalized) return;

  elements.input.value = "";
  resizeInput();
  addStoredMessage({ role: "user", content: text, sources: [] });
  const userMessage = state.messages[state.messages.length - 1];
  appendMessageElement(userMessage);
  await generateReply(text);
}

async function generateReply(userText) {
  isGenerating = true;
  setComposerEnabled(false);
  setEngineStatus("Analisando", "loading");

  const isFinalRequest = FINAL_REQUEST_PATTERN.test(userText);
  const knowledgeQuery = isFinalRequest
    ? state.messages.filter((message) => message.role === "user").map((message) => message.content).join(" ")
    : userText;
  const knowledge = selectKnowledge(knowledgeQuery, isFinalRequest ? 7 : 5);
  const sources = [...new Set(knowledge.map((item) => item.source))];
  const retrievedContext = knowledge.length
    ? `\n\nCONTEXTO DOCUMENTAL RECUPERADO\n${knowledge.map((item) => `[${item.source}] ${item.text}`).join("\n\n")}`
    : "\n\nNenhuma posição específica foi recuperada para a pergunta atual. Declare essa ausência antes de aplicar os princípios gerais RXO.";

  const modelMessages = buildModelHistory();
  modelMessages.unshift({ role: "system", content: BASE_SYSTEM_PROMPT + retrievedContext });
  if (isFinalRequest) modelMessages.push({ role: "user", content: FINAL_INSTRUCTION });

  const draft = { role: "assistant", content: "", sources };
  const messageElement = appendMessageElement(draft, true);

  try {
    const stream = await engine.chat.completions.create({
      messages: modelMessages,
      temperature: 0.55,
      top_p: 0.9,
      repetition_penalty: 1.06,
      max_tokens: isFinalRequest ? 1800 : 780,
      stream: true
    });

    let response = "";
    for await (const chunk of stream) {
      response += chunk.choices?.[0]?.delta?.content || "";
      messageElement.content.innerHTML = renderMarkdown(response);
      scrollToLatest();
    }

    response = isFinalRequest ? normalizeFinalResponse(response) : normalizeSubstantiveResponse(response);
    messageElement.content.innerHTML = renderMarkdown(response);
    if (sources.length) {
      const sourceLine = document.createElement("p");
      sourceLine.className = "message-sources";
      sourceLine.textContent = `Base consultada: ${sources.join(" · ")}`;
      messageElement.article.append(sourceLine);
    }

    addStoredMessage({ role: "assistant", content: response, sources });
    if (isFinalRequest) state.finalized = true;
    persistState();
  } catch (error) {
    const response = normalizeSubstantiveResponse(
      `A análise foi interrompida pelo motor local. O problema técnico informado foi: ${humanizeEngineError(error)}\n\nA conversa permanece salva neste dispositivo. Tente novamente ou inicie uma nova conversa.`
    );
    messageElement.content.innerHTML = renderMarkdown(response);
    addStoredMessage({ role: "assistant", content: response, sources: [] });
    persistState();
    console.error(error);
  } finally {
    isGenerating = false;
    setEngineStatus("Pronto", "ready");
    setComposerEnabled(!state.finalized);
    if (!state.finalized) elements.input.focus();
    scrollToLatest();
  }
}

function buildModelHistory() {
  return state.messages
    .filter((message, index) => !(index === 0 && message.content === FIRST_MESSAGE))
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.role === "assistant"
        ? message.content.replace(CONTINUITY_PATTERN, "").trim()
        : message.content
    }));
}

function normalizeSubstantiveResponse(response) {
  const body = String(response || "").replace(CONTINUITY_PATTERN, "").trim();
  return `${body || "Não há elementos suficientes para uma conclusão responsável."}\n\n${CLOSING_BLOCK}`;
}

function normalizeFinalResponse(response) {
  let body = String(response || "").replace(CONTINUITY_PATTERN, "").trim();
  body = body.replace(/^#?\s*Síntese Final\s*[—-]\s*RXO Mentality\s*/i, "").trim();
  body = body.replace(/Conversa concluída\. RXO Mentality\.?\s*$/i, "").trim();
  return `# Síntese Final — RXO Mentality\n\n${body}\n\nConversa concluída. RXO Mentality.`;
}

function addStoredMessage(message) {
  state.messages.push(message);
  if (state.messages.length > 30) state.messages = state.messages.slice(-30);
  persistState();
}

function resizeInput() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 160)}px`;
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  });
}

function renderMarkdown(markdown) {
  const lines = escapeHtml(String(markdown || "")).split("\n");
  let html = "";
  let listType = null;

  const closeList = () => {
    if (listType) html += `</${listType}>`;
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^─{8,}$/.test(trimmed)) {
      closeList();
      html += "<hr />";
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      const desiredType = bullet ? "ul" : "ol";
      if (listType !== desiredType) {
        closeList();
        html += `<${desiredType}>`;
        listType = desiredType;
      }
      html += `<li>${renderInline((bullet || ordered)[1])}</li>`;
      continue;
    }

    closeList();
    if (trimmed.startsWith("&gt; ")) {
      html += `<blockquote>${renderInline(trimmed.slice(5))}</blockquote>`;
    } else {
      html += `<p>${renderInline(trimmed)}</p>`;
    }
  }

  closeList();
  return html;
}

function renderInline(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
