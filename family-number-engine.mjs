import {
  buildNumericGraph,
  calculateConstellationDensity,
  discoverDeepPatterns,
  FAMILY_PATTERN_ENGINE_VERSION,
} from "./family-pattern-engine.mjs";
import {
  buildEvidenceGraph,
  discoverDeepFamilyStructures,
  FAMILY_DEEP_ENGINE_VERSION,
} from "./family-deep-engine.mjs";
import {
  buildFamilyPatternInventory,
  FAMILY_INVENTORY_ENGINE_VERSION,
} from "./family-inventory-engine.mjs";

export const FAMILY_NUMBER_ENGINE_VERSION = "tao-family-number-3.1.0";
export const familyConstellationEngineVersion = `${FAMILY_NUMBER_ENGINE_VERSION}+${FAMILY_PATTERN_ENGINE_VERSION}+${FAMILY_DEEP_ENGINE_VERSION}+${FAMILY_INVENTORY_ENGINE_VERSION}`;

const DAY_MS = 86_400_000;
const WEEKDAYS_FR = Object.freeze(["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]);
const DIRECT_KINDS = new Set(["day", "month", "dateDigitSum", "timeDigitSum", "dateTimeSum", "dayOfYear"]);
const LEVELS = Object.freeze({ high: "HIGH", medium: "MEDIUM", curiosity: "CURIOSITY" });
const KIND_LABELS = Object.freeze({ day: "jour", month: "mois", dateDigitSum: "somme de la date", timeDigitSum: "somme de l’heure", dateTimeSum: "date + heure", dayOfYear: "jour de l’année" });

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) throw new TypeError(`Date invalide : ${value}`);
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) throw new TypeError(`Date invalide : ${value}`);
  return parts;
}

function isoFromParts({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function utcMs(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addYears(parts, years) {
  const year = parts.year + years;
  return { year, month: parts.month, day: Math.min(parts.day, daysInMonth(year, parts.month)) };
}

function addMonths(parts, months) {
  const total = parts.year * 12 + parts.month - 1 + months;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(parts.day, daysInMonth(year, month)) };
}

export function sumDateDigits(value) {
  parseDate(value);
  return [...value.replace(/\D/g, "")].reduce((sum, digit) => sum + Number(digit), 0);
}

export function sumTimeDigits(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? "")) throw new TypeError(`Heure invalide : ${value}`);
  return [...value.replace(/\D/g, "")].reduce((sum, digit) => sum + Number(digit), 0);
}

export function reduceNumber(value) {
  let current = Math.abs(Number(value));
  if (!Number.isInteger(current)) throw new TypeError("Valeur entière requise.");
  while (current > 9) current = [...String(current)].reduce((sum, digit) => sum + Number(digit), 0);
  return current;
}

export function reverseDigits(value) {
  const normalized = String(Math.abs(Number(value))).replace(/^0+(?=\d)/, "");
  return Number([...normalized].reverse().join(""));
}

export function isPalindrome(value) {
  const normalized = String(Math.abs(Number(value))).replace(/^0+(?=\d)/, "");
  return normalized.length > 1 && normalized === [...normalized].reverse().join("");
}

export function dayOfYear(value) {
  const parts = parseDate(value);
  return Math.floor((utcMs(parts) - Date.UTC(parts.year, 0, 1)) / DAY_MS) + 1;
}

export function exactAgeAtDate(birthDate, eventDate) {
  const birth = parseDate(birthDate);
  const event = parseDate(eventDate);
  if (utcMs(event) < utcMs(birth)) return null;
  let years = event.year - birth.year;
  if (event.month < birth.month || (event.month === birth.month && event.day < birth.day)) years -= 1;
  return years;
}

export function dateInterval(leftDate, rightDate) {
  let start = parseDate(leftDate);
  let end = parseDate(rightDate);
  if (utcMs(start) > utcMs(end)) [start, end] = [end, start];
  let years = end.year - start.year;
  if (utcMs(addYears(start, years)) > utcMs(end)) years -= 1;
  let cursor = addYears(start, years);
  let months = (end.year - cursor.year) * 12 + end.month - cursor.month;
  if (utcMs(addMonths(cursor, months)) > utcMs(end)) months -= 1;
  cursor = addMonths(cursor, months);
  const days = Math.round((utcMs(end) - utcMs(cursor)) / DAY_MS);
  return Object.freeze({ years, months, days, totalDays: Math.round((utcMs(end) - utcMs(start)) / DAY_MS) });
}

