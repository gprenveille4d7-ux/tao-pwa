import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateBazi } from "./bazi-engine.mjs";
import {
  compareBaziProfiles,
  RELATIONSHIP_GOALS,
  RELATIONSHIP_TYPES,
} from "./relationship-engine.mjs?v=1.1.0";
import { buildRelationshipSemanticReading } from "./relationship-semantic.mjs?v=1.1.0";
import { getCachedRelationshipReading, setCachedRelationshipReading } from "./relationship-cache.mjs?v=1.0.0";
import { t } from "./locales/index.js?v=1.5.1";
import { element } from "./tao-ui.js";
import { createTaoCarousel, createTaoHero, openTaoSheet } from "./tao-components.js?v=1.0.0";

function option(value, text, selected = false) {
  const node = element("option", { text, attributes: { value } });
  node.selected = selected;
  return node;
}

function selectField({ id, label, values, selectedValue, labelFor }) {
  const group = element("div", { className: "product-field" });
  const select = element("select", { attributes: { id, name: id } });
  values.forEach((value) => select.append(option(value, labelFor(value), value === selectedValue)));
  group.append(element("label", { text: label, attributes: { for: id } }), select);
  return { group, select };
}

function profileField({ id, label, profiles, selectedId }) {
  return selectField({
    id,
    label,
    values: profiles.map(({ id: profileId }) => profileId),
    selectedValue: selectedId,
    labelFor: (profileId) => profiles.find(({ id: idToFind }) => idToFind === profileId)?.firstName ?? profileId,
  });
}

function heading(eyebrow, title, copy) {
  const header = element("header", { className: "product-section__header" });
  header.append(element("p", { className: "product-eyebrow", text: eyebrow }), element("h2", { text: title }));
  if (copy) header.append(element("p", { text: copy }));
  return header;
}

function listCard(title, values, className = "relationship-reading-card") {
  const card = element("section", { className: `surface-main ${className}` });
  card.append(element("h3", { text: title }));
  const list = element("ul", { className: "relationship-reading-list" });
  values.forEach((value) => list.append(element("li", { text: value })));
  card.append(list);
  return card;
}

