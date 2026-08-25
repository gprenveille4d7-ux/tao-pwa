import { analyzeFamilyConstellation } from "./family-number-engine.mjs?v=3.1.0";
import {
  buildFamilyConstellationReading,
  familyObservationFacts,
} from "./family-constellation-semantic.mjs?v=4.0.0";
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
import { humanizeFamilyCalculation } from "./family-constellation-lexicon.mjs?v=1.0.0";
import { createTaoCarousel, createTaoNavigationRow, createTaoSegmentedControl, openTaoSheet } from "./tao-components.js?v=navigation-2";

const IMPORTANCE_ORDER = ["major", "notable", "curiosity"];
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

function openCalculationSheet(card, opener) {
  const body = element("div", { className: "family-calculation-detail" });
  body.append(element("p", { className: "method-note", text: card.description }));
  if (card.occurrences.length) {
    body.append(element("h3", { text: "Où apparaît-il ?" }));
    const occurrences = element("ul", { className: "family-occurrence-list" });
    card.occurrences.forEach((occurrence) => occurrences.append(element("li", { text: `${occurrence.personName} · ${occurrence.sourceLabel}${occurrence.rawValue ? ` · ${["birthDay", "birthMonth"].includes(occurrence.sourceType) ? formatBirthDate(occurrence.rawValue) : occurrence.rawValue}` : ""} → ${occurrence.sourceValue}` })));
    body.append(occurrences);
  }
  if (card.relatedFeatures.length) {
    body.append(element("h3", { text: "Particularités liées" }));
    const related = element("ul", { className: "family-related-list" });
    card.relatedFeatures.forEach((feature) => related.append(element("li", { text: (feature.calculations ?? []).slice(0, 1).map(humanizeFamilyCalculation).join("") || "Une relation simple renforce ce motif." })));
    body.append(related);
  }
  body.append(element("h3", { text: "Calculs vérifiables" }));
  const list = element("ol");
  card.calculations.forEach((calculation) => list.append(element("li", { text: humanizeFamilyCalculation(calculation) })));
  body.append(
    list,
    element("p", { className: "family-calculation-sheet__independence", text: card.independentPathCount > 1 ? `${card.independentPathCount} chemins indépendants · ${card.sourceDiversity} catégories de données.` : "Une source indépendante retenue." }),
    element("p", { className: "method-note", text: t("profiles.constellation.calculationNote") }),
  );
  openTaoSheet({ title: card.title, label: "Détail de l’observation", content: body, opener });
}

function createObservationCard(card) {
  const article = element("article", { className: "product-card family-observation-card family-pattern-card", attributes: { "data-pattern-id": card.canonicalPatternId, "data-importance": card.importance, "data-category": card.category, "data-participants": card.participantIds.join("|") } });
  article.append(
    element("p", { className: "family-interest", text: `${card.importanceLabel} · ${card.categoryLabel}` }),
    element("h3", { text: card.title }),
    element("p", { className: "family-observation-card__people", text: `${card.personCount} personne${card.personCount > 1 ? "s" : ""} · ${card.generationCount} génération${card.generationCount > 1 ? "s" : ""} · ${card.occurrenceCount} occurrence${card.occurrenceCount > 1 ? "s" : ""}` }),
    element("p", { text: card.description }),
  );
  if (card.values.length) {
    const values = element("div", { className: "family-number-row", attributes: { "aria-label": `Valeurs : ${card.values.join(", ")}` } });
    card.values.forEach((value) => values.append(element("span", { text: String(value) })));
    article.append(values);
  }
  if (card.relatedFeatureCount) article.append(element("p", { className: "family-force", text: `${card.relatedFeatureCount} particularité${card.relatedFeatureCount > 1 ? "s" : ""} liée${card.relatedFeatureCount > 1 ? "s" : ""}` }));
  const calculations = element("button", { className: "family-calculation-open", text: "Voir le détail", attributes: { type: "button", "aria-haspopup": "dialog" } });
  calculations.addEventListener("click", () => openCalculationSheet(card, calculations));
  article.append(calculations);
  return article;
}