export function timeDifference(leftTime, rightTime) {
  const toMinutes = (value) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? "")) throw new TypeError(`Heure invalide : ${value}`);
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  return Math.abs(toMinutes(leftTime) - toMinutes(rightTime));
}

export function deriveDateSignature(profile) {
  const { year, month, day } = parseDate(profile.birthDate);
  const dateDigitSum = sumDateDigits(profile.birthDate);
  const timeKnown = profile.birthTimeKnown === true && typeof profile.birthTime === "string";
  const timeDigitSum = timeKnown ? sumTimeDigits(profile.birthTime) : null;
  return Object.freeze({
    profileId: profile.id,
    displayName: profile.firstName,
    date: profile.birthDate,
    time: timeKnown ? profile.birthTime : null,
    day, month, year,
    dateDigitSum,
    dateReduced: reduceNumber(dateDigitSum),
    hour: timeKnown ? Number(profile.birthTime.slice(0, 2)) : null,
    minutes: timeKnown ? Number(profile.birthTime.slice(3)) : null,
    timeDigitSum,
    timeReduced: timeKnown ? reduceNumber(timeDigitSum) : null,
    dateTimeSum: timeKnown ? dateDigitSum + timeDigitSum : null,
    dateTimeReduced: timeKnown ? reduceNumber(dateDigitSum + timeDigitSum) : null,
    dayOfYear: dayOfYear(profile.birthDate),
    weekday: WEEKDAYS_FR[new Date(`${profile.birthDate}T00:00:00Z`).getUTCDay()],
  });
}

export function detectDateMirror(left, right) {
  return left.day === right.month && left.month === right.day && (left.day !== left.month || right.day !== right.month);
}

function participantsKey(ids) {
  return [...new Set(ids)].sort().join(".");
}

function observation({ type, category, participants = [], eventIds = [], values = [], facts = [], calculations = [], score, transformations = 0, clusterKey = null }) {
  const uniqueValues = [...new Set(values.filter((value) => value !== null && value !== undefined).map(Number))];
  const idBasis = `${type}|${participantsKey(participants)}|${eventIds.sort().join(".")}|${uniqueValues.join(".")}|${calculations.join("|")}`;
  const hash = [...idBasis].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36);
  return Object.freeze({ id: `family_obs_${hash}`, type, category, participantIds: Object.freeze([...new Set(participants)].sort()), eventIds: Object.freeze([...new Set(eventIds)].sort()), values: Object.freeze(uniqueValues), facts: Object.freeze(facts), calculations: Object.freeze(calculations), transformations, interestScore: score, interest: score >= 82 ? LEVELS.high : score >= 62 ? LEVELS.medium : LEVELS.curiosity, clusterKey: clusterKey ?? `${type}.${participantsKey(participants)}` });
}

export function detectSharedValue(signatures, kind) {
  if (!DIRECT_KINDS.has(kind)) return [];
  const groups = new Map();
  signatures.forEach((signature) => {
    const value = signature[kind];
    if (value === null || value === undefined) return;
    const list = groups.get(value) ?? [];
    list.push(signature);
    groups.set(value, list);
  });
  return [...groups.entries()].flatMap(([value, entries]) => entries.length >= 2 ? [observation({
    type: "SHARED_VALUE", category: kind.includes("time") || kind === "dateTimeSum" ? "dates_times" : "recurring",
    participants: entries.map(({ profileId }) => profileId), values: [value],
    facts: entries.map(({ profileId, displayName }) => `${profileId}.${kind}=${value}|${displayName}`),
    calculations: entries.map(({ displayName }) => `${displayName} · ${KIND_LABELS[kind]} = ${value}`),
    score: Math.min(88, 68 + entries.length * 5 + (kind === "dateDigitSum" || kind === "dateTimeSum" ? 6 : 0)),
    clusterKey: `shared.${participantsKey(entries.map(({ profileId }) => profileId))}.${value}`,
  })] : []);
}