function renderReading(host, comparison, reading, profiles) {
  host.replaceChildren();
  const hero = createTaoHero({ eyebrow: t("profiles.relations.readingEyebrow"), title: reading.title, lead: reading.summary, context: `${reading.contextLabel} · ${reading.goalQuestion}` });

  const axes = element("section", { className: "product-card relationship-axes" });
  axes.append(heading(t("profiles.relations.axesEyebrow"), t("profiles.relations.axesTitle"), reading.axisDisclaimer));
  const axisList = element("dl", { className: "relationship-axis-list" });
  reading.axes.forEach(({ label, levelLabel }) => {
    const row = element("div");
    row.append(element("dt", { text: label }), element("dd", { text: levelLabel }));
    axisList.append(row);
  });
  axes.append(axisList);

  const cardTitles = ["Ce qui vous rapproche", "Ce qui demande de l’ajustement", "Comment avancer ensemble"];
  const cards = cardTitles.map((title, index) => listCard(title, (reading.sections[index]?.values ?? reading.sections.flatMap(({ values }) => values).slice(index * 3, index * 3 + 3)).slice(0, 4)));
  const carousel = createTaoCarousel({ cards, label: "Lecture de la relation" });

  const details = element("div", { className: "relationship-technical product-depth-stack" });
  const priorityList = element("ul", { className: "relationship-reading-list relationship-priority-list" });
  reading.priorityFacts.forEach(({ label, reason }) => priorityList.append(element("li", { text: `${label} — ${reason}` })));
  const technicalList = element("ul", { className: "relationship-reading-list" });
  reading.technical.forEach((value) => technicalList.append(element("li", { text: value })));
  const completeReading = element("section", { className: "relationship-complete-reading" });
  reading.sections.forEach(({ title, values }) => completeReading.append(listCard(title, values, "relationship-reading-card surface-soft")));
  details.append(
    axes,
    completeReading,
    element("h3", { text: t("profiles.relations.priorityFacts") }),
    priorityList,
    element("h3", { text: t("profiles.relations.stableFacts") }),
    element("p", { text: t("profiles.relations.technicalIntro") }),
    technicalList,
    element("p", { className: "method-note", text: reading.cyclesNote }),
  );

  const technical = element("button", { className: "tao-quiet-action", text: t("profiles.relations.why"), attributes: { type: "button", "aria-haspopup": "dialog" } });
  technical.addEventListener("click", () => openTaoSheet({ title: "Pourquoi TAO observe cela ?", label: "Relations BaZi", content: details, opener: technical }));
  const actions = element("div", { className: "relationship-actions surface-soft" });
  actions.append(element("p", { text: t("profiles.relations.aiCopy") }));
  const talk = element("button", {
    className: "product-button product-button--primary",
    text: t("profiles.relations.talk"),
    attributes: { type: "button" },
  });
  talk.addEventListener("click", () => {
    const leftName = profiles.find(({ id }) => id === comparison.profiles.leftId)?.firstName ?? "la première personne";
    const rightName = profiles.find(({ id }) => id === comparison.profiles.rightId)?.firstName ?? "la seconde personne";
    window.dispatchEvent(new CustomEvent("tao:ai-open", { detail: {
      mode: "explanation",
      prompt: `TAO, aide-moi à approfondir la dynamique entre ${leftName} et ${rightName}. ${reading.aiPrompt}`,
      contextOptions: { facts: comparison.facts },
    } }));
  });
  actions.append(talk);

  host.append(
    hero,
    carousel,
    technical,
    actions,
  );
  const scroller = host.closest(".product-view");
  const stickyNavigation = scroller?.querySelector(".section-navigation");
  if (scroller) {
    const scrollerTop = scroller.getBoundingClientRect().top;
    const hostTop = host.getBoundingClientRect().top;
    const target = scroller.scrollTop + hostTop - scrollerTop - (stickyNavigation?.offsetHeight ?? 0) - 16;
    scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  } else {
    host.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function debugRelationship(host, { comparison, reading, cacheHit }) {
  if (new URLSearchParams(location.search).get("debug") !== "relationships") return;
  const details = element("details", { className: "product-card relationship-technical" });
  details.append(
    element("summary", { text: "TAO RELATIONSHIP DEBUG" }),
    element("pre", { text: JSON.stringify({
      selectedRelationshipGoal: comparison.relationshipGoal,
      payloadRelationshipGoal: comparison.facts.find(({ type }) => type === "RELATIONSHIP_GOAL")?.value,
      cacheKey: comparison.analysisKey,
      cacheHit,
      promptRelationshipGoal: reading.relationshipGoal,
      renderedRelationshipGoal: reading.goalLabel,
      priorityFactIds: comparison.priorityFacts.slice(0, 8).map(({ id }) => id),
    }, null, 2) }),
  );
  host.append(details);
}

function themeFor(profile) {
  return getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
}

export function createRelationshipsModule({ profiles, activeProfile, onAddProfile }) {
  const module = element("div", { className: "relationship-module" });
  const intro = element("section", { className: "surface-main relationship-intro" });
  intro.append(heading(t("profiles.relations.eyebrow"), t("profiles.relations.title"), t("profiles.relations.copy")));
  intro.append(element("p", { className: "method-note", text: t("profiles.relations.noScore") }));
  intro.append(element("a", { className: "product-button product-button--quiet", text: t("profiles.constellation.openFromRelations"), attributes: { href: "#profiles/family" } }));

  if (profiles.length < 2) {
    const empty = element("div", { className: "relationship-empty" });
    empty.append(element("p", { text: t("profiles.relations.needTwo") }));
    const add = element("button", { className: "product-button product-button--primary", text: t("profiles.actions.addPerson"), attributes: { type: "button" } });
    add.addEventListener("click", onAddProfile);
    empty.append(add);
    intro.append(empty);
    module.append(intro);
    return module;
  }

  const form = element("form", { className: "relationship-form" });
  const firstOther = profiles.find(({ id }) => id !== activeProfile.id) ?? profiles[1];
  const left = profileField({ id: "relationship-left", label: t("profiles.relations.personA"), profiles, selectedId: activeProfile.id });
  const right = profileField({ id: "relationship-right", label: t("profiles.relations.personB"), profiles, selectedId: firstOther.id });
  const type = selectField({ id: "relationship-type", label: t("profiles.relations.type"), values: RELATIONSHIP_TYPES, selectedValue: "other", labelFor: (value) => t(`profiles.relations.types.${value}`) });
  const focus = selectField({ id: "relationship-focus", label: t("profiles.relations.focus"), values: RELATIONSHIP_GOALS, selectedValue: "overview", labelFor: (value) => t(`profiles.relations.focuses.${value}`) });
  form.append(left.group, right.group, type.group, focus.group);
  const error = element("p", { className: "form-error", attributes: { role: "alert" } });
  const submit = element("button", { className: "product-button product-button--primary", text: t("profiles.relations.observe"), attributes: { type: "submit" } });
  form.append(error, submit);
  intro.append(form);

  const result = element("div", { className: "relationship-result", attributes: { "aria-live": "polite" } });
  [left.select, right.select, type.select, focus.select].forEach((select) => select.addEventListener("change", () => {
    if (!result.childElementCount) return;
    result.replaceChildren(element("p", { className: "method-note relationship-result-stale", text: t("profiles.relations.selectionChanged") }));
  }));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.textContent = "";
    if (left.select.value === right.select.value) {
      error.textContent = t("profiles.relations.sameProfile");
      return;
    }
    const leftProfile = profiles.find(({ id }) => id === left.select.value);
    const rightProfile = profiles.find(({ id }) => id === right.select.value);
    try {
      const comparison = compareBaziProfiles({
        leftProfile,
        rightProfile,
        leftTheme: themeFor(leftProfile),
        rightTheme: themeFor(rightProfile),
        relationshipType: type.select.value,
        relationshipGoal: focus.select.value,
      });
      const cached = getCachedRelationshipReading(comparison.analysisKey);
      const reading = cached ?? setCachedRelationshipReading(comparison.analysisKey, buildRelationshipSemanticReading({ comparison, leftProfile, rightProfile }));
      renderReading(result, comparison, reading, profiles);
      debugRelationship(result, { comparison, reading, cacheHit: Boolean(cached) });
    } catch (caught) {
      error.textContent = caught?.message ?? t("profiles.relations.unavailable");
    }
  });

  module.append(intro, result);
  return module;
}
