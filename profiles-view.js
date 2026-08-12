import {
  createProfileId,
  getActiveProfile,
  getProfiles,
  saveProfile,
  setActiveProfile,
} from "./profile-store.js?v=profiles-v2";
import { clearCachedBazi, getCachedBazi, setCachedBazi } from "./bazi-cache.mjs";
import { calculateBazi } from "./bazi-engine.mjs";
import { clearDailyCacheForProfile } from "./daily-cache.mjs";
import { searchBirthPlaces } from "./geocoding.js";
import { element, formatBirthDate, formatPlace } from "./tao-ui.js";
import { getConcept, t } from "./locales/index.js";

const root = document.querySelector("[data-profiles-root]");
const RELATIONSHIPS = ["other", "family", "friend", "partner", "child", "parent"];
let searchTimer = null;
let searchController = null;

function getDayMaster(profile) {
  try {
    const result = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
    const stem = getConcept("bazi.heavenlyStems", result.dayMaster.key);
    return `${stem.french} · ${stem.label}`;
  } catch {
    return t("common.states.unavailable");
  }
}

function facts(profile) {
  const list = element("dl", { className: "profile-facts" });
  for (const [label, value] of [
    [t("profiles.facts.birth"), formatBirthDate(profile.birthDate)], [t("profiles.facts.place"), formatPlace(profile.birthPlace)],
    [t("profiles.facts.time"), profile.birthTimeKnown ? profile.birthTime : t("profiles.fields.unknownTime")], [t("profiles.facts.dayMaster"), getDayMaster(profile)],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    list.append(item);
  }
  return list;
}

function activeCard(profile) {
  const card = element("article", { className: "product-card active-profile-product" });
  card.append(element("p", { className: "product-eyebrow", text: t("profiles.page.active") }), element("h2", { text: profile.firstName }), facts(profile));
  const actions = element("div", { className: "product-actions" });
  const edit = element("button", { className: "product-button product-button--primary", text: t("profiles.actions.edit"), attributes: { type: "button" } });
  edit.addEventListener("click", () => openEditor(profile));
  actions.append(edit);
  card.append(actions);
  return card;
}

function otherProfiles(profiles, activeId) {
  const section = element("section", { className: "product-section" });
  const header = element("header", { className: "product-section__header" });
  header.append(element("p", { className: "product-eyebrow", text: t("profiles.page.people") }), element("h2", { text: t("profiles.page.others") }));
  const list = element("div", { className: "profile-list" });
  const others = profiles.filter(({ id }) => id !== activeId);
  if (!others.length) list.append(element("p", { className: "empty-state", text: t("profiles.page.empty") }));
  for (const profile of others) {
    const card = element("article", { className: "product-card profile-list-card" });
    const text = element("div");
    text.append(element("h3", { text: profile.firstName }), element("p", { text: `${formatBirthDate(profile.birthDate)} · ${formatPlace(profile.birthPlace)}` }), element("small", { text: getDayMaster(profile) }));
    const actions = element("div", { className: "profile-list-card__actions" });
    const use = element("button", { className: "product-button product-button--primary", text: t("profiles.actions.use"), attributes: { type: "button" } });
    use.addEventListener("click", () => activate(profile.id));
    const edit = element("button", { className: "product-button product-button--quiet", text: t("profiles.actions.edit"), attributes: { type: "button" } });
    edit.addEventListener("click", () => openEditor(profile));
    actions.append(use, edit);
    card.append(text, actions);
    list.append(card);
  }
  section.append(header, list);
  return section;
}

function field(form, { name, label, type = "text", value = "", required = true }) {
  const group = element("div", { className: "product-field" });
  const labelNode = element("label", { text: label, attributes: { for: `profile-${name}` } });
  const input = element("input", { attributes: { id: `profile-${name}`, name, type, value } });
  if (required) input.required = true;
  group.append(labelNode, input);
  form.append(group);
  return input;
}

function renderPlaceResults(places, list, input, state, status) {
  list.replaceChildren();
  for (const place of places) {
    const item = element("li");
    const button = element("button", { text: formatPlace(place), attributes: { type: "button" } });
    button.addEventListener("click", () => {
      state.place = place;
      input.value = formatPlace(place);
      list.replaceChildren();
      status.textContent = t("profiles.editor.selected", { place: formatPlace(place) });
    });
    item.append(button);
    list.append(item);
  }
  status.textContent = places.length ? t("profiles.editor.chooseExact") : t("profiles.editor.noneFound");
}

function openEditor(existing = null) {
  root.querySelector("[data-profile-editor]")?.remove();
  const state = { place: existing?.birthPlace ?? null };
  const panel = element("section", { className: "product-card profile-editor", attributes: { "data-profile-editor": "", "aria-labelledby": "profile-editor-title" } });
  const head = element("header", { className: "profile-editor__header" });
  head.append(element("div", { html: `<p class="product-eyebrow">${existing ? t("profiles.editor.editEyebrow") : t("profiles.editor.newEyebrow")}</p><h2 id="profile-editor-title">${existing ? existing.firstName : t("profiles.page.addPerson")}</h2>` }));
  const close = element("button", { className: "product-button product-button--quiet", text: t("common.actions.close"), attributes: { type: "button", "aria-label": t("profiles.actions.closeEditor") } });
  close.addEventListener("click", () => panel.remove());
  head.append(close);
  const form = element("form", { className: "profile-form", attributes: { novalidate: "" } });
  const firstName = field(form, { name: "firstName", label: t("profiles.fields.firstName"), value: existing?.firstName ?? "" });

  if (!existing) {
    const group = element("div", { className: "product-field" });
    const label = element("label", { text: t("profiles.fields.relationship"), attributes: { for: "profile-relationship" } });
    const select = element("select", { attributes: { id: "profile-relationship", name: "relationship" } });
    for (const value of RELATIONSHIPS) select.append(element("option", { text: t(`profiles.relationships.${value}`), attributes: { value } }));
    group.append(label, select);
    form.append(group);
  }

  const placeGroup = element("div", { className: "product-field product-field--wide" });
  const placeLabel = element("label", { text: t("profiles.fields.birthPlace"), attributes: { for: "profile-place" } });
  const placeInput = element("input", { attributes: { id: "profile-place", type: "search", autocomplete: "off", value: existing ? formatPlace(existing.birthPlace) : "", role: "combobox", "aria-controls": "profile-place-results" } });
  const placeStatus = element("p", { className: "field-status", text: t("profiles.editor.searchHint") });
  const placeResults = element("ul", { className: "place-result-list", attributes: { id: "profile-place-results" } });
  placeInput.addEventListener("input", () => {
    state.place = null;
    window.clearTimeout(searchTimer);
    searchController?.abort();
    placeResults.replaceChildren();
    const query = placeInput.value.trim();
    if (query.length < 3) return;
    placeStatus.textContent = t("profiles.editor.searching");
    searchTimer = window.setTimeout(async () => {
      searchController = new AbortController();
      try {
        const places = await searchBirthPlaces(query, { signal: searchController.signal });
        renderPlaceResults(places, placeResults, placeInput, state, placeStatus);
      } catch (error) {
        if (error.name !== "AbortError") placeStatus.textContent = t("profiles.editor.unavailable");
      }
    }, 280);
  });
  placeGroup.append(placeLabel, placeInput, placeStatus, placeResults);
  form.append(placeGroup);

  const birthDate = field(form, { name: "birthDate", label: t("profiles.fields.birthDate"), type: "date", value: existing?.birthDate ?? "" });
  birthDate.max = new Date().toISOString().slice(0, 10);
  const birthTime = field(form, { name: "birthTime", label: t("profiles.fields.localBirthTime"), type: "time", value: existing?.birthTime ?? "", required: existing?.birthTimeKnown !== false });
  const unknownGroup = element("label", { className: "unknown-time" });
  const unknown = element("input", { attributes: { type: "checkbox", name: "birthTimeUnknown" } });
  unknown.checked = existing?.birthTimeKnown === false;
  birthTime.disabled = unknown.checked;
  unknown.addEventListener("change", () => {
    birthTime.disabled = unknown.checked;
    birthTime.required = !unknown.checked;
  });
  unknownGroup.append(unknown, element("span", { text: t("profiles.fields.unknownTimeChoice") }));
  form.append(unknownGroup);

  const error = element("p", { className: "form-error", attributes: { role: "alert" } });
  const save = element("button", { className: "product-button product-button--primary", text: existing ? t("profiles.actions.saveChanges") : t("profiles.actions.addThisPerson"), attributes: { type: "submit" } });
  form.append(error, save);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("firstName") ?? "").trim();
    const date = String(data.get("birthDate") ?? "");
    const timeUnknown = unknown.checked;
    const time = timeUnknown ? null : String(data.get("birthTime") ?? "");
    if (!name) return void (error.textContent = t("profiles.errors.firstName"));
    if (!state.place?.id) return void (error.textContent = t("profiles.errors.place"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > birthDate.max) return void (error.textContent = t("profiles.errors.date"));
    if (!timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return void (error.textContent = t("profiles.errors.time"));
    const now = new Date().toISOString();
    const profile = {
      schemaVersion: 1,
      id: existing?.id ?? createProfileId(),
      firstName: name,
      relationship: existing?.relationship ?? String(data.get("relationship") ?? "other"),
      birthDate: date,
      birthTime: time,
      birthTimeKnown: !timeUnknown,
      birthPlace: state.place,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) {
      clearCachedBazi(existing.id);
      clearDailyCacheForProfile(existing.id);
    }
    const active = getActiveProfile();
    saveProfile(profile, { setActive: existing?.id === active?.id });
    panel.remove();
    renderProfilesView();
    window.dispatchEvent(new CustomEvent("tao:profile-changed", { detail: { profileId: getActiveProfile()?.id, updatedProfileId: profile.id } }));
  });
  panel.append(head, form);
  root.append(panel);
  firstName.focus({ preventScroll: true });
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activate(profileId) {
  const profile = setActiveProfile(profileId);
  renderProfilesView();
  window.dispatchEvent(new CustomEvent("tao:profile-changed", { detail: { profileId: profile.id } }));
}

export function renderProfilesView() {
  if (!root) return;
  const active = getActiveProfile();
  if (!active) {
    root.replaceChildren(element("section", { className: "product-card product-error", text: t("profiles.errors.noProfile") }));
    return;
  }
  const pageHeader = element("header", { className: "product-header" });
  pageHeader.append(element("p", { className: "product-eyebrow", text: t("profiles.page.eyebrow") }), element("h1", { text: t("profiles.page.title") }), element("p", { className: "product-lead", text: t("profiles.page.lead") }));
  const add = element("button", { className: "product-button product-button--add", text: t("profiles.actions.addPerson"), attributes: { type: "button" } });
  add.addEventListener("click", () => openEditor());
  const compare = element("section", { className: "product-card compare-card", attributes: { "aria-disabled": "true" } });
  compare.append(element("div", { html: `<p class="product-eyebrow">${t("profiles.compare.eyebrow")}</p><h2>${t("profiles.compare.title")}</h2><p>${t("profiles.compare.copy")}</p>` }));
  root.replaceChildren(pageHeader, activeCard(active), add, otherProfiles(getProfiles(), active.id), compare);
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "profiles") renderProfilesView();
});
window.addEventListener("tao:profile-created", () => {
  if (location.hash === "#profiles") renderProfilesView();
});
if (location.hash === "#profiles") renderProfilesView();