export function detectSimpleSum(leftValue, rightValue, targetValue) {
  return Number(leftValue) + Number(rightValue) === Number(targetValue);
}

export function detectSimpleDifference(leftValue, rightValue, targetValue) {
  return Math.abs(Number(leftValue) - Number(rightValue)) === Number(targetValue);
}

export function detectCrossGeneration(signatures, roles = {}) {
  const parents = signatures.filter(({ profileId }) => roles[profileId] === "parent");
  const children = signatures.filter(({ profileId }) => roles[profileId] === "child");
  const values = new Set(parents.flatMap(({ day }) => day));
  return [...values].flatMap((value) => {
    const parentMatches = parents.filter(({ day }) => day === value);
    const childMatches = children.filter(({ month }) => month === value);
    if (!parentMatches.length || !childMatches.length) return [];
    const people = [...parentMatches, ...childMatches];
    return [observation({
      type: "CROSS_GENERATION_VALUE", category: "generations", participants: people.map(({ profileId }) => profileId), values: [value],
      facts: [...parentMatches.map(({ profileId }) => `${profileId}.day=${value}`), ...childMatches.map(({ profileId }) => `${profileId}.month=${value}`)],
      calculations: [...parentMatches.map(({ displayName }) => `${displayName} · jour = ${value}`), ...childMatches.map(({ displayName }) => `${displayName} · mois = ${value}`)],
      score: Math.min(98, 84 + people.length * 3), clusterKey: `generation.${value}`,
    })];
  });
}

export function scoreObservation(candidate) {
  const base = { DATE_MIRROR: 94, ORDINAL_MIRROR: 88, MULTI_SIGNATURE_MATCH: 97, CROSS_GENERATION_VALUE: 88, EVENT_AGE_MATCH: 89, EVENT_SIGNATURE_MATCH: 74, INTERVAL_MATCHES_SIGNATURE: 86, NUMBER_MIRROR: 78, SHARED_VALUE: 70, SIMPLE_ARITHMETIC: 68, PALINDROME_VALUE: 56, SIMPLE_MULTIPLE: 64, WEEKDAY_MATCH: 25 }[candidate.type] ?? 40;
  const peopleBonus = Math.min(10, Math.max(0, (candidate.participantIds?.length ?? 0) - 2) * 3);
  return Math.max(0, Math.min(100, base + peopleBonus - Math.max(0, (candidate.transformations ?? 0) - 1) * 8));
}

function replaceScore(item) {
  const interestScore = scoreObservation(item);
  return Object.freeze({ ...item, interestScore, interest: interestScore >= 82 ? LEVELS.high : interestScore >= 62 ? LEVELS.medium : LEVELS.curiosity });
}

