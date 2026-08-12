import { searchBirthPlaces } from "./geocoding.js";
import {
  clearLocalProfilesForDebug,
  clearOnboardingDraft,
  createProfileId,
  getActiveProfile,
  loadOnboardingDraft,
  saveOnboardingDraft,
  saveProfile,
} from "./profile-store.js";
import { setTaoDialogueText } from "./tao-dialogue.js";
import { setTaoNarrativeState } from "./tao-narrative.js";
import { formatDate as formatLocalizedDate, formatPlace as formatLocalizedPlace, t } from "./locales/index.js";

const root = document.querySelector("[data-onboarding]");
const form = root.querySelector("[data-onboarding-form]");
const control = root.querySelector("[data-onboarding-control]");
const errorMessage = root.querySelector("[data-onboarding-error]");
let draft = loadOnboardingDraft();
let currentStep = "firstName";
let searchTimer = null;
let searchController = null;
let lastPlaceQuery = "";
let editingExistingAnswer = false;

function element(tagName, options = {}) {
  const node = document.createElement(tagName);

  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.name) node.name = options.name;
  if (options.value !== undefined) node.value = options.value;
  return node;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function persistDraft() {
  saveOnboardingDraft(draft);
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return formatLocalizedDate(date);
}

function formatPlace(place) {
  return formatLocalizedPlace(place);
}

function nextIncompleteStep() {
  if (!draft.firstName?.trim()) return "firstName";
  if (!draft.birthPlace?.id) return "birthPlace";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate ?? "")) return "birthDate";
  if (typeof draft.birthTimeKnown !== "boolean") return "birthTime";
  return "confirm";
}

function createField({ id, label, type = "text", value = "", autocomplete, inputMode }) {
  const group = element("div", { className: "tao-field" });
  const fieldLabel = element("label", { className: "tao-field__label", text: label });
  const input = element("input", { className: "tao-field__input", type, name: id, value });
  fieldLabel.htmlFor = id;
  input.id = id;
  input.autocomplete = autocomplete ?? "off";
  input.enterKeyHint = "next";
  if (inputMode) input.inputMode = inputMode;
  group.append(fieldLabel, input);
  return { group, input };
}

function primaryButton(label) {
  return element("button", {
    className: "tao-action tao-action--primary",
    text: label,
    type: "submit",
  });
}

async function renderStep(step) {
  currentStep = step;
  showError("");
  control.replaceChildren();
  root.hidden = false;
  document.body.classList.add("is-onboarding");

  if (step === "firstName") {
    await setTaoNarrativeState("welcome");
    setTaoDialogueText(t("profiles.onboarding.firstQuestion"));
    const { group, input } = createField({
      id: "first-name",
      label: t("profiles.fields.firstName"),
      value: draft.firstName ?? "",
      autocomplete: "given-name",
    });
    input.maxLength = 80;
    control.append(group, primaryButton(t("common.actions.continue")));
    input.focus({ preventScroll: true });
    return;
  }

  if (step === "birthPlace") {
    await setTaoNarrativeState("observing");
    setTaoDialogueText(t("profiles.onboarding.placeQuestion", { firstName: draft.firstName }));
    renderPlaceSearch();
    return;
  }

  if (step === "birthDate") {
    await setTaoNarrativeState("observing");
    setTaoDialogueText(t("profiles.onboarding.dateQuestion"));
    const { group, input } = createField({
      id: "birth-date",
      label: t("profiles.fields.birthDate"),
      type: "date",
      value: draft.birthDate ?? "",
      autocomplete: "bday",
    });
    input.max = todayIso();
    input.required = true;
    control.append(group, primaryButton(t("common.actions.continue")));
    input.focus({ preventScroll: true });
    return;
  }

  if (step === "birthTime") {
    await setTaoNarrativeState("observing");
    setTaoDialogueText(t("profiles.onboarding.timeQuestion"));
    const { group, input } = createField({
      id: "birth-time",
      label: t("profiles.fields.localBirthTime"),
      type: "time",
      value: draft.birthTime ?? "",
      autocomplete: "bday-time",
    });
    input.required = true;
    const actions = element("div", { className: "tao-onboarding__actions" });
    const unknown = element("button", {
      className: "tao-action tao-action--quiet",
      text: t("profiles.fields.unknownTimeChoice"),
      type: "button",
    });
    unknown.addEventListener("click", async () => {
      draft = { ...draft, birthTimeKnown: false, birthTime: null };
      persistDraft();
      editingExistingAnswer = false;
      await renderStep("confirm");
    });
    actions.append(primaryButton(t("common.actions.continue")), unknown);
    control.append(group, actions);
    input.focus({ preventScroll: true });
    return;
  }

  await renderConfirmation();
}

