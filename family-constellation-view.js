import { analyzeFamilyConstellation } from "./family-number-engine.mjs?v=2.0.0";
import {
  buildFamilyConstellationReading,
  familyObservationFacts,
  familyRarityLabel,
  formatEstimatedFrequency,
} from "./family-constellation-semantic.mjs?v=2.0.0";
import { requestFamilyRarity } from "./family-rarity-client.js?v=2.0.1";
import {
  createFamilyEventId,
  deleteFamilyEvent,
  FAMILY_EVENT_TYPES,
  FAMILY_ROLES,
  getFamilyConstellationPreferences,
  getFamilyEvents,
  saveFamilyConstellationPreferences,
  saveFamilyEvent,
} from "./family-constellation-store.js";
import { element, formatBirthDate } from "./tao-ui.js";
import { t } from "./locales/index.js?v=1.5.0";

const CATEGORY_ORDER = ["recurring", "mirrors", "generations", "dates_times", "events", "curiosities"];
const SYMBOLS = Object.freeze({ 1: "élan et commencement", 2: "relation et réceptivité", 3: "expression et mise en mouvement", 4: "structure et stabilité", 5: "passage et mobilité", 6: "harmonie et responsabilité", 7: "recul et recherche", 8: "organisation et accomplissement", 9: "aboutissement et transmission", 11: "nombre maître associé à l’intuition dans certaines écoles", 22: "nombre maître associé à la construction dans certaines écoles" });

function heading(eyebrow, title, copy) {
  const header = element("header", { className: "product-section__header" });
  header.append(element("p", { className: "product-eyebrow", text: eyebrow }), element("h2", { text: title }));
  if (copy) header.append(element("p", { text: copy }));
  return header;
}

function defaultRole(profile) {
  return ({ parent: "parent", child: "child", partner: "partner" })[profile.relationship] ?? "other";
}