export function clusterObservations(observations) {
  const groups = new Map();
  for (const item of observations) {
    const key = item.clusterKey ?? item.id;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return Object.freeze([...groups.entries()].map(([key, items]) => Object.freeze({
    id: `family_cluster_${key.replace(/[^a-z0-9.]+/gi, "_")}`,
    key,
    observations: Object.freeze(items.sort((a, b) => b.interestScore - a.interestScore)),
    interestScore: Math.min(100, Math.max(...items.map(({ interestScore }) => interestScore)) + Math.min(8, (items.length - 1) * 2)),
    participantIds: Object.freeze([...new Set(items.flatMap(({ participantIds }) => participantIds))]),
    values: Object.freeze([...new Set(items.flatMap(({ values }) => values))]),
  })).sort((a, b) => b.interestScore - a.interestScore));
}

function consolidateClusters(clusters) {
  return Object.freeze(clusters.map((cluster) => {
    const representative = cluster.observations[0];
    const interestScore = cluster.interestScore;
    return Object.freeze({
      ...representative,
      participantIds: Object.freeze([...new Set(cluster.observations.flatMap(({ participantIds }) => participantIds))].sort()),
      eventIds: Object.freeze([...new Set(cluster.observations.flatMap(({ eventIds }) => eventIds))].sort()),
      values: Object.freeze([...new Set(cluster.observations.flatMap(({ values }) => values))]),
      facts: Object.freeze([...new Set(cluster.observations.flatMap(({ facts }) => facts))]),
      calculations: Object.freeze([...new Set(cluster.observations.flatMap(({ calculations }) => calculations))]),
      interestScore,
      interest: interestScore >= 82 ? LEVELS.high : interestScore >= 62 ? LEVELS.medium : LEVELS.curiosity,
      clusterId: cluster.id,
      clusterSize: cluster.observations.length,
    });
  }));
}

function eventSignature(event) {
  const dateDigitSum = sumDateDigits(event.date);
  return { eventId: event.id, date: event.date, day: parseDate(event.date).day, month: parseDate(event.date).month, dateDigitSum, dateReduced: reduceNumber(dateDigitSum), timeDigitSum: event.time ? sumTimeDigits(event.time) : null };
}

function multiSignatureMatches(signatures) {
  const groups = new Map();
  for (const signature of signatures) {
    if (signature.timeDigitSum === null) continue;
    const key = `${signature.dateDigitSum}.${signature.timeDigitSum}.${signature.dateTimeSum}`;
    const entries = groups.get(key) ?? [];
    entries.push(signature);
    groups.set(key, entries);
  }
  return [...groups.entries()].flatMap(([key, entries]) => entries.length >= 2 ? [observation({
    type: "MULTI_SIGNATURE_MATCH", category: "dates_times", participants: entries.map(({ profileId }) => profileId), values: key.split(".").map(Number),
    facts: entries.flatMap(({ profileId, dateDigitSum, timeDigitSum, dateTimeSum }) => [`${profileId}.dateDigitSum=${dateDigitSum}`, `${profileId}.timeDigitSum=${timeDigitSum}`, `${profileId}.dateTimeSum=${dateTimeSum}`]),
    calculations: entries.map(({ displayName, dateDigitSum, timeDigitSum, dateTimeSum }) => `${displayName} · date ${dateDigitSum} + heure ${timeDigitSum} = ${dateTimeSum}`),
    score: 97, clusterKey: `signature.${participantsKey(entries.map(({ profileId }) => profileId))}`,
  })] : []);
}

function pairObservations(signatures) {
  const found = [];
  for (let leftIndex = 0; leftIndex < signatures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < signatures.length; rightIndex += 1) {
      const left = signatures[leftIndex];
      const right = signatures[rightIndex];
      const participants = [left.profileId, right.profileId];
      if (detectDateMirror(left, right)) found.push(observation({ type: "DATE_MIRROR", category: "mirrors", participants, values: [left.day, left.month], facts: [`${left.profileId}.day=${left.day}`, `${left.profileId}.month=${left.month}`, `${right.profileId}.day=${right.day}`, `${right.profileId}.month=${right.month}`], calculations: [`${String(left.day).padStart(2, "0")}/${String(left.month).padStart(2, "0")} ↔ ${String(right.day).padStart(2, "0")}/${String(right.month).padStart(2, "0")}`], score: 94 }));
      const directPairs = [["day", left.day, right.day], ["dayOfYear", left.dayOfYear, right.dayOfYear], ["dateDigitSum", left.dateDigitSum, right.dateDigitSum], ["timeDigitSum", left.timeDigitSum, right.timeDigitSum], ["dateTimeSum", left.dateTimeSum, right.dateTimeSum]];
      for (const [kind, leftValue, rightValue] of directPairs) {
        if (leftValue !== null && rightValue !== null && leftValue >= 10 && rightValue >= 10 && leftValue !== rightValue && reverseDigits(leftValue) === rightValue) found.push(observation({ type: kind === "dayOfYear" ? "ORDINAL_MIRROR" : "NUMBER_MIRROR", category: "mirrors", participants, values: [leftValue, rightValue], facts: [`${left.profileId}.${kind}=${leftValue}`, `${right.profileId}.${kind}=${rightValue}`], calculations: [`${leftValue} ↔ ${rightValue}`], score: kind === "dayOfYear" ? 88 : 76, transformations: 1 }));
        const leftText = String(leftValue);
        const rightText = String(rightValue);
        const ordinalSymmetry = kind === "dayOfYear" && leftText.length === 3 && rightText.length === 3
          && isPalindrome(leftValue) && isPalindrome(rightValue)
          && leftText[0] === rightText[1] && leftText[1] === rightText[0];
        if (ordinalSymmetry) found.push(observation({ type: "ORDINAL_MIRROR", category: "mirrors", participants, values: [leftValue, rightValue], facts: [`${left.profileId}.dayOfYear=${leftValue}`, `${right.profileId}.dayOfYear=${rightValue}`], calculations: [`Jour ordinal ${leftValue} ↔ ${rightValue} · deux palindromes aux chiffres alternés`], score: 90, transformations: 1 }));
      }
      const targets = [...new Set([left.dateDigitSum, right.dateDigitSum, left.timeDigitSum, right.timeDigitSum, left.dateTimeSum, right.dateTimeSum].filter((value) => Number.isInteger(value)))];
      for (const target of targets) {
        if (detectSimpleSum(left.day, right.day, target)) found.push(observation({ type: "SIMPLE_ARITHMETIC", category: "curiosities", participants, values: [left.day, right.day, target], facts: [`${left.profileId}.day=${left.day}`, `${right.profileId}.day=${right.day}`, `target=${target}`], calculations: [`${left.day} + ${right.day} = ${target}`], score: 72, transformations: 1, clusterKey: `arithmetic.${participantsKey(participants)}.${target}` }));
        if (detectSimpleDifference(left.day, right.day, target) && target > 0) found.push(observation({ type: "SIMPLE_ARITHMETIC", category: "curiosities", participants, values: [left.day, right.day, target], facts: [`${left.profileId}.day=${left.day}`, `${right.profileId}.day=${right.day}`, `target=${target}`], calculations: [`|${left.day} − ${right.day}| = ${target}`], score: 72, transformations: 1, clusterKey: `arithmetic.${participantsKey(participants)}.${target}` }));
      }
      if (left.time && right.time) {
        const minutes = timeDifference(left.time, right.time);
        const matches = signatures.filter(({ dateDigitSum, profileId }) => dateDigitSum === minutes && !participants.includes(profileId));
        if (matches.length) found.push(observation({ type: "INTERVAL_MATCHES_SIGNATURE", category: "dates_times", participants: [...participants, ...matches.map(({ profileId }) => profileId)], values: [minutes], facts: [`timeInterval=${minutes}`, ...matches.map(({ profileId }) => `${profileId}.dateDigitSum=${minutes}`)], calculations: [`${left.time} → ${right.time} = ${minutes} minutes`, ...matches.map(({ displayName }) => `${displayName} · somme de la date = ${minutes}`)], score: 90 }));
      }
    }
  }
  return found;
}

