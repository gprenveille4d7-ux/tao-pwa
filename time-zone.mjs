export function getZonedParts(epochMs, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(new Date(epochMs))
    .filter(({ type }) => type !== "literal")
    .map(({ type, value }) => [type, Number(value)]));
}

export function zonedDateIso(epochMs, timeZone) {
  const parts = getZonedParts(epochMs, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function localDateTimeToEpoch(localParts, timeZone) {
  const wallClockUtc = Date.UTC(localParts.year, localParts.month - 1, localParts.day, localParts.hour ?? 0, localParts.minute ?? 0, localParts.second ?? 0);
  let candidate = wallClockUtc;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const zoned = getZonedParts(candidate, timeZone);
    const represented = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
    candidate += wallClockUtc - represented;
  }
  return candidate;
}

export function parseLocalIso(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value ?? "");
  if (!match) return null;
  return localDateTimeToEpoch({
    year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
    hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6] ?? 0),
  }, timeZone);
}