function renderPlaceSearch() {
  const { group, input } = createField({
    id: "birth-place",
    label: t("profiles.fields.birthCity"),
    type: "search",
    value: draft.birthPlace ? formatPlace(draft.birthPlace) : "",
    autocomplete: "off",
  });
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "birth-place-results");
  input.setAttribute("aria-expanded", "false");
  const status = element("p", { className: "tao-place-status", text: t("profiles.onboarding.typeThree") });
  status.setAttribute("aria-live", "polite");
  const results = element("ul", { className: "tao-place-results" });
  results.id = "birth-place-results";
  results.setAttribute("role", "listbox");
  const attribution = element("p", {
    className: "tao-place-attribution",
    text: t("profiles.onboarding.attribution"),
  });

  input.addEventListener("input", () => {
    draft = { ...draft, birthPlace: null };
    window.clearTimeout(searchTimer);
    searchController?.abort();
    results.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    const query = input.value.trim();

    if (query.length < 3) {
      status.textContent = t("profiles.onboarding.typeThree");
      return;
    }

    status.textContent = t("profiles.onboarding.searching");
    searchTimer = window.setTimeout(() => runPlaceSearch(query, input, status, results), 280);
  });

  const actions = element("div", { className: "tao-onboarding__actions" });
  actions.append(primaryButton(t("common.actions.continue")));
  control.append(group, status, results, attribution, actions);
  input.focus({ preventScroll: true });
}

async function runPlaceSearch(query, input, status, results) {
  searchController?.abort();
  searchController = new AbortController();
  lastPlaceQuery = query;

  try {
    const places = await searchBirthPlaces(query, { signal: searchController.signal });
    results.replaceChildren();

    if (places.length === 0) {
      status.textContent = t("profiles.onboarding.noPlace");
      input.setAttribute("aria-expanded", "false");
      return;
    }

    for (const place of places) {
      const item = element("li");
      item.setAttribute("role", "option");
      const button = element("button", {
        className: "tao-place-result",
        text: formatPlace(place),
        type: "button",
      });
      button.addEventListener("click", () => {
        draft = { ...draft, birthPlace: place };
        persistDraft();
        input.value = formatPlace(place);
        results.replaceChildren();
        input.setAttribute("aria-expanded", "false");
        status.textContent = t("profiles.onboarding.selected", { place: formatPlace(place) });
      });
      item.append(button);
      results.append(item);
    }

    status.textContent = t("profiles.onboarding.chooseBirthPlace");
    input.setAttribute("aria-expanded", "true");
  } catch (error) {
    if (error.name === "AbortError") return;
    results.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    status.textContent = t("profiles.onboarding.searchUnavailable");
    const retry = element("button", {
      className: "tao-action tao-action--quiet",
      text: t("common.actions.retry"),
      type: "button",
    });
    retry.addEventListener("click", () => runPlaceSearch(lastPlaceQuery, input, status, results));
    results.append(element("li"));
    results.firstElementChild.append(retry);
  }
}

async function renderConfirmation() {
  await setTaoNarrativeState("observing");
  setTaoDialogueText(t("profiles.onboarding.confirmQuestion", { firstName: draft.firstName }));
  const summary = element("dl", { className: "tao-profile-summary" });
  const entries = [
    [t("profiles.fields.firstName"), draft.firstName, "firstName"],
    [t("profiles.fields.birthPlace"), formatPlace(draft.birthPlace), "birthPlace"],
    [t("profiles.fields.birthDate"), formatDate(draft.birthDate), "birthDate"],
    [t("profiles.fields.birthTime"), draft.birthTimeKnown ? draft.birthTime : t("profiles.fields.unknownTime"), "birthTime"],
  ];

  for (const [label, value, step] of entries) {
    const row = element("div", { className: "tao-profile-summary__row" });
    const term = element("dt", { text: label });
    const description = element("dd", { text: value });
    const edit = element("button", {
      className: "tao-summary-edit",
      text: `${t("common.actions.correct")} ${label.toLowerCase()}`,
      type: "button",
    });
      edit.setAttribute("aria-label", `${t("common.actions.correct")} : ${label}`);
    edit.addEventListener("click", () => {
      editingExistingAnswer = true;
      renderStep(step);
    });
    row.append(term, description, edit);
    summary.append(row);
  }

  control.append(summary, primaryButton(t("profiles.onboarding.confirm")));
}

