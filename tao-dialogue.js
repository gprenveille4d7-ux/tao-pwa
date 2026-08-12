import { t } from "./locales/index.js";

const DIALOGUE_TESTS = Object.freeze({
  short: Object.freeze({
    label: "Texte court",
    text: "Je t’écoute.",
  }),
  medium: Object.freeze({
    label: "Texte moyen",
    text: "Prends un instant pour regarder le ciel au-delà du Pavillon. Chaque lumière y trouve sa place sans presser la suivante. Nous pouvons avancer avec la même attention. Je suis ici, et je t’écoute.",
  }),
  long: Object.freeze({
    label: "Texte long",
    text: [
      "Le calme du Pavillon ne demande rien. Il offre seulement un espace où les pensées peuvent se déposer, comme la lumière sur la surface d’un lac.",
      "Certaines questions arrivent déjà formées. D’autres apparaissent peu à peu, au détour d’un souvenir, d’une hésitation ou d’un détail que l’on croyait sans importance. Il n’est pas nécessaire de les presser.",
      "Nous pouvons observer ce qui est présent, distinguer ce qui relève du bruit et reconnaître ce qui mérite vraiment ton attention. Une réponse utile commence souvent par cette écoute patiente.",
      "Lorsque tu seras prêt, formule simplement ce qui t’amène. Quelques mots suffisent. Nous prendrons ensuite le temps de parcourir ensemble les chemins possibles, sans précipitation.",
    ].join("\n\n"),
  }),
});

export function createTaoDialogue(root) {
  const content = root.querySelector("[data-dialogue-content]");
  const scrollRegion = root.querySelector("[data-dialogue-scroll]");
  const context = root.querySelector(".tao-dialogue__context");
  const footer = root.querySelector("[data-dialogue-footer]");
  const meta = root.querySelector("[data-dialogue-meta]");
  const position = root.querySelector("[data-dialogue-position]");
  const previous = root.querySelector("[data-dialogue-previous]");
  const next = root.querySelector("[data-dialogue-next]");
  let messages = [];
  let messageIndex = 0;

  function renderParagraphs(text, ariaLabel) {
    const paragraphs = String(text).split(/\n\s*\n/).filter(Boolean);
    content.replaceChildren(...paragraphs.map((paragraphText) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = paragraphText;
      return paragraph;
    }));
    scrollRegion.setAttribute("aria-label", ariaLabel);
    scrollRegion.scrollTop = 0;
  }

  function setText(text, ariaLabel = t("common.app.dialogueRegion")) {
    messages = [];
    messageIndex = 0;
    footer.hidden = true;
    context.textContent = t("common.app.pavilionName");
    renderParagraphs(text, ariaLabel);
    document.dispatchEvent(new CustomEvent("tao:dialogue-static"));
  }

  function renderDailyMessage() {
    const text = messages[messageIndex];
    renderParagraphs(text, `${t("common.app.dialogueRegion")} — ${t("guidance.dailyBrief.position", { current: messageIndex + 1, total: messages.length })}`);
    position.textContent = t("guidance.dailyBrief.position", { current: messageIndex + 1, total: messages.length });
    document.dispatchEvent(new CustomEvent("tao:dialogue-message-change", { detail: { index: messageIndex, total: messages.length, text } }));
  }

  function setDailyBrief(brief) {
    messages = (brief.messages ?? []).map(String).filter(Boolean);
    if (!messages.length) return setText(brief.fallback ?? "Je t’écoute.");
    messageIndex = 0;
    context.textContent = brief.context ?? t("guidance.dailyBrief.context");
    meta.textContent = brief.meta ?? "";
    previous.setAttribute("aria-label", t("guidance.dailyBrief.previous"));
    next.setAttribute("aria-label", t("guidance.dailyBrief.next"));
    footer.hidden = false;
    previous.disabled = messages.length < 2;
    next.disabled = messages.length < 2;
    renderDailyMessage();
    document.dispatchEvent(new CustomEvent("tao:daily-brief-change", { detail: { total: messages.length } }));
  }

  previous.addEventListener("click", () => {
    messageIndex = (messageIndex - 1 + messages.length) % messages.length;
    renderDailyMessage();
  });
  next.addEventListener("click", () => {
    messageIndex = (messageIndex + 1) % messages.length;
    renderDailyMessage();
  });

  return Object.freeze({ setText, setDailyBrief });
}

function initializeTaoDialogue() {
  const root = document.querySelector("[data-tao-dialogue]");
  const dialogue = createTaoDialogue(root);
  const debugEnabled = ["poses", "scene"].includes(
    new URLSearchParams(window.location.search).get("debug"),
  );

  dialogue.setText(DIALOGUE_TESTS.short.text);

  if (!debugEnabled) return dialogue;

  const select = document.querySelector("[data-dialogue-select]");
  const label = document.querySelector("[data-dialogue-label]");

  function selectTest(testId) {
    const test = DIALOGUE_TESTS[testId];

    if (!test) throw new Error(`Texte de test inconnu : ${testId}`);

    dialogue.setText(test.text, `${t("common.app.dialogueRegion")} — ${test.label.toLowerCase()}`);
    label.value = test.label;
  }

  select.addEventListener("change", () => selectTest(select.value));
  selectTest("short");
  return dialogue;
}

const taoDialogue = initializeTaoDialogue();

export function setTaoDialogueText(text, ariaLabel) {
  taoDialogue.setText(text, ariaLabel);
}

export function setTaoDailyBrief(brief) {
  taoDialogue.setDailyBrief(brief);
}