function scrollResultIntoView(node) {
  const scroller = node.closest(".product-view");
  const sticky = scroller?.querySelector(".section-navigation");
  if (!scroller) return;
  const target = scroller.scrollTop + node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (sticky?.offsetHeight ?? 0) - 16;
  scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

function rarityDetails(rarity) {
  const fragment = document.createDocumentFragment();
  const pathCount = rarity.independentPathCount ?? 1;
  fragment.append(
    element("strong", { text: t("profiles.constellation.rarityTitle") }),
    element("span", { text: `${familyRarityLabel(rarity.category)} — ${formatEstimatedFrequency(rarity.estimatedRandomFrequency, rarity.simulationCount)}` }),
    element("small", { text: t(pathCount === 1 ? "profiles.constellation.rarityPathCountOne" : "profiles.constellation.rarityPathCountMany", { count: pathCount }) }),
  );
  return fragment;
}

function createObservationCard(card) {
  const article = element("article", { className: "product-card family-observation-card", attributes: { "data-observation-id": card.id, "data-category": card.category, "data-participants": card.participantNames.join("|") } });
  article.append(
    element("p", { className: "family-interest", text: card.interestLabel }),
    element("h3", { text: card.title }),
    element("p", { className: "family-observation-card__people", text: card.participantNames.join(" ↔ ") }),
    element("p", { text: card.description }),
  );
  if (card.values.length) {
    const values = element("div", { className: "family-number-row", attributes: { "aria-label": `Valeurs : ${card.values.join(", ")}` } });
    card.values.forEach((value) => values.append(element("span", { text: String(value) })));
    article.append(values);
  }
  const details = element("details", { className: "family-calculations" });
  details.append(element("summary", { text: t("profiles.constellation.showCalculations") }));
  const list = element("ol");
  card.calculations.forEach((calculation) => list.append(element("li", { text: calculation })));
  details.append(list, element("p", { className: "method-note", text: t("profiles.constellation.calculationNote") }));
  article.append(details);
  const rarity = element("div", { className: "family-rarity family-rarity--pending", attributes: { "data-rarity-id": card.id } });
  rarity.append(element("strong", { text: t("profiles.constellation.rarityTitle") }), element("span", { text: t("profiles.constellation.rarityPending") }));
  article.append(rarity);
  return article;
}

function applyRarityToCards(host, statistics) {
  const byId = new Map(statistics.motifs.map((entry) => [entry.observationId, { ...entry, simulationCount: statistics.simulationCount }]));
  host.querySelectorAll("[data-rarity-id]").forEach((node) => {
    const rarity = byId.get(node.dataset.rarityId);
    if (!rarity) return void node.remove();
    node.classList.remove("family-rarity--pending");
    node.replaceChildren(rarityDetails(rarity));
  });
}

function createRarityPanel({ onDeepAnalysis }) {
  const section = element("section", { className: "product-card family-rarity-panel" });
  section.append(heading(t("profiles.constellation.rarityEyebrow"), t("profiles.constellation.rarityPanelTitle"), t("profiles.constellation.rarityPanelCopy")));
  const status = element("p", { className: "family-rarity-status", text: t("profiles.constellation.rarityStarting"), attributes: { role: "status" } });
  const progress = element("progress", { attributes: { max: "1", value: "0", "aria-label": t("profiles.constellation.rarityProgress") } });
  const result = element("div", { className: "family-rarity-global" });
  const method = element("details", { className: "family-rarity-method" });
  method.append(element("summary", { text: t("profiles.constellation.rarityHow") }), element("p", { text: t("profiles.constellation.rarityMethod") }), element("p", { className: "method-note", text: t("profiles.constellation.rarityLimits") }));
  const deep = element("button", { className: "product-button product-button--quiet", text: t("profiles.constellation.rarityDeep"), attributes: { type: "button", hidden: "" } });
  deep.addEventListener("click", () => onDeepAnalysis());
  section.append(status, progress, result, method, deep);
  return {
    section,
    updateProgress({ completed, total, ratio, cacheHit }) {
      progress.value = ratio;
      status.textContent = cacheHit ? t("profiles.constellation.rarityCache") : t("profiles.constellation.rarityRunning", { completed: new Intl.NumberFormat("fr-FR").format(completed), total: new Intl.NumberFormat("fr-FR").format(total) });
    },
    showResult(statistics) {
      progress.value = 1;
      status.textContent = t("profiles.constellation.rarityCompleted", { count: new Intl.NumberFormat("fr-FR").format(statistics.simulationCount) });
      result.replaceChildren(
        element("strong", { text: familyRarityLabel(statistics.global.category) }),
        element("span", { text: formatEstimatedFrequency(statistics.global.estimatedRandomFrequency, statistics.simulationCount) }),
        element("p", { text: t("profiles.constellation.rarityGlobalExplanation") }),
      );
      deep.hidden = statistics.simulationCount >= 20_000;
    },
    showError(message) {
      progress.remove();
      status.textContent = message;
      deep.hidden = false;
    },
    setBusy(busy) {
      deep.disabled = busy;
    },
  };
}

function renderConstellationMap(host, analysis, reading, profiles, onFilter) {
  const section = element("section", { className: "product-card family-map-card" });
  section.append(heading(t("profiles.constellation.mapEyebrow"), t("profiles.constellation.mapTitle"), t("profiles.constellation.mapCopy")));
  const map = element("div", { className: "family-star-map", attributes: { role: "group", "aria-label": t("profiles.constellation.mapAria") } });
  const selected = profiles.slice(0, 6);
  const positions = new Map();
  selected.forEach((profile, index) => {
    const angle = (Math.PI * 2 * index) / selected.length - Math.PI / 2;
    positions.set(profile.id, { x: 50 + Math.cos(angle) * 36, y: 50 + Math.sin(angle) * 36 });
  });
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.setAttribute("class", "family-star-lines");
  lines.setAttribute("viewBox", "0 0 100 100");
  lines.setAttribute("aria-hidden", "true");
  const displayObservations = analysis.clusteredObservations ?? analysis.selectedObservations;
  reading.primaryCards.slice(0, 5).forEach((card) => {
    const participants = displayObservations.find(({ id }) => id === card.id)?.participantIds.filter((id) => positions.has(id)).slice(0, 2) ?? [];
    if (participants.length !== 2) return;
    const start = positions.get(participants[0]);
    const end = positions.get(participants[1]);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(start.x));
    line.setAttribute("y1", String(start.y));
    line.setAttribute("x2", String(end.x));
    line.setAttribute("y2", String(end.y));
    lines.append(line);
  });
  map.append(lines);
  selected.forEach((profile) => {
    const position = positions.get(profile.id);
    const button = element("button", { className: "family-star-node", text: profile.firstName, attributes: { type: "button", "aria-label": t("profiles.constellation.filterPerson", { name: profile.firstName }) } });
    button.style.setProperty("--star-x", `${position.x}%`);
    button.style.setProperty("--star-y", `${position.y}%`);
    button.addEventListener("click", () => onFilter({ profileId: profile.id }));
    map.append(button);
  });
  map.append(element("span", { className: "family-star-map__center", text: "TAO" }));
  const links = element("div", { className: "family-map-links" });
  reading.primaryCards.slice(0, 5).forEach((card) => {
    const button = element("button", { attributes: { type: "button", "aria-label": `${card.title} : ${card.values.join(", ")}` } });
    button.append(element("strong", { text: card.values.join(" · ") || "✦" }), element("span", { text: `${card.participantNames.join(" ↔ ")} — ${card.title}` }));
    button.addEventListener("click", () => onFilter({ observationId: card.id }));
    links.append(button);
  });
  section.append(map, links);
  return section;
}