async function handleSubmit(event) {
  event.preventDefault();
  showError("");

  try {
    if (currentStep === "firstName") {
      const firstName = new FormData(form).get("first-name")?.trim();
      if (!firstName) return showError(t("profiles.onboarding.errors.firstName"));
      draft = { ...draft, firstName };
      persistDraft();
      if (editingExistingAnswer) {
        editingExistingAnswer = false;
        return renderStep("confirm");
      }
      return renderStep("birthPlace");
    }

    if (currentStep === "birthPlace") {
      if (!draft.birthPlace?.id) return showError(t("profiles.onboarding.errors.place"));
      persistDraft();
      if (editingExistingAnswer) {
        editingExistingAnswer = false;
        return renderStep("confirm");
      }
      return renderStep("birthDate");
    }

    if (currentStep === "birthDate") {
      const birthDate = new FormData(form).get("birth-date");
      if (!birthDate || birthDate > todayIso()) return showError(t("profiles.onboarding.errors.date"));
      draft = { ...draft, birthDate };
      persistDraft();
      if (editingExistingAnswer) {
        editingExistingAnswer = false;
        return renderStep("confirm");
      }
      return renderStep("birthTime");
    }

    if (currentStep === "birthTime") {
      const birthTime = new FormData(form).get("birth-time");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime ?? "")) {
        return showError(t("profiles.onboarding.errors.time"));
      }
      draft = { ...draft, birthTimeKnown: true, birthTime };
      persistDraft();
      editingExistingAnswer = false;
      return renderStep("confirm");
    }

    if (currentStep === "confirm") return completeFirstMeeting();
  } catch {
    showError(t("profiles.onboarding.errors.storage"));
  }
}

async function completeFirstMeeting() {
  const now = new Date().toISOString();
  const profile = {
    schemaVersion: 1,
    id: createProfileId(),
    firstName: draft.firstName.trim(),
    relationship: "self",
    birthDate: draft.birthDate,
    birthTime: draft.birthTimeKnown ? draft.birthTime : null,
    birthTimeKnown: draft.birthTimeKnown,
    birthPlace: draft.birthPlace,
    createdAt: now,
    updatedAt: now,
  };
  saveProfile(profile);
  clearOnboardingDraft();
  root.hidden = true;
  document.body.classList.remove("is-onboarding");
  await setTaoNarrativeState("thinking");
  setTaoDialogueText(t("profiles.onboarding.final", { firstName: profile.firstName }));
  window.dispatchEvent(
    new CustomEvent("tao:profile-created", { detail: { profileId: profile.id } }),
  );
}

function enableDebugReset() {
  if (new URLSearchParams(location.search).get("debug") !== "onboarding") return;
  const reset = element("button", {
    className: "onboarding-debug-reset",
    text: t("profiles.onboarding.reset"),
    type: "button",
  });
  reset.addEventListener("click", () => {
    clearLocalProfilesForDebug();
    location.reload();
  });
  document.body.append(reset);
}

async function initializeOnboarding() {
  enableDebugReset();
  const debugMode = new URLSearchParams(location.search).get("debug");

  if (debugMode === "poses" || debugMode === "scene") {
    root.hidden = true;
    document.body.classList.remove("is-onboarding");
    return;
  }

  const activeProfile = getActiveProfile();

  if (activeProfile) {
    root.hidden = true;
    document.body.classList.remove("is-onboarding");
    await setTaoNarrativeState("idle");
    return;
  }

  await renderStep(nextIncompleteStep());
}

form.addEventListener("submit", handleSubmit);
initializeOnboarding().catch(() => {
  showError(t("profiles.onboarding.errors.startup"));
  root.hidden = false;
});
