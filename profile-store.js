const PROFILES_KEY = "tao.profiles.v1";
const ACTIVE_PROFILE_KEY = "tao.activeProfileId.v1";
const ONBOARDING_DRAFT_KEY = "tao.onboardingDraft.v1";
const RELATIONSHIPS = new Set(["self", "family", "friend", "partner", "child", "parent", "other"]);

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isFiniteCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPlace(place) {
  return Boolean(place && typeof place.id === "string" && typeof place.city === "string" &&
    typeof place.country === "string" && isFiniteCoordinate(place.latitude) &&
    isFiniteCoordinate(place.longitude) && typeof place.timezone === "string" && place.timezone.length > 0);
}

export function isValidProfile(profile) {
  const place = profile?.birthPlace;
  const timeIsValid =
    profile?.birthTimeKnown === false
      ? profile.birthTime === null
      : profile?.birthTimeKnown === true && /^\d{2}:\d{2}$/.test(profile.birthTime);

  return Boolean(
    profile &&
      typeof profile.id === "string" &&
      profile.id.length > 0 &&
      typeof profile.firstName === "string" &&
      profile.firstName.trim().length > 0 &&
      RELATIONSHIPS.has(profile.relationship) &&
      /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) &&
      timeIsValid &&
      isValidPlace(place) &&
      (profile.residencePlace == null || isValidPlace(profile.residencePlace)) &&
      (profile.daYunConvention == null || ["masculine", "feminine"].includes(profile.daYunConvention)),
  );
}

export function getProfiles() {
  const profiles = readJson(PROFILES_KEY, []);
  return Array.isArray(profiles) ? profiles.filter(isValidProfile) : [];
}

export function getActiveProfile() {
  const profiles = getProfiles();
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  const activeProfile = profiles.find(({ id }) => id === activeId);

  if (activeProfile) return activeProfile;

  const mainProfile = profiles.find(({ relationship }) => relationship === "self");

  if (mainProfile) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, mainProfile.id);
    return mainProfile;
  }

  return null;
}

export function getActiveProfileId() {
  return getActiveProfile()?.id ?? null;
}

export function setActiveProfile(profileId) {
  const profile = getProfiles().find(({ id }) => id === profileId);
  if (!profile) throw new Error("Ce profil n’existe pas.");
  localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  return profile;
}

export function createProfileId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const randomParts = new Uint32Array(4);
  crypto.getRandomValues(randomParts);
  return `profile-${Date.now()}-${Array.from(randomParts, (part) => part.toString(36)).join("")}`;
}

export function saveProfile(profile, { setActive = true } = {}) {
  if (!isValidProfile(profile)) {
    throw new Error("Le profil ne contient pas toutes les données requises.");
  }

  const profiles = getProfiles().filter(({ id }) => id !== profile.id);
  profiles.push(profile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  if (setActive) localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  return profile;
}

export function deleteProfile(profileId) {
  const profiles = getProfiles();
  const target = profiles.find(({ id }) => id === profileId);
  if (!target) return false;
  if (target.relationship === "self") throw new Error("Le profil principal ne peut pas être supprimé.");
  const remaining = profiles.filter(({ id }) => id !== profileId);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(remaining));
  if (localStorage.getItem(ACTIVE_PROFILE_KEY) === profileId) {
    const fallback = remaining.find(({ relationship }) => relationship === "self") ?? remaining[0];
    if (fallback) localStorage.setItem(ACTIVE_PROFILE_KEY, fallback.id);
    else localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
  return true;
}

export function loadOnboardingDraft() {
  const draft = readJson(ONBOARDING_DRAFT_KEY, {});
  return draft && typeof draft === "object" && !Array.isArray(draft) ? draft : {};
}

export function saveOnboardingDraft(draft) {
  localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft() {
  localStorage.removeItem(ONBOARDING_DRAFT_KEY);
}

export function clearLocalProfilesForDebug() {
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  localStorage.removeItem(ONBOARDING_DRAFT_KEY);
}
