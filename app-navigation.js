import { getActiveProfile } from "./profile-store.js";
import { formatDate, formatPlace, localizeDocument, t } from "./locales/index.js";
import { DEFAULT_VIEW, parseAppRoute } from "./navigation-routes.mjs?v=tao-ux-2";

const VIEW_TITLES = Object.freeze({
  today: t("common.navigation.today"),
  theme: t("common.navigation.theme"),
  pavilion: t("common.navigation.pavilion"),
  yijing: t("common.navigation.yijing"),
  profiles: t("common.navigation.profiles"),
});

const navigation = document.querySelector("[data-main-navigation]");
const navigationItems = [...document.querySelectorAll("[data-navigation-target]")];
const views = [...document.querySelectorAll("[data-app-view]")];
const profileName = document.querySelector("[data-active-profile-name]");
const profileDate = document.querySelector("[data-active-profile-date]");
const profilePlace = document.querySelector("[data-active-profile-place]");
const profileTime = document.querySelector("[data-active-profile-time]");

function renderActiveProfile(profile) {
  if (!profile) return;
  if (profileName) profileName.textContent = profile.firstName;
  if (profileDate) profileDate.textContent = formatDate(profile.birthDate);
  if (profilePlace) profilePlace.textContent = formatPlace(profile.birthPlace);
  if (profileTime) profileTime.textContent = profile.birthTimeKnown ? profile.birthTime : t("profiles.fields.unknownTime");
}

function requestedRoute() {
  return parseAppRoute(location.hash);
}

function scrollViewToTop(viewId, behavior = "smooth") {
  const view = views.find((candidate) => candidate.dataset.appView === viewId);
  if (view?.scrollTo) view.scrollTo({ top: 0, left: 0, behavior });
  else window.scrollTo({ top: 0, left: 0, behavior });
}

function showView(id, section = null) {
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
  const routeSection = section ?? parseAppRoute(`#${safeId}`).section;
  window.dispatchEvent(new CustomEvent("tao:view-change", { detail: { view: safeId, section: routeSection } }));
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
  localizeDocument();
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

  const route = requestedRoute();
  if (!location.hash) {
    openDefaultView();
    return;
  }
  showView(route.view, route.section);
}

navigation.addEventListener("click", (event) => {
  const item = event.target.closest("[data-navigation-target]");
  if (!item) return;
  const targetView = item.dataset.navigationTarget;
  const route = requestedRoute();
  if (route.view !== targetView) return;
  event.preventDefault();
  const defaultHash = `#${targetView}`;
  if (location.hash !== defaultHash) {
    location.hash = defaultHash;
    window.setTimeout(() => scrollViewToTop(targetView), 0);
  } else scrollViewToTop(targetView);
});

window.addEventListener("hashchange", () => {
  if (navigation.hidden || !getActiveProfile()) return;
  const route = requestedRoute();
  showView(route.view, route.section);
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
  const route = requestedRoute();
  showView(route.view, route.section);
});

initializeMainNavigation();

export { initializeMainNavigation, scrollViewToTop, showView };
