import fr from "./fr/index.js";

export const LOCALIZATION_VERSION = "tao-localization-fr-1.2.0";
export const DEFAULT_LOCALE = "fr";
export const locales = Object.freeze({ fr });

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isDevelopment() {
  return typeof location !== "undefined" && (DEV_HOSTS.has(location.hostname) || new URLSearchParams(location.search).has("debug"));
}

function interpolate(value, params = {}) {
  return String(value).replace(/\{([\w]+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

function resolvePath(source, path) {
  return String(path).split(".").reduce((value, segment) => value?.[segment], source);
}

export function getTranslation(locale, key, params = {}, options = {}) {
  const dictionary = locales[locale] ?? locales[DEFAULT_LOCALE];
  const value = resolvePath(dictionary, key);
  if (typeof value === "string") return interpolate(value, params);
  if (value !== undefined) return value;
  if (isDevelopment()) console.warn(`[TAO i18n] Missing translation: ${locale}.${key}`);
  return interpolate(options.fallback ?? "Information traditionnelle", params);
}

export function t(key, params = {}, options = {}) {
  return getTranslation(DEFAULT_LOCALE, key, params, options);
}

export function getConcept(domain, id) {
  const value = resolvePath(locales[DEFAULT_LOCALE], `${domain}.${id}`);
  if (value !== undefined) return value;
  if (isDevelopment()) console.warn(`[TAO i18n] Missing translation: ${DEFAULT_LOCALE}.${domain}.${id}`);
  return Object.freeze({ label: "Information traditionnelle", explanation: "Cette donnée n’est pas encore documentée dans le glossaire de TAO." });
}

export function formatDate(value, options = {}) {
  if (!value) return t("common.states.unavailable");
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: options.timeZone ?? "UTC", ...options }).format(date);
}

export function formatLongDate(value, timeZone = "UTC") {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(`${value}T12:00:00Z`));
}

export function formatTime(value) {
  if (!value) return t("profiles.fields.unknownTime");
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : t("common.states.unavailable");
}

export function formatPercent(value) {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 }).format(Number(value) / 100);
}

export function formatPlace(place) {
  if (!place) return t("common.states.unavailable");
  return [place.city, place.region, place.country].filter(Boolean).join(" — ");
}

export function localizeDocument(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of root.querySelectorAll("[data-i18n-aria-label]")) node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  document.documentElement.lang = "fr";
}

export function countTranslationStrings(source = locales[DEFAULT_LOCALE]) {
  let count = 0;
  const visit = (value) => {
    if (typeof value === "string") count += 1;
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(source);
  return count;
}
