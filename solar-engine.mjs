import { getZonedParts, zonedDateIso } from "./time-zone.mjs";

const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const RAD = Math.PI / 180;

function toJulian(epochMs) { return epochMs / DAY_MS - 0.5 + J1970; }
function fromJulian(julian) { return (julian + 0.5 - J1970) * DAY_MS; }
function toDays(epochMs) { return toJulian(epochMs) - J2000; }
function solarMeanAnomaly(days) { return RAD * (357.5291 + 0.98560028 * days); }
function eclipticLongitude(meanAnomaly) {
  const equation = RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly));
  return meanAnomaly + equation + RAD * 102.9372 + Math.PI;
}
function declination(longitude) { return Math.asin(Math.sin(longitude) * Math.sin(RAD * 23.4397)); }
function julianCycle(days, westLongitude) { return Math.round(days - 0.0009 - westLongitude / (2 * Math.PI)); }
function approxTransit(hourAngle, westLongitude, cycle) { return 0.0009 + (hourAngle + westLongitude) / (2 * Math.PI) + cycle; }
function solarTransitJulian(approximate, meanAnomaly, longitude) { return J2000 + approximate + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * longitude); }

export const DAY_PERIODS = Object.freeze(["NIGHT", "DAWN", "MORNING", "DAY", "LATE_AFTERNOON", "TWILIGHT"]);

export function calculateSolarTimes({ date, latitude, longitude }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new TypeError("Date solaire invalide.");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new TypeError("Coordonnées solaires invalides.");
  const reference = Date.parse(`${date}T12:00:00Z`);
  const westLongitude = -longitude * RAD;
  const latitudeRad = latitude * RAD;
  const days = toDays(reference);
  const cycle = julianCycle(days, westLongitude);
  const approximateNoon = approxTransit(0, westLongitude, cycle);
  const meanAnomaly = solarMeanAnomaly(approximateNoon);
  const sunLongitude = eclipticLongitude(meanAnomaly);
  const solarNoonJulian = solarTransitJulian(approximateNoon, meanAnomaly, sunLongitude);
  const sunDeclination = declination(sunLongitude);
  const altitude = -0.833 * RAD;
  const cosineHourAngle = (Math.sin(altitude) - Math.sin(latitudeRad) * Math.sin(sunDeclination)) / (Math.cos(latitudeRad) * Math.cos(sunDeclination));
  if (cosineHourAngle < -1) return Object.freeze({ date, sunrise: null, solarNoon: fromJulian(solarNoonJulian), sunset: null, polar: "day", source: "local-solar" });
  if (cosineHourAngle > 1) return Object.freeze({ date, sunrise: null, solarNoon: fromJulian(solarNoonJulian), sunset: null, polar: "night", source: "local-solar" });
  const hourAngle = Math.acos(cosineHourAngle);
  const sunsetJulian = solarTransitJulian(approxTransit(hourAngle, westLongitude, cycle), meanAnomaly, sunLongitude);
  const sunriseJulian = solarNoonJulian - (sunsetJulian - solarNoonJulian);
  return Object.freeze({ date, sunrise: fromJulian(sunriseJulian), solarNoon: fromJulian(solarNoonJulian), sunset: fromJulian(sunsetJulian), polar: null, source: "local-solar" });
}

function segment(now, start, end) {
  return Math.max(0, Math.min(1, (now - start) / Math.max(1, end - start)));
}

export function determineDayPeriod(epochMs, solarTimes) {
  if (solarTimes.polar === "day") return Object.freeze({ state: "DAY", progress: 0.5 });
  if (solarTimes.polar === "night") return Object.freeze({ state: "NIGHT", progress: 0.5 });
  const sunrise = solarTimes.sunrise;
  const sunset = solarTimes.sunset;
  const dawnStart = sunrise - 60 * 60_000;
  const morningStart = sunrise + 25 * 60_000;
  const dayStart = Math.min(sunrise + 3 * 60 * 60_000, sunset - 4 * 60 * 60_000);
  const lateStart = Math.max(dayStart + 60 * 60_000, sunset - 3 * 60 * 60_000);
  const twilightStart = sunset - 40 * 60_000;
  const nightStart = sunset + 45 * 60_000;
  if (epochMs < dawnStart || epochMs >= nightStart) return Object.freeze({ state: "NIGHT", progress: epochMs < dawnStart ? 0.75 : 0.2 });
  if (epochMs < morningStart) return Object.freeze({ state: "DAWN", progress: segment(epochMs, dawnStart, morningStart) });
  if (epochMs < dayStart) return Object.freeze({ state: "MORNING", progress: segment(epochMs, morningStart, dayStart) });
  if (epochMs < lateStart) return Object.freeze({ state: "DAY", progress: segment(epochMs, dayStart, lateStart) });
  if (epochMs < twilightStart) return Object.freeze({ state: "LATE_AFTERNOON", progress: segment(epochMs, lateStart, twilightStart) });
  return Object.freeze({ state: "TWILIGHT", progress: segment(epochMs, twilightStart, nightStart) });
}

export function getSolarContext({ now = Date.now(), timeZone, latitude, longitude }) {
  const date = zonedDateIso(now, timeZone);
  const solar = calculateSolarTimes({ date, latitude, longitude });
  return Object.freeze({ now, timeZone, local: getZonedParts(now, timeZone), solar, period: determineDayPeriod(now, solar) });
}