function simpleMultipleObservations(signatures) {
  const direct = signatures.flatMap((signature) => [
    { signature, kind: "day", value: signature.day },
    { signature, kind: "month", value: signature.month },
  ]);
  const found = [];
  for (let leftIndex = 0; leftIndex < direct.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < direct.length; rightIndex += 1) {
      const left = direct[leftIndex];
      const right = direct[rightIndex];
      if (left.signature.profileId === right.signature.profileId || left.value === right.value) continue;
      const larger = left.value > right.value ? left : right;
      const smaller = left.value > right.value ? right : left;
      const multiplier = larger.value / smaller.value;
      if (![2, 3].includes(multiplier)) continue;
      found.push(observation({
        type: "SIMPLE_MULTIPLE",
        category: "generations",
        participants: [left.signature.profileId, right.signature.profileId],
        values: [smaller.value, larger.value],
        facts: [`${smaller.signature.profileId}.${smaller.kind}=${smaller.value}`, `${larger.signature.profileId}.${larger.kind}=${larger.value}`],
        calculations: [`${larger.value} = ${multiplier} × ${smaller.value}`],
        score: 64,
        transformations: 1,
        clusterKey: `multiple.${smaller.value}.${larger.value}`,
      }));
    }
  }
  return found;
}

function buildPairIntervals(signatures) {
  const intervals = [];
  for (let leftIndex = 0; leftIndex < signatures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < signatures.length; rightIndex += 1) {
      const left = signatures[leftIndex];
      const right = signatures[rightIndex];
      intervals.push(Object.freeze({
        participantIds: Object.freeze([left.profileId, right.profileId]),
        birthDate: dateInterval(left.date, right.date),
        birthTimeMinutes: left.time && right.time ? timeDifference(left.time, right.time) : null,
      }));
    }
  }
  return Object.freeze(intervals);
}