function renderChronology(profiles, events) {
  const section = element("section", { className: "product-card family-chronology" });
  section.append(heading("Chronologie", "Les dates qui structurent la famille", "Naissances et événements saisis volontairement, dans leur ordre réel."));
  const entries = [
    ...profiles.map((profile) => ({ date: profile.birthDate, title: `Naissance de ${profile.firstName}`, meta: profile.birthPlace?.city ? `${profile.birthPlace.city}${profile.birthPlace.country ? `, ${profile.birthPlace.country}` : ""}` : "Lieu non renseigné" })),
    ...events.map((event) => ({ date: event.date, title: event.title, meta: `${t(`profiles.constellation.eventTypes.${event.type}`)}${event.place ? ` · ${typeof event.place === "string" ? event.place : event.place.label}` : ""}` })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const list = element("ol", { className: "family-timeline" });
  entries.forEach((entry) => { const item = element("li"); item.append(element("time", { text: formatBirthDate(entry.date), attributes: { datetime: entry.date } }), element("strong", { text: entry.title }), element("span", { text: entry.meta })); list.append(item); });
  section.append(list);
  return section;
}

function installFamilyViews(host) {
  const views = Object.freeze([
    ["summary", "Synthèse", ["family-result-hero", "family-primary-carousel", "family-synthesis"]],
    ["family", "Famille", ["family-map-card", "family-pair-view"]],
    ["chronology", "Chronologie", ["family-chronology"]],
    ["explore", "Explorer", ["family-all", "family-number-view", "family-symbolic", "family-debug"]],
  ]);
  const sections = [...host.children];
  for (const [viewId, , classNames] of views) for (const section of sections) if (classNames.some((name) => section.classList.contains(name))) section.dataset.familyView = viewId;
  sections.forEach((section) => { if (section.dataset.familyView && section.dataset.familyView !== "summary") section.hidden = true; });
  const nav = createTaoSegmentedControl({
    items: views.map(([id, label]) => ({ id, label })),
    selectedId: "summary",
    label: "Vues de la constellation",
    onChange: (viewId) => sections.forEach((section) => { if (section.dataset.familyView) section.hidden = section.dataset.familyView !== viewId; }),
  });
  nav.classList.add("family-view-tabs");
  host.insertBefore(nav, host.children[1] ?? null);
}

function renderConstellationMap(host, analysis, reading, profiles, onFilter) {
  const section = element("section", { className: "product-card family-map-card" });
  section.append(heading(t("profiles.constellation.mapEyebrow"), t("profiles.constellation.mapTitle"), t("profiles.constellation.mapCopy")));
  const map = element("div", { className: "family-star-map", attributes: { role: "group", "aria-label": t("profiles.constellation.mapAria") } });
  const selected = profiles.slice(0, 12);
  const positions = new Map();
  selected.forEach((profile, index) => {
    const angle = (Math.PI * 2 * index) / selected.length - Math.PI / 2;
    positions.set(profile.id, { x: 50 + Math.cos(angle) * 36, y: 50 + Math.sin(angle) * 36 });
  });
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.setAttribute("class", "family-star-lines");
  lines.setAttribute("viewBox", "0 0 100 100");
  lines.setAttribute("aria-hidden", "true");
  reading.primaryCards.slice(0, 5).forEach((card) => {
    const participants = card.participantIds.filter((id) => positions.has(id)).slice(0, 2);
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
  const placeField = element("label");
  placeField.append(element("span", { text: "Lieu facultatif" }), element("input", { attributes: { name: "place", maxlength: "120", autocomplete: "off" } }));
  const noteField = element("label");
  noteField.append(element("span", { text: "Note facultative" }), element("textarea", { attributes: { name: "note", maxlength: "500", rows: "3" } }));
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
  form.append(titleField, dateField, timeField, placeField, noteField, typeField, people, error, element("button", { className: "product-button product-button--primary", text: t("profiles.constellation.saveEvent"), attributes: { type: "submit" } }));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const profileIds = data.getAll("profileIds").map(String);
    if (!profileIds.length) return void (error.textContent = t("profiles.constellation.eventPersonError"));
    try {
      saveFamilyEvent({ id: createFamilyEventId(), title: String(data.get("title") ?? "").trim(), date: String(data.get("date") ?? ""), time: String(data.get("time") ?? "") || null, place: String(data.get("place") ?? "").trim() || null, note: String(data.get("note") ?? "").trim() || null, type: String(data.get("type") ?? "other"), profileIds });
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
      element("span", { text: `${formatBirthDate(event.date)}${event.time ? ` · ${event.time}` : ""}${event.place ? ` · ${typeof event.place === "string" ? event.place : event.place.label}` : ""}` }),
      ...(event.note ? [element("p", { text: event.note })] : []),
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
  if (!["family-constellation", "family"].includes(new URLSearchParams(location.search).get("debug"))) return null;
  const details = element("details", { className: "product-card family-debug", attributes: { open: "" } });
  details.append(element("summary", { text: "TAO FAMILY CONSTELLATION DEBUG" }));
  details.append(element("pre", { text: JSON.stringify({ profiles: selectedProfiles.map(({ id, firstName }) => ({ id, firstName, role: roles[id] })), rawFacts: selectedProfiles.map(({ id, birthDate, birthTime, birthPlace }) => ({ id, birthDate, birthTime, birthPlace })), derivedFacts: analysis.deepAnalysis.extendedSignatures, canonicalInventory: analysis.patternInventory.patterns.map(({ canonicalPatternId, importance, occurrenceCount, personCount, generationCount, observationIds, dependencyGroupIds }) => ({ canonicalPatternId, importance, occurrenceCount, personCount, generationCount, observationIds, dependencyGroupIds })), inventorySummary: analysis.patternInventory.importance, intervals: analysis.intervals, candidatePatterns: analysis.candidates, rejectedPatterns: analysis.discardedObservations, rawObservationCount: analysis.displayObservations.length, canonicalPatternCount: analysis.patternInventory.total, aiPatternIds: analysis.patternInventory.patterns.slice(0, 16).map(({ canonicalPatternId }) => canonicalPatternId) }, null, 2) }));
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

    const intro = element("section", { className: "surface-main family-intro" });
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
      const analysisInput = { profiles: selectedProfiles, events: selectedEvents, roles: selectedRoles };
      const analysis = analyzeFamilyConstellation(analysisInput);
      const reading = buildFamilyConstellationReading({ analysis, profiles: selectedProfiles, events: selectedEvents });
      resultHost.replaceChildren();
      const hero = element("section", { className: "surface-main family-result-hero" });
      hero.append(
        element("p", { className: "product-eyebrow", text: t("profiles.constellation.yourConstellation") }),
        element("h2", { text: reading.headline }),
        element("p", { className: "family-overview", text: reading.overview }),
        element("p", { className: "method-note", text: reading.disclaimer }),
      );
      hero.append(createTaoNavigationRow({
        title: "Voir tous les motifs",
        description: "Ouvrir l’inventaire complet de cette constellation",
        onClick: () => {
          resultHost.querySelector('[data-segment-id="explore"]')?.click();
          requestAnimationFrame(() => all.scrollIntoView({ behavior: "smooth", block: "start" }));
        },
      }));
      resultHost.append(hero);

      const primary = element("section", { className: "family-primary-carousel" });
      primary.append(createTaoCarousel({ cards: reading.primaryCards.slice(0, 5).map(createObservationCard), label: "Observations principales de la constellation" }));
      resultHost.append(primary);

      const all = element("section", { className: "product-card family-all", attributes: { id: "family-all-observations" } });
      all.append(heading("Inventaire", "Les motifs de la constellation", "Une idée n’apparaît qu’une seule fois. Ses occurrences et ses particularités sont réunies dans sa fiche."));
      const filters = element("div", { className: "family-filter-row", attributes: { role: "group", "aria-label": "Importance des motifs" } });
      const cardsHost = element("div", { className: "family-observation-list" });
      const renderCards = (cards) => {
        cardsHost.replaceChildren();
        for (const importance of IMPORTANCE_ORDER) {
          const group = cards.filter((card) => card.importance === importance);
          if (!group.length) continue;
          cardsHost.append(element("h3", { className: "family-inventory-heading", text: reading.importanceLabels[importance] }));
          group.forEach((card) => cardsHost.append(createObservationCard(card)));
        }
        if (!cards.length) cardsHost.append(element("p", { className: "empty-state", text: t("profiles.constellation.noCategoryResults") }));
      };
      const allButton = element("button", { className: "is-active", text: t("profiles.constellation.all"), attributes: { type: "button", "aria-pressed": "true" } });
      allButton.addEventListener("click", () => { filters.querySelectorAll("button").forEach((button) => { button.classList.toggle("is-active", button === allButton); button.setAttribute("aria-pressed", String(button === allButton)); }); renderCards(reading.cards); });
      filters.append(allButton);
      IMPORTANCE_ORDER.filter((importance) => reading.inventory[importance].length).forEach((importance) => {
        const button = element("button", { text: reading.importanceLabels[importance], attributes: { type: "button", "aria-pressed": "false" } });
        button.addEventListener("click", () => { filters.querySelectorAll("button").forEach((item) => { item.classList.toggle("is-active", item === button); item.setAttribute("aria-pressed", String(item === button)); }); renderCards(reading.inventory[importance]); });
        filters.append(button);
      });
      renderCards(reading.cards);
      all.append(filters, cardsHost);
      resultHost.append(all);

      const filterReading = ({ profileId, observationId }) => {
        const cards = observationId ? reading.cards.filter(({ id }) => id === observationId) : reading.cards.filter((card) => card.participantIds.includes(profileId));
        renderCards(cards);
        all.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      const synthesis = element("section", { className: "product-card family-synthesis" });
      synthesis.append(heading(t("profiles.constellation.taoNoticesEyebrow"), t("profiles.constellation.taoNoticesTitle")), element("p", { text: reading.synthesis }));
      const talk = element("button", { className: "product-button product-button--primary", text: t("profiles.constellation.talk"), attributes: { type: "button" } });
      talk.addEventListener("click", () => {
        const facts = familyObservationFacts(analysis);
        window.dispatchEvent(new CustomEvent("tao:ai-open", { detail: {
          mode: "family_constellation",
          prompt: t("profiles.constellation.aiPrompt"),
          contextOptions: {
            facts,
            familyConstellation: {
              familyMembers: selectedProfiles.map((profile) => ({ id: profile.id, displayName: profile.firstName, relationship: selectedRoles[profile.id] })),
              observations: facts.map(({ id, canonicalPatternId, type, importance, value, occurrenceCount, generationCount, participantIds, occurrences, relatedFeatureIds, evidenceIds }) => ({ id, canonicalPatternId, type, importance, values: value ? value.split("/").map(Number).filter(Number.isFinite) : [], occurrenceCount, generationCount, participantIds, occurrences, relatedFeatureIds, evidenceIds })),
              statistics: null,
            },
          },
        } }));
      });
      synthesis.append(talk);
      resultHost.append(synthesis);
      resultHost.append(renderConstellationMap(resultHost, analysis, reading, selectedProfiles, filterReading));

      const pair = element("section", { className: "product-card family-pair-view" });
      pair.append(heading(t("profiles.constellation.pairEyebrow"), t("profiles.constellation.pairTitle"), t("profiles.constellation.pairCopy")));
      const pairControls = element("div");
      const left = element("select", { attributes: { "aria-label": t("profiles.constellation.pairFirst") } });
      const right = element("select", { attributes: { "aria-label": t("profiles.constellation.pairSecond") } });
      selectedProfiles.forEach((profile, index) => { left.append(element("option", { text: profile.firstName, attributes: { value: profile.id } })); right.append(element("option", { text: profile.firstName, attributes: { value: profile.id } })); if (index === 1) right.value = profile.id; });
      const showPair = element("button", { className: "product-button product-button--quiet", text: t("profiles.constellation.showPair"), attributes: { type: "button" } });
      const pairResults = element("div", { className: "family-pair-results" });
      showPair.addEventListener("click", () => { const cards = reading.cards.filter((card) => card.participantIds.includes(left.value) && card.participantIds.includes(right.value)); pairResults.replaceChildren(); cards.forEach((card) => pairResults.append(createObservationCard(card))); if (!cards.length) pairResults.append(element("p", { className: "empty-state", text: t("profiles.constellation.noPairResults") })); });
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

      resultHost.append(renderChronology(selectedProfiles, selectedEvents));
      if (symbolicInput.checked) renderSymbolicReading(resultHost, reading);
      const debug = debugPanel(analysis, selectedProfiles, selectedRoles); if (debug) resultHost.append(debug);
      installFamilyViews(resultHost);
      scrollResultIntoView(resultHost);
    });

    root.append(resultHost, eventManager({ profiles, events, onChange: render }));
  };
  render();
  return root;
}
