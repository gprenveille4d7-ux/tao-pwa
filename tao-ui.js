import { formatDate, formatLongDate as formatLocalizedLongDate, formatPlace as formatLocalizedPlace } from "./locales/index.js";

export function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.html !== undefined) node.innerHTML = options.html;
  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) node.setAttribute(name, value);
  }
  return node;
}

export function formatBirthDate(value) {
  return formatDate(value);
}

export function formatLongDate(value, timeZone = "UTC") {
  return formatLocalizedLongDate(value, timeZone);
}

export function formatPlace(place) {
  return formatLocalizedPlace(place);
}

export function localDateIso(timeZone, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
