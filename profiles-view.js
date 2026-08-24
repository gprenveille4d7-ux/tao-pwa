import {
  createProfileId,
  deleteProfile,
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
import { t } from "./locales/index.js?v=1.5.1";
import { createSectionNavigation, focusRequestedSection, markProductSection, showOnlyProductSection } from "./section-navigation.js?v=tao-ux-2";
import { parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-2";
import { getSemanticConcept } from "./semantic-layer.mjs?v=1.0.1";
import { clearTaoAIMemory, getTaoAISettings, setTaoAIEnabled } from "./tao-ai-memory.js";
import { createRelationshipsModule } from "./relationships-view.js?v=tao-ux-2";
import { createFamilyConstellationModule } from "./family-constellation-view.js?v=tao-ux-2";
import { createTaoCarousel, createTaoHero, openTaoSheet } from "./tao-components.js?v=1.0.0";

const root = document.querySelector("[data-profiles-root]");
const RELATIONSHIPS = ["other", "family", "friend", "partner", "child", "parent"];
const PROFILE_SECTIONS = Object.freeze([
  { id: "me", label: "Mon profil" }, { id: "people", label: "Mes proches" }, { id: "compatibility", label: "Relations & harmonie" }, { id: "family", label: "Constellation familiale" },
]);
let searchTimer = null;
let searchController = null;

function getDayMaster(profile) {
  try {
    const result = getCachedBazi(profile) ?? setCachedBazi(profile, calculateBazi(profile));
    const stem = getSemanticConcept("stems", result.dayMaster.key);
    return `${stem.icon} ${stem.humanTitle}`;
  } catch {
    return t("common.states.unavailable");
  }
}

function facts(profile) {
  const list = element("dl", { className: "profile-facts" });
  for (const [label, value] of [
    [t("profiles.facts.birth"), formatBirthDate(profile.birthDate)], ["Lieu de naissance", formatPlace(profile.birthPlace)],
    ["Lieu d’habitation", profile.residencePlace ? formatPlace(profile.residencePlace) : "À renseigner pour la météo et le ciel"],
    [t("profiles.facts.time"), profile.birthTimeKnown ? profile.birthTime : t("profiles.fields.unknownTime")], [t("profiles.facts.dayMaster"), getDayMaster(profile)],
  ]) {
    const item = element("div");
    item.append(element("dt", { text: label }), element("dd", { text: value }));
    list.append(item);
  }
  return list;
}

function activeCard(profile) {
  const edit = element("button", { className: "product-button product-button--quiet", text: t("profiles.actions.edit"), attributes: { type: "button" } });
  edit.addEventListener("click", () => openEditor(profile));
  const settings = element("button", { className: "product-button product-button--quiet", text: "Réglages", attributes: { type: "button", "aria-haspopup": "dialog" } });
  settings.addEventListener("click", () => openTaoSheet({ title: "Réglages de TAO", label: "Profils", content: aiSettingsCard(), opener: settings }));
  return createTaoHero({
    eyebrow: t("profiles.page.active"),
    title: profile.firstName,
    lead: getDayMaster(profile),
    context: `Naissance · ${formatBirthDate(profile.birthDate)} · ${formatPlace(profile.birthPlace)} · Vie actuelle · ${profile.residencePlace ? formatPlace(profile.residencePlace) : "à renseigner"}`,
    actions: [edit, settings],
  });
}

function aiSettingsCard() {
  const settings = getTaoAISettings();
  const card = element("section", { className: "product-card ai-settings-card" });
  card.append(
    element("p", { className: "product-eyebrow", text: "Réglages" }),
    element("h2", { text: "Intelligence conversationnelle" }),
    element("p", { text: "Cette fonction ajoute Gemini aux conversations approfondies. TAO transmet uniquement le contexte utile ; tes données natales brutes et tes coordonnées restent locales." }),
    element("p", { className: "method-note", text: "Les calculs BaZi, le Yi Jing, les profils et la guidance locale continuent de fonctionner lorsque cette option est désactivée." }),
  );
  const toggle = element("button", {
    className: `product-button ${settings.enabled ? "product-button--quiet" : "product-button--primary"}`,
    text: settings.enabled ? "Désactiver l’intelligence conversationnelle" : "Activer l’intelligence conversationnelle",
    attributes: { type: "button", "aria-pressed": String(settings.enabled) },
  });
  toggle.addEventListener("click", () => {
    setTaoAIEnabled(!getTaoAISettings().enabled);
    renderProfilesView();
  });
  const clear = element("button", { className: "product-button product-button--quiet", text: "Effacer la mémoire locale de TAO", attributes: { type: "button" } });
  clear.addEventListener("click", () => {
    if (!window.confirm("Effacer les sujets récents, les souvenirs explicites et les synthèses IA en cache pour ce profil ?")) return;
    clearTaoAIMemory(getActiveProfile()?.id);
  });
  const actions = element("div", { className: "product-actions" });
  actions.append(toggle, clear);
  card.append(actions);
  return card;
}

function otherProfiles(profiles, activeId) {
  const section = element("section", { className: "product-section" });
  const header = element("header", { className: "product-section__header" });
  header.append(element("p", { className: "product-eyebrow", text: t("profiles.page.people") }), element("h2", { text: "Changer de personne" }), element("p", { text: "Touchez un profil pour l’utiliser. Les autres actions restent dans son menu." }));
  const cards = profiles.map((profile) => {
    const card = element("article", { className: `surface-main profile-person-card${profile.id === activeId ? " is-active" : ""}` });
    const select = element("button", { className: "profile-person-card__select", attributes: { type: "button", "aria-label": `${profile.id === activeId ? "Profil actif" : "Utiliser le profil"} ${profile.firstName}` } });
    select.append(element("span", { text: profile.id === activeId ? "Profil actif" : "Profil" }), element("strong", { text: profile.firstName }), element("small", { text: getDayMaster(profile) }));
    select.addEventListener("click", () => { if (profile.id !== activeId) activate(profile.id); });
    const menu = element("button", { className: "profile-person-card__menu", text: "•••", attributes: { type: "button", "aria-label": `Actions pour ${profile.firstName}`, "aria-haspopup": "dialog" } });
    menu.addEventListener("click", () => {
      const actions = element("div", { className: "profile-sheet-actions" });
      const edit = element("button", { className: "product-button product-button--quiet", text: t("profiles.actions.edit"), attributes: { type: "button" } });
      let closeMenu = () => {};
      edit.addEventListener("click", () => {
        closeMenu();
        openEditor(profile);
      });
      actions.append(edit);
      if (profile.id !== activeId) {
        const remove = element("button", { className: "product-button product-button--danger", text: "Supprimer", attributes: { type: "button" } });
        remove.addEventListener("click", () => {
          if (!window.confirm(`Supprimer le profil de ${profile.firstName} ? Ses données locales seront retirées.`)) return;
          deleteProfile(profile.id);
          clearCachedBazi(profile.id);
          clearDailyCacheForProfile(profile.id);
          document.querySelector(".tao-sheet-backdrop")?.remove();
          document.body.classList.remove("has-tao-sheet");
          renderProfilesView();
        });
        actions.append(remove);
      }
      closeMenu = openTaoSheet({ title: profile.firstName, label: "Profil", content: actions, opener: menu });
    });
    card.append(select, menu);
    return card;
  });
  const add = element("button", { className: "surface-main profile-add-card", attributes: { type: "button", "aria-label": t("profiles.actions.addPerson") } });
  add.append(element("span", { text: "+" }), element("strong", { text: t("profiles.page.addPerson") }));
  add.addEventListener("click", () => openEditor());
  cards.push(add);
  section.append(header, createTaoCarousel({ cards, label: "Profils enregistrés" }));
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

function renderPlaceResults(places, list, input, state, status, key = "place") {
  list.replaceChildren();
  for (const place of places) {
    const item = element("li");
    const button = element("button", { text: formatPlace(place), attributes: { type: "button" } });
    button.addEventListener("click", () => {
      state[key] = place;
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
  const state = { place: existing?.birthPlace ?? null, residence: existing?.residencePlace ?? null };
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

  form.append(element("h3", { className: "profile-form__section", text: "Naissance" }));
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

  const conventionGroup = element("div", { className: "product-field product-field--wide" });
  const conventionLabel = element("label", { text: "Convention traditionnelle pour les Da Yun", attributes: { for: "profile-dayun-convention" } });
  const convention = element("select", { attributes: { id: "profile-dayun-convention", name: "daYunConvention" } });
  convention.append(
    element("option", { text: "À choisir", attributes: { value: "" } }),
    element("option", { text: "Convention masculine", attributes: { value: "masculine" } }),
    element("option", { text: "Convention féminine", attributes: { value: "feminine" } }),
  );
  convention.value = existing?.daYunConvention ?? "";
  conventionGroup.append(conventionLabel, convention, element("small", { text: "Paramètre technique du calcul traditionnel, indépendant de votre identité affichée." }));
  form.append(conventionGroup, element("h3", { className: "profile-form__section", text: "Vie actuelle" }));

  const residenceGroup = element("div", { className: "product-field product-field--wide" });
  const residenceLabel = element("label", { text: "Lieu d’habitation", attributes: { for: "profile-residence" } });
  const residenceInput = element("input", { attributes: { id: "profile-residence", type: "search", autocomplete: "off", value: existing?.residencePlace ? formatPlace(existing.residencePlace) : "", role: "combobox", "aria-controls": "profile-residence-results" } });
  const residenceStatus = element("p", { className: "field-status", text: "Utilisé pour la météo, le ciel et l’environnement. Il ne modifie pas votre thème natal." });
  const residenceResults = element("ul", { className: "place-result-list", attributes: { id: "profile-residence-results" } });
  let residenceTimer = null;
  let residenceController = null;
  residenceInput.addEventListener("input", () => {
    state.residence = null;
    clearTimeout(residenceTimer);
    residenceController?.abort();
    residenceResults.replaceChildren();
    const query = residenceInput.value.trim();
    if (query.length < 3) return;
    residenceStatus.textContent = t("profiles.editor.searching");
    residenceTimer = setTimeout(async () => {
      residenceController = new AbortController();
      try {
        const places = await searchBirthPlaces(query, { signal: residenceController.signal });
        renderPlaceResults(places, residenceResults, residenceInput, state, residenceStatus, "residence");
      } catch (error) {
        if (error.name !== "AbortError") residenceStatus.textContent = t("profiles.editor.unavailable");
      }
    }, 280);
  });
  residenceGroup.append(residenceLabel, residenceInput, residenceStatus, residenceResults);
  form.append(residenceGroup);

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
      schemaVersion: 2,
      id: existing?.id ?? createProfileId(),
      firstName: name,
      relationship: existing?.relationship ?? String(data.get("relationship") ?? "other"),
      birthDate: date,
      birthTime: time,
      birthTimeKnown: !timeUnknown,
      birthPlace: state.place,
      residencePlace: state.residence,
      daYunConvention: String(data.get("daYunConvention") || "") || null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) {
      const natalChanged = existing.birthDate !== profile.birthDate || existing.birthTime !== profile.birthTime || existing.birthTimeKnown !== profile.birthTimeKnown || JSON.stringify(existing.birthPlace) !== JSON.stringify(profile.birthPlace);
      if (natalChanged) {
        clearCachedBazi(existing.id);
        clearDailyCacheForProfile(existing.id);
      }
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
  const me = markProductSection(element("section", { className: "product-depth-section" }), "profiles", "me");
  me.append(activeCard(active));
  const people = markProductSection(element("section", { className: "product-depth-section" }), "profiles", "people");
  people.append(otherProfiles(getProfiles(), active.id));
  const compatibility = markProductSection(element("section", { className: "product-depth-section" }), "profiles", "compatibility");
  compatibility.append(createRelationshipsModule({ profiles: getProfiles(), activeProfile: active, onAddProfile: () => openEditor() }));
  const family = markProductSection(element("section", { className: "product-depth-section" }), "profiles", "family");
  family.append(createFamilyConstellationModule({ profiles: getProfiles(), onAddProfile: () => openEditor() }));
  const route = parseAppRoute(location.hash);
  root.replaceChildren(me, createSectionNavigation("profiles", PROFILE_SECTIONS, "Explorer Profils"), people, compatibility, family);
  showOnlyProductSection(root, route.section);
  focusRequestedSection(root, "profiles", route.section, { scroll: route.section !== "me" });
}

window.addEventListener("tao:view-change", (event) => {
  if (event.detail?.view === "profiles") renderProfilesView();
});
window.addEventListener("tao:profile-created", () => {
  if (location.hash.startsWith("#profiles")) renderProfilesView();
});
if (location.hash.startsWith("#profiles")) renderProfilesView();