function palindromeObservations(signatures) {
  const entries = signatures.flatMap((signature) => [
    { signature, kind: "day", value: signature.day },
    { signature, kind: "month", value: signature.month },
    { signature, kind: "dayOfYear", value: signature.dayOfYear },
    { signature, kind: "dateDigitSum", value: signature.dateDigitSum },
    { signature, kind: "timeDigitSum", value: signature.timeDigitSum },
    { signature, kind: "dateTimeSum", value: signature.dateTimeSum },
  ]).filter(({ value }) => value !== null && isPalindrome(value));
  return entries.map(({ signature, kind, value }) => observation({ type: "PALINDROME_VALUE", category: "curiosities", participants: [signature.profileId], values: [value], facts: [`${signature.profileId}.${kind}=${value}`], calculations: [`${signature.displayName} · ${KIND_LABELS[kind]} = ${value}, palindrome`], score: kind === "dayOfYear" ? 62 : 54, transformations: 1 }));
}

function eventObservations(signatures, events) {
  const found = [];
  for (const event of events) {
    const eventSig = eventSignature(event);
    for (const profileId of event.profileIds) {
      const signature = signatures.find((entry) => entry.profileId === profileId);
      if (!signature) continue;
      const age = exactAgeAtDate(signature.date, event.date);
      if (age !== null && age === signature.dateDigitSum) found.push(observation({ type: "EVENT_AGE_MATCH", category: "events", participants: [profileId], eventIds: [event.id], values: [age], facts: [`${profileId}.dateDigitSum=${signature.dateDigitSum}`, `${event.id}.age.${profileId}=${age}`], calculations: [`${signature.displayName} · âge lors de « ${event.title} » = ${age}`, `Somme de sa date = ${signature.dateDigitSum}`], score: 92 }));
      if ([signature.day, signature.month, signature.dateDigitSum, signature.timeDigitSum, signature.dateTimeSum].includes(eventSig.day) || [signature.dateDigitSum, signature.dateTimeSum].includes(eventSig.dateDigitSum)) found.push(observation({ type: "EVENT_SIGNATURE_MATCH", category: "events", participants: [profileId], eventIds: [event.id], values: [eventSig.day, eventSig.dateDigitSum].filter((value) => [signature.day, signature.month, signature.dateDigitSum, signature.timeDigitSum, signature.dateTimeSum].includes(value)), facts: [`event.${event.id}.day=${eventSig.day}`, `event.${event.id}.dateDigitSum=${eventSig.dateDigitSum}`], calculations: [`${event.title} · jour ${eventSig.day}, somme ${eventSig.dateDigitSum}`], score: 76 }));
    }
  }
  return found;
}

function editorialPriority(item) {
  return ({
    MULTI_EVENT_AGE_ECHO: 120,
    SIBLING_MULTI_DOMAIN_ECHO: 118,
    CROSS_GENERATION_TRANSFER: 116,
    CROSS_GENERATION_VALUE: 114,
    DATE_MIRROR: 112,
    ORDINAL_MIRROR: 110,
    MULTI_SIGNATURE_MATCH: 108,
    INTERVAL_MATCHES_SIGNATURE: 106,
    PARENT_PAIR_CHILD_SUM: 104,
    SHARED_BIRTH_PLACE: 96,
  })[item.type] ?? item.interestScore;
}