function renderSymbolicReading(host, reading) {
  const section = element("section", { className: "product-card family-symbolic" });
  section.append(heading(t("profiles.constellation.symbolicEyebrow"), t("profiles.constellation.symbolicTitle"), t("profiles.constellation.symbolicDisclaimer")));
  const values = [...new Set(reading.primaryCards.flatMap(({ values: cardValues }) => cardValues))];
  const documented = values.filter((value) => SYMBOLS[value]);
  if (!documented.length) section.append(element("p", { text: t("profiles.constellation.noSymbolicMeaning") }));
  documented.forEach((value) => {
    const item = element("article");
    item.append(element("strong", { text: String(value) }), element("p", { text: SYMBOLS[value] }));
    section.append(item);
  });
  host.append(section);
}

function eventManager({ profiles, events, onChange }) {
  const section = element("section", { className: "product-card family-events" });
  section.append(heading(t("profiles.constellation.eventsEyebrow"), t("profiles.constellation.eventsTitle"), t("profiles.constellation.eventsCopy")));
  const formDetails = element("details", { className: "family-event-editor" });
  formDetails.append(element("summary", { text: t("profiles.constellation.addEvent") }));
  const form = element("form", { className: "family-event-form" });
  const titleField = element("label");
  titleField.append(element("span", { text: t("profiles.constellation.eventTitle") }), element("input", { attributes: { name: "title", required: "", maxlength: "100" } }));
  const dateField = element("label");
  dateField.append(element("span", { text: t("profiles.constellation.eventDate") }), element("input", { attributes: { name: "date", type: "date", required: "" } }));
  const timeField = element("label");
  timeField.append(element("span", { text: t("profiles.constellation.eventTime") }), element("input", { attributes: { name: "time", type: "time" } }));
  const typeField = element("label");
  const typeSelect = element("select", { attributes: { name: "type" } });
  FAMILY_EVENT_TYPES.forEach((type) => typeSelect.append(element("option", { text: t(`profiles.constellation.eventTypes.${type}`), attributes: { value: type } })));
  typeField.append(element("span", { text: t("profiles.constellation.eventType") }), typeSelect);
  const people = element("fieldset", { className: "family-event-people" });
  people.append(element("legend", { text: t("profiles.constellation.concernedPeople") }));
  profiles.forEach((profile) => {
    const label = element("label");
    label.append(element("input", { attributes: { type: "checkbox", name: "profileIds", value: profile.id } }), element("span", { text: profile.firstName }));
    people.append(label);
  });
  const error = element("p", { className: "form-error", attributes: { role: "alert" } });
  form.append(titleField, dateField, timeField, typeField, people, error, element("button", { className: "product-button product-button--primary", text: t("profiles.constellation.saveEvent"), attributes: { type: "submit" } }));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const profileIds = data.getAll("profileIds").map(String);
    if (!profileIds.length) return void (error.textContent = t("profiles.constellation.eventPersonError"));
    try {
      saveFamilyEvent({ id: createFamilyEventId(), title: String(data.get("title") ?? "").trim(), date: String(data.get("date") ?? ""), time: String(data.get("time") ?? "") || null, type: String(data.get("type") ?? "other"), profileIds });
      onChange();
    } catch (caught) {
      error.textContent = caught.message;
    }
  });
  formDetails.append(form);
  section.append(formDetails);
  const list = element("div", { className: "family-event-list" });
  if (!events.length) list.append(element("p", { className: "empty-state", text: t("profiles.constellation.noEvents") }));
  events.forEach((event) => {
    const card = element("article");
    const names = event.profileIds.map((id) => profiles.find((profile) => profile.id === id)?.firstName).filter(Boolean);
    const eventText = element("div");
    eventText.append(
      element("strong", { text: event.title }),
      element("span", { text: `${formatBirthDate(event.date)}${event.time ? ` · ${event.time}` : ""}` }),
      element("small", { text: names.join(" · ") }),
    );
    card.append(eventText);
    const remove = element("button", { className: "product-button product-button--quiet product-button--danger", text: t("profiles.constellation.deleteEvent"), attributes: { type: "button" } });
    remove.addEventListener("click", () => {
      if (window.confirm(t("profiles.constellation.deleteEventConfirm", { title: event.title }))) { deleteFamilyEvent(event.id); onChange(); }
    });
    card.append(remove);
    list.append(card);
  });
  section.append(list);
  return section;
}

