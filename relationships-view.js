import { getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateBazi } from "./bazi-engine.mjs";
import {
  compareBaziProfiles,
  RELATIONSHIP_FOCUSES,
  RELATIONSHIP_TYPES,
} from "./relationship-engine.mjs";
import { buildRelationshipSemanticReading } from "./relationship-semantic.mjs?v=1.0.2";
import { t } from "./locales/index.js?v=1.3.0";
import { element } from "./tao-ui.js";

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
  const card = element("section", { className: `product-card ${className}` });
  card.append(element("h3", { text: title }));
  const list = element("ul", { className: "relationship-reading-list" });
  values.forEach((value) => list.append(element("li", { text: value })));
  card.append(list);
  return card;
}

function renderReading(host, comparison, reading, profiles) {
  host.replaceChildren();
  const hero = element("article", { className: "product-card relationship-hero" });
  hero.append(
    element("p", { className: "product-eyebrow", text: t("profiles.relations.readingEyebrow") }),
    element("h2", { text: reading.title }),
    element("p", { className: "relationship-hero__summary", text: reading.summary }),
    element("p", { className: "method-note", text: reading.disclaimer }),
  );
  const archetypes = element("div", { className: "relationship-archetypes" });
  reading.archetypes.forEach((archetype) => {
    const card = element("article");
    card.append(
      element("small", { text: archetype.name }),
      element("strong", { text: archetype.title }),
      element("span", { text: `${archetype.traditional} · ${archetype.technical}` }),
    );
    archetypes.append(card);
  });
  hero.append(archetypes);

  const axes = element("section", { className: "product-card relationship-axes" });
  axes.append(heading(t("profiles.relations.axesEyebrow"), t("profiles.relations.axesTitle"), reading.axisDisclaimer));
  const axisList = element("dl", { className: "relationship-axis-list" });
  reading.axes.forEach(({ label, levelLabel }) => {
    const row = element("div");
    row.append(element("dt", { text: label }), element("dd", { text: levelLabel }));
    axisList.append(row);
  });
  axes.append(axisList);

  const directions = element("section", { className: "relationship-direction-grid" });
  reading.directions.forEach(({ title, text }) => {
    const card = element("article", { className: "product-card relationship-reading-card" });
    card.append(element("h3", { text: title }), element("p", { text }));
    directions.append(card);
  });

  const details = element("details", { className: "product-card relationship-technical" });
  const summary = element("summary", { text: t("profiles.relations.why") });
  const technicalList = element("ul", { className: "relationship-reading-list" });
  reading.technical.forEach((value) => technicalList.append(element("li", { text: value })));
  details.append(
    summary,
    element("p", { text: t("profiles.relations.technicalIntro") }),
    technicalList,
    element("p", { className: "method-note", text: reading.cyclesNote }),
  );

  const actions = element("div", { className: "product-card relationship-actions" });
  actions.append(
    element("p", { text: t("profiles.relations.aiCopy") }),
  );
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
      prompt: `TAO, aide-moi à approfondir la dynamique entre ${leftName} et ${rightName}, en t’appuyant uniquement sur les faits relationnels transmis.`,
      contextOptions: { facts: comparison.facts },
    } }));
  });
  actions.append(talk);

  host.append(
    hero,
    axes,
    listCard(t("profiles.relations.closeness"), reading.closeness),
    listCard(t("profiles.relations.differences"), reading.differences),
    directions,
    listCard(t("profiles.relations.adjustments"), reading.adjustments),
    listCard(t("profiles.relations.recommendations"), reading.recommendations),
    details,
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

function themeFor(profile) {
  return getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
}

export function createRelationshipsModule({ profiles, activeProfile, onAddProfile }) {
  const module = element("div", { className: "relationship-module" });
  const intro = element("section", { className: "product-card relationship-intro" });
  intro.append(heading(t("profiles.relations.eyebrow"), t("profiles.relations.title"), t("profiles.relations.copy")));
  intro.append(element("p", { className: "method-note", text: t("profiles.relations.noScore") }));

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
  const focus = selectField({ id: "relationship-focus", label: t("profiles.relations.focus"), values: RELATIONSHIP_FOCUSES, selectedValue: "general", labelFor: (value) => t(`profiles.relations.focuses.${value}`) });
  form.append(left.group, right.group, type.group, focus.group);
  const error = element("p", { className: "form-error", attributes: { role: "alert" } });
  const submit = element("button", { className: "product-button product-button--primary", text: t("profiles.relations.observe"), attributes: { type: "submit" } });
  form.append(error, submit);
  intro.append(form);

  const result = element("div", { className: "relationship-result", attributes: { "aria-live": "polite" } });
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
        focus: focus.select.value,
      });
      const reading = buildRelationshipSemanticReading({ comparison, leftProfile, rightProfile });
      renderReading(result, comparison, reading, profiles);
    } catch (caught) {
      error.textContent = caught?.message ?? t("profiles.relations.unavailable");
    }
  });

  module.append(intro, result);
  return module;
}