export function analyzeFamilyConstellation({ profiles, events = [], roles = {} }) {
  const safeProfiles = [...new Map((profiles ?? []).filter((profile) => profile?.id && profile?.birthDate).map((profile) => [profile.id, profile])).values()];
  if (safeProfiles.length < 2) throw new TypeError("Deux profils minimum sont nécessaires.");
  const signatures = Object.freeze(safeProfiles.map(deriveDateSignature));
  const intervals = buildPairIntervals(signatures);
  const candidates = [
    ...multiSignatureMatches(signatures),
    ...["day", "month", "dateDigitSum", "timeDigitSum", "dateTimeSum", "dayOfYear"].flatMap((kind) => detectSharedValue(signatures, kind)),
    ...pairObservations(signatures),
    ...simpleMultipleObservations(signatures),
    ...detectCrossGeneration(signatures, roles),
    ...palindromeObservations(signatures),
    ...eventObservations(signatures, events),
  ].map(replaceScore);
  const unique = [...new Map(candidates.map((item) => [`${item.type}|${item.participantIds.join(".")}|${item.values.join(".")}|${item.calculations.join(".")}`, item])).values()];
  const clusters = clusterObservations(unique);
  const selectedObservations = Object.freeze(unique.filter(({ interestScore }) => interestScore >= 48).sort((a, b) => b.interestScore - a.interestScore).slice(0, 24));
  const clusteredObservations = Object.freeze(consolidateClusters(clusters).filter(({ interestScore }) => interestScore >= 48).slice(0, 24));
  const numericGraph = buildNumericGraph({ signatures, intervals });
  const discoveredPatterns = discoverDeepPatterns({ graph: numericGraph, observations: unique });
  const deep = discoverDeepFamilyStructures({ profiles: safeProfiles, signatures, roles, events });
  const displayObservations = Object.freeze([...deep.observations, ...discoveredPatterns, ...clusteredObservations]
    .filter((item, index, all) => all.findIndex(({ id }) => id === item.id) === index)
    .sort((left, right) => editorialPriority(right) - editorialPriority(left) || right.interestScore - left.interestScore || left.id.localeCompare(right.id))
    .slice(0, 36));
  const patternInventory = buildFamilyPatternInventory({ observations: displayObservations, signatures, profiles: safeProfiles, roles });
  const density = calculateConstellationDensity(discoveredPatterns, clusteredObservations);
  const evidenceGraph = buildEvidenceGraph(displayObservations, deep.familyGraph);
  const sections = Object.freeze({
    parents: Object.freeze(displayObservations.filter(({ participantIds = [] }) => participantIds.length >= 2 && participantIds.every((id) => ["parent", "partner"].includes(roles[id])))),
    parentChild: Object.freeze(displayObservations.filter(({ participantIds = [] }) => participantIds.some((id) => roles[id] === "parent") && participantIds.some((id) => roles[id] === "child"))),
    siblings: Object.freeze(displayObservations.filter(({ participantIds = [] }) => participantIds.length >= 2 && participantIds.every((id) => ["child", "sibling", "grandchild"].includes(roles[id])))),
    generations: Object.freeze(displayObservations.filter(({ category }) => category === "generations")),
    mirrors: Object.freeze(displayObservations.filter(({ category, type }) => category === "mirrors" || type.includes("MIRROR"))),
    events: Object.freeze(displayObservations.filter(({ category }) => category === "events")),
    places: Object.freeze(displayObservations.filter(({ category }) => category === "places")),
    chronology: Object.freeze(displayObservations.filter(({ category }) => category === "chronology")),
  });
  return Object.freeze({
    version: familyConstellationEngineVersion,
    signatures,
    intervals,
    numericGraph,
    discoveredPatterns,
    density,
    deepAnalysis: deep,
    familyGraph: deep.familyGraph,
    evidenceGraph,
    sections,
    candidates: Object.freeze(unique.sort((a, b) => b.interestScore - a.interestScore)),
    discardedObservations: Object.freeze([...unique.filter(({ interestScore }) => interestScore < 48), ...deep.rejected]),
    clusters,
    selectedObservations,
    clusteredObservations,
    displayObservations,
    patternInventory,
    primaryObservations: Object.freeze(displayObservations.slice(0, Math.min(5, displayObservations.length))),
    topInsights: Object.freeze(patternInventory.patterns.filter(({ importance }) => importance !== "curiosity").slice(0, 8)),
    summary: Object.freeze({ total: patternInventory.total, major: patternInventory.importance.major, strong: patternInventory.importance.major, notable: patternInventory.importance.notable, curiosity: patternInventory.importance.curiosity }),
  });
}