function debugPanel(analysis, selectedProfiles, roles) {
  if (new URLSearchParams(location.search).get("debug") !== "family-constellation") return null;
  const details = element("details", { className: "product-card family-debug", attributes: { open: "" } });
  details.append(element("summary", { text: "TAO FAMILY CONSTELLATION DEBUG" }));
  details.append(element("pre", { text: JSON.stringify({ profiles: selectedProfiles.map(({ id, firstName }) => ({ id, firstName, role: roles[id] })), derivedValues: analysis.signatures, intervals: analysis.intervals, numericGraph: analysis.numericGraph, candidateObservations: analysis.candidates, discardedObservations: analysis.discardedObservations, clusters: analysis.clusters, deepPatterns: analysis.discoveredPatterns, density: analysis.density, interestScores: analysis.displayObservations.map(({ id, interestScore, independentPathCount, sourceDiversity }) => ({ id, interestScore, independentPathCount, sourceDiversity })), selectedObservationIds: analysis.displayObservations.map(({ id }) => id), aiObservationIds: analysis.displayObservations.slice(0, 16).map(({ id }) => id) }, null, 2) }));
  return details;
}

export function createFamilyConstellationModule({ profiles, onAddProfile }) {
  const root = element("div", { className: "family-constellation-module" });
  const render = () => {
    const events = getFamilyEvents();
    const preferences = getFamilyConstellationPreferences();
    const defaultIds = profiles.filter(({ relationship }) => ["self", "family", "partner", "child", "parent"].includes(relationship)).map(({ id }) => id);
    const selectedIds = new Set((preferences.selectedProfileIds.length ? preferences.selectedProfileIds : defaultIds.length >= 2 ? defaultIds : profiles.slice(0, 4).map(({ id }) => id)).filter((id) => profiles.some((profile) => profile.id === id)));
    const roles = Object.fromEntries(profiles.map((profile) => [profile.id, preferences.roles[profile.id] ?? defaultRole(profile)]));
    root.replaceChildren();

    const intro = element("section", { className: "product-card family-intro" });
    intro.append(heading(t("profiles.constellation.eyebrow"), t("profiles.constellation.title"), t("profiles.constellation.copy")), element("p", { className: "method-note", text: t("profiles.constellation.disclaimer") }));
    if (profiles.length < 2) {
      intro.append(element("p", { text: t("profiles.constellation.needTwo") }));
      const add = element("button", { className: "product-button product-button--primary", text: t("profiles.actions.addPerson"), attributes: { type: "button" } });
      add.addEventListener("click", onAddProfile);
      intro.append(add);
      root.append(intro);
      return;
    }

    const selection = element("form", { className: "family-selection" });
    selection.append(element("h3", { text: t("profiles.constellation.choosePeople") }), element("p", { text: t("profiles.constellation.choosePeopleCopy") }));
    const selectionList = element("div", { className: "family-selection-list" });
    profiles.forEach((profile) => {
      const row = element("div", { className: "family-person-row" });
      const selectLabel = element("label", { className: "family-person-toggle" });
      const checkbox = element("input", { attributes: { type: "checkbox", value: profile.id, "aria-label": t("profiles.constellation.includePerson", { name: profile.firstName }) } });
      checkbox.checked = selectedIds.has(profile.id);
      selectLabel.append(checkbox, element("span", { text: profile.firstName }), element("small", { text: formatBirthDate(profile.birthDate) }));
      const roleSelect = element("select", { attributes: { "aria-label": t("profiles.constellation.roleOf", { name: profile.firstName }) } });
      FAMILY_ROLES.forEach((role) => roleSelect.append(element("option", { text: t(`profiles.constellation.roles.${role}`), attributes: { value: role } })));
      roleSelect.value = roles[profile.id];
      checkbox.addEventListener("change", () => {
        roleSelect.disabled = !checkbox.checked;
      });
      roleSelect.disabled = !checkbox.checked;
      row.append(selectLabel, roleSelect);
      selectionList.append(row);
    });
    const symbolic = element("label", { className: "family-symbolic-toggle" });
    const symbolicInput = element("input", { attributes: { type: "checkbox" } });
    symbolicInput.checked = preferences.symbolicReading;
    symbolic.append(symbolicInput, element("span", { text: t("profiles.constellation.symbolicChoice") }));
    const error = element("p", { className: "form-error", attributes: { role: "alert" } });
    const analyze = element("button", { className: "product-button product-button--primary", text: t("profiles.constellation.analyze"), attributes: { type: "submit" } });
    selection.append(selectionList, symbolic, error, analyze);
    intro.append(selection);
    root.append(intro);

    const resultHost = element("div", { className: "family-results", attributes: { "aria-live": "polite" } });
    selection.addEventListener("submit", (event) => {
      event.preventDefault();
      const checked = [...selectionList.querySelectorAll('input[type="checkbox"]:checked')].map(({ value }) => value);
      if (checked.length < 2) return void (error.textContent = t("profiles.constellation.needTwoSelected"));
      const selectedProfiles = checked.map((id) => profiles.find((profile) => profile.id === id));
      const selectedRoles = Object.fromEntries(checked.map((id) => [id, selectionList.querySelector(`input[value="${CSS.escape(id)}"]`).closest(".family-person-row").querySelector("select").value]));
      saveFamilyConstellationPreferences({ selectedProfileIds: checked, roles: selectedRoles, symbolicReading: symbolicInput.checked });
      const selectedEvents = events.filter(({ profileIds }) => profileIds.some((id) => checked.includes(id)));
      const rarityInput = { profiles: selectedProfiles, events: selectedEvents, roles: selectedRoles };
      const analysis = analyzeFamilyConstellation(rarityInput);
      const reading = buildFamilyConstellationReading({ analysis, profiles: selectedProfiles, events: selectedEvents });
      let latestRarity = null;
      let rarityRunId = 0;
      resultHost.replaceChildren();
      const hero = element("section", { className: "product-card family-result-hero" });
      hero.append(element("p", { className: "product-eyebrow", text: t("profiles.constellation.yourConstellation") }), element("h2", { text: reading.headline }), element("p", { text: reading.disclaimer }));
      const primary = element("div", { className: "family-primary-grid" });
      reading.primaryCards.forEach((card) => primary.append(createObservationCard(card)));
      hero.append(primary);
      if (reading.cards.length > reading.primaryCards.length) hero.append(element("a", { className: "product-button product-button--quiet", text: t("profiles.constellation.seeAll"), attributes: { href: "#family-all-observations" } }));
      resultHost.append(hero);

      const rarityPanel = createRarityPanel({ onDeepAnalysis: () => runRarity(20_000) });
      resultHost.append(rarityPanel.section);

      async function runRarity(simulationCount) {
        const runId = ++rarityRunId;
        rarityPanel.setBusy(true);
        try {
          const statistics = await requestFamilyRarity(rarityInput, {
            simulationCount,
            onProgress(progress) { if (runId === rarityRunId) rarityPanel.updateProgress(progress); },
          });
          if (runId !== rarityRunId || !resultHost.isConnected) return;
          latestRarity = statistics;
          rarityPanel.showResult(statistics);
          applyRarityToCards(resultHost, statistics);
        } catch (caught) {
          if (runId === rarityRunId) rarityPanel.showError(caught instanceof Error ? caught.message : t("profiles.constellation.rarityUnavailable"));
        } finally {
          if (runId === rarityRunId) rarityPanel.setBusy(false);
        }
      }

      const all = element("section", { className: "product-card family-all", attributes: { id: "family-all-observations" } });
      all.append(heading(t("profiles.constellation.correspondencesEyebrow"), t("profiles.constellation.correspondencesTitle"), t("profiles.constellation.correspondencesCopy")));
      const filters = element("div", { className: "family-filter-row", attributes: { role: "group", "aria-label": t("profiles.constellation.filters") } });
      const cardsHost = element("div", { className: "family-observation-list" });
      const renderCards = (cards) => { cardsHost.replaceChildren(); cards.forEach((card) => cardsHost.append(createObservationCard(card))); if (!cards.length) cardsHost.append(element("p", { className: "empty-state", text: t("profiles.constellation.noCategoryResults") })); };
      const allButton = element("button", { className: "is-active", text: t("profiles.constellation.all"), attributes: { type: "button", "aria-pressed": "true" } });
      allButton.addEventListener("click", () => { filters.querySelectorAll("button").forEach((button) => { button.classList.toggle("is-active", button === allButton); button.setAttribute("aria-pressed", String(button === allButton)); }); renderCards(reading.cards); });
      filters.append(allButton);
      CATEGORY_ORDER.filter((category) => reading.cards.some((card) => card.category === category)).forEach((category) => {
        const button = element("button", { text: reading.categoryLabels[category], attributes: { type: "button", "aria-pressed": "false" } });
        button.addEventListener("click", () => { filters.querySelectorAll("button").forEach((item) => { item.classList.toggle("is-active", item === button); item.setAttribute("aria-pressed", String(item === button)); }); renderCards(reading.cards.filter((card) => card.category === category)); });
        filters.append(button);
      });
      renderCards(reading.cards);
      all.append(filters, cardsHost);
      resultHost.append(all);

      const displayObservations = analysis.displayObservations ?? analysis.clusteredObservations ?? analysis.selectedObservations;
      const filterReading = ({ profileId, observationId }) => {
        const cards = observationId ? reading.cards.filter(({ id }) => id === observationId) : reading.cards.filter((card) => displayObservations.find(({ id }) => id === card.id)?.participantIds.includes(profileId));
        renderCards(cards);
        all.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      resultHost.append(renderConstellationMap(resultHost, analysis, reading, selectedProfiles, filterReading));

      const pair = element("section", { className: "product-card family-pair-view" });
      pair.append(heading(t("profiles.constellation.pairEyebrow"), t("profiles.constellation.pairTitle"), t("profiles.constellation.pairCopy")));
      const pairControls = element("div");
      const left = element("select", { attributes: { "aria-label": t("profiles.constellation.pairFirst") } });
      const right = element("select", { attributes: { "aria-label": t("profiles.constellation.pairSecond") } });
      selectedProfiles.forEach((profile, index) => { left.append(element("option", { text: profile.firstName, attributes: { value: profile.id } })); right.append(element("option", { text: profile.firstName, attributes: { value: profile.id } })); if (index === 1) right.value = profile.id; });
      const showPair = element("button", { className: "product-button product-button--quiet", text: t("profiles.constellation.showPair"), attributes: { type: "button" } });
      const pairResults = element("div", { className: "family-pair-results" });
      showPair.addEventListener("click", () => { const cards = reading.cards.filter((card) => { const item = displayObservations.find(({ id }) => id === card.id); return item?.participantIds.includes(left.value) && item?.participantIds.includes(right.value); }); pairResults.replaceChildren(); cards.forEach((card) => pairResults.append(createObservationCard(card))); if (!cards.length) pairResults.append(element("p", { className: "empty-state", text: t("profiles.constellation.noPairResults") })); });
      pairControls.append(left, right, showPair);
      pair.append(pairControls, pairResults);
      resultHost.append(pair);

      const numberView = element("section", { className: "product-card family-number-view" });
      numberView.append(heading(t("profiles.constellation.numberEyebrow"), t("profiles.constellation.numberTitle"), t("profiles.constellation.numberCopy")));
      const numberButtons = element("div", { className: "family-number-buttons" });
      const numberResults = element("div", { className: "family-number-results" });
      [...new Set(reading.cards.flatMap(({ values }) => values))].sort((a, b) => a - b).slice(0, 18).forEach((value) => { const button = element("button", { text: String(value), attributes: { type: "button", "aria-label": t("profiles.constellation.showNumber", { value }) } }); button.addEventListener("click", () => { const cards = reading.cards.filter(({ values }) => values.includes(value)); numberResults.replaceChildren(element("h3", { text: t("profiles.constellation.numberInFamily", { value }) })); cards.forEach((card) => numberResults.append(createObservationCard(card))); }); numberButtons.append(button); });
      numberView.append(numberButtons, numberResults);
      resultHost.append(numberView);

      const synthesis = element("section", { className: "product-card family-synthesis" });
      synthesis.append(heading(t("profiles.constellation.taoNoticesEyebrow"), t("profiles.constellation.taoNoticesTitle")), element("p", { text: reading.synthesis }));
      const talk = element("button", { className: "product-button product-button--primary", text: t("profiles.constellation.talk"), attributes: { type: "button" } });
      talk.addEventListener("click", () => {
        const detail = {
          mode: "family_constellation",
          prompt: t("profiles.constellation.aiPrompt"),
          contextOptions: {
            facts: familyObservationFacts(analysis),
            familyConstellation: {
              familyMembers: selectedProfiles.map((profile) => ({ id: profile.id, displayName: profile.firstName, relationship: selectedRoles[profile.id] })),
              observations: displayObservations.map(({ id, type, interest, participantIds, values, independentPathCount, sourceDiversity }) => ({ id, type, interest, participantIds, values, independentPathCount: independentPathCount ?? 1, sourceDiversity: sourceDiversity ?? 1 })),
              statistics: latestRarity ? {
                estimatedRandomFrequency: latestRarity.global.estimatedRandomFrequency,
                simulationCount: latestRarity.simulationCount,
                model: latestRarity.model,
                constellationDensity: latestRarity.global.constellationDensity,
                motifs: latestRarity.motifs.slice(0, 16).map(({ observationId, estimatedRandomFrequency, category }) => ({ observationId, estimatedRandomFrequency, category })),
              } : null,
            },
          },
        };
        window.dispatchEvent(new CustomEvent("tao:ai-open", { detail }));
      });
      synthesis.append(talk);
      resultHost.append(synthesis);
      if (symbolicInput.checked) renderSymbolicReading(resultHost, reading);
      const debug = debugPanel(analysis, selectedProfiles, selectedRoles); if (debug) resultHost.append(debug);
      scrollResultIntoView(resultHost);
      void runRarity(2_000);
    });

    root.append(resultHost, eventManager({ profiles, events, onChange: render }));
  };
  render();
  return root;
}
