import { getActiveProfile } from "./profile-store.js";

const DEFAULT_VIEW = "pavilion";
const VIEW_TITLES = Object.freeze({
  today: "Aujourd’hui",
  theme: "Mon thème",
  pavilion: "Le Nebula",
  yijing: "Yi Jing",
  profiles: "Profils",
});

const navigation = document.querySelector("[data-main-navigation]");
const navigationItems = [...document.querySelectorAll("[data-navigation-target]")];
const views = [...document.querySelectorAll("[data-app-view]")];
const profileName = document.querySelector("[data-active-profile-name]");
const profileDate = document.querySelector("[data-active-profile-date]");
const profilePlace = document.querySelector("[data-active-profile-place]");
const profileTime = document.querySelector("[data-active-profile-time]");

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPlace(place) {
  return [place.city, place.region, place.country].filter(Boolean).join(" — ");
}

function renderActiveProfile(profile) {
  if (!profile) return;
  if (profileName) profileName.textContent = profile.firstName;
  if (profileDate) profileDate.textContent = formatDate(profile.birthDate);
  if (profilePlace) profilePlace.textContent = formatPlace(profile.birthPlace);
  if (profileTime) profileTime.textContent = profile.birthTimeKnown ? profile.birthTime : "Heure inconnue";
}

function requestedView() {
  const id = location.hash.slice(1);
  return Object.hasOwn(VIEW_TITLES, id) ? id : DEFAULT_VIEW;
}

function showView(id) {
  const safeId = Object.hasOwn(VIEW_TITLES, id) ? id : DEFAULT_VIEW;

  for (const view of views) {
    view.hidden = view.dataset.appView !== safeId;
  }

  for (const item of navigationItems) {
    const isCurrent = item.dataset.navigationTarget === safeId;
    if (isCurrent) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }

  if (safeId === "profiles") renderActiveProfile(getActiveProfile());
  document.body.dataset.currentView = safeId;
  document.title = `TAO — ${VIEW_TITLES[safeId]}`;
  window.dispatchEvent(new CustomEvent("tao:view-change", { detail: { view: safeId } }));
}

function revealNavigation(profile) {
  if (!profile) return false;
  renderActiveProfile(profile);
  navigation.hidden = false;
  document.body.classList.add("has-main-navigation");
  return true;
}

function openDefaultView() {
  if (location.hash !== `#${DEFAULT_VIEW}`) {
    history.replaceState(null, "", `${location.pathname}${location.search}#${DEFAULT_VIEW}`);
  }
  showView(DEFAULT_VIEW);
}

function initializeMainNavigation() {
  const debugMode = new URLSearchParams(location.search).get("debug");
  const profile = getActiveProfile();

  if (debugMode === "poses") {
    navigation.hidden = true;
    document.body.classList.remove("has-main-navigation");
    showView(DEFAULT_VIEW);
    return;
  }

  if (!revealNavigation(profile)) {
    navigation.hidden = true;
    document.body.classList.remove("has-main-navigation");
    showView(DEFAULT_VIEW);
    return;
  }

  const view = requestedView();
  if (!location.hash || view !== location.hash.slice(1)) {
    openDefaultView();
    return;
  }
  showView(view);
}

window.addEventListener("hashchange", () => {
  if (navigation.hidden || !getActiveProfile()) return;
  showView(requestedView());
});

window.addEventListener("tao:profile-created", (event) => {
  const profile = getActiveProfile();
  if (!profile || (event.detail?.profileId && event.detail.profileId !== profile.id)) return;
  revealNavigation(profile);
  openDefaultView();
});

window.addEventListener("tao:profile-changed", (event) => {
  const profile = getActiveProfile();
  if (!profile || (event.detail?.profileId && event.detail.profileId !== profile.id)) return;
  revealNavigation(profile);
  showView(requestedView());
});

initializeMainNavigation();

export { initializeMainNavigation, showView };
