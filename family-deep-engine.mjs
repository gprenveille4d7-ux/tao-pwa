export const FAMILY_DEEP_ENGINE_VERSION = "tao-family-deep-3.1.0";

const DAY_MS = 86_400_000;
const LEVELS = Object.freeze({ direct: "DIRECT", strong: "STRONG", notable: "NOTABLE", secondary: "SECONDARY", exploratory: "EXPLORATORY" });

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) throw new TypeError(`Date invalide : ${value}`);
  const result = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (date.getUTCFullYear() !== result.year || date.getUTCMonth() + 1 !== result.month || date.getUTCDate() !== result.day) throw new TypeError(`Date invalide : ${value}`);
  return result;
}

function dateMs(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function exactAgeDetailed(birthDate, eventDate) {
  const birth = parseDate(birthDate);
  const event = parseDate(eventDate);
  if (dateMs(event) < dateMs(birth)) return null;
  let years = event.year - birth.year;
  let months = event.month - birth.month;
  let days = event.day - birth.day;
  if (days < 0) {
    months -= 1;
    const previousMonth = event.month === 1 ? 12 : event.month - 1;
    const previousYear = event.month === 1 ? event.year - 1 : event.year;
    days += daysInMonth(previousYear, previousMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return Object.freeze({ years, months, days });
}

export function isoWeekNumber(dateValue) {
  const parts = parseDate(dateValue);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / DAY_MS) + 1) / 7);
}

function seasonForMonth(month) {
  if ([12, 1, 2].includes(month)) return "hiver";
  if ([3, 4, 5].includes(month)) return "printemps";
  if ([6, 7, 8].includes(month)) return "été";
  return "automne";
}

export function extendFamilySignature(signature, profile) {
  const yearText = String(signature.year).padStart(4, "0");
  const timeKnown = typeof signature.time === "string";
  const minutesSinceMidnight = timeKnown ? signature.hour * 60 + signature.minutes : null;
  return Object.freeze({
    ...signature,
    century: Math.floor((signature.year - 1) / 100) + 1,
    yearLastTwo: Number(yearText.slice(-2)),
    dateDigits: Object.freeze([...profile.birthDate.replace(/\D/g, "")].map(Number)),
    dayMonthSum: signature.day + signature.month,
    dayMonthDifference: Math.abs(signature.day - signature.month),
    dayMonthProduct: signature.day * signature.month,
    isoWeek: isoWeekNumber(profile.birthDate),
    quarter: Math.ceil(signature.month / 3),
    civilSeason: seasonForMonth(signature.month),
    hourMinuteSum: timeKnown ? signature.hour + signature.minutes : null,
    hourMinuteDifference: timeKnown ? Math.abs(signature.hour - signature.minutes) : null,
    minutesSinceMidnight,
    place: profile.birthPlace ? Object.freeze({
      id: String(profile.birthPlace.id ?? ""),
      city: String(profile.birthPlace.city ?? ""),
      region: String(profile.birthPlace.region ?? ""),
      country: String(profile.birthPlace.country ?? ""),
      latitude: Number(profile.birthPlace.latitude),
      longitude: Number(profile.birthPlace.longitude),
      timezone: String(profile.birthPlace.timezone ?? ""),
    }) : null,
  });
}

function relationshipEdge(type, sourceId, targetId, evidence = []) {
  const pair = [sourceId, targetId].sort();
  return Object.freeze({ id: `family_relation_${stableHash(`${type}|${pair.join("|")}`)}`, type, sourceId, targetId, evidence: Object.freeze(evidence) });
}

export function buildFamilyGraph({ profiles, roles = {}, events = [] }) {
  const nodes = profiles.map((profile) => Object.freeze({
    id: profile.id,
    type: "PERSON",
    label: profile.firstName,
    role: roles[profile.id] ?? "other",
    generation: ["grandparent"].includes(roles[profile.id]) ? -1 : ["child", "grandchild"].includes(roles[profile.id]) ? 1 : 0,
  }));
  const edges = [];
  const placeNodes = new Map();
  const ensurePlace = (place) => {
    if (!place) return null;
    const label = typeof place === "string" ? place.trim() : String(place.label || [place.city, place.country].filter(Boolean).join(", ")).trim();
    if (!label) return null;
    const rawId = typeof place === "object" && place.id ? place.id : label.toLocaleLowerCase("fr-FR");
    const id = `place_${stableHash(rawId)}`;
    if (!placeNodes.has(id)) placeNodes.set(id, Object.freeze({ id, type: "PLACE", label, latitude: Number.isFinite(Number(place?.latitude)) ? Number(place.latitude) : null, longitude: Number.isFinite(Number(place?.longitude)) ? Number(place.longitude) : null }));
    return id;
  };
  for (const profile of profiles) {
    const placeId = ensurePlace(profile.birthPlace);
    if (placeId) edges.push(relationshipEdge("BORN_AT", profile.id, placeId));
  }
  const parents = nodes.filter(({ role }) => role === "parent");
  const children = nodes.filter(({ role }) => role === "child");
  const grandparents = nodes.filter(({ role }) => role === "grandparent");
  const grandchildren = nodes.filter(({ role }) => role === "grandchild");
  const partners = nodes.filter(({ role }) => ["parent", "partner"].includes(role));
  for (let index = 0; index < partners.length; index += 1) for (let other = index + 1; other < partners.length; other += 1) edges.push(relationshipEdge("PARTNER", partners[index].id, partners[other].id));
  for (const parent of parents) for (const child of children) edges.push(relationshipEdge("PARENT_CHILD", parent.id, child.id));
  for (let index = 0; index < children.length; index += 1) for (let other = index + 1; other < children.length; other += 1) edges.push(relationshipEdge("SIBLING", children[index].id, children[other].id));
  for (const grandparent of grandparents) for (const descendant of [...children, ...grandchildren]) edges.push(relationshipEdge("GRANDPARENT_DESCENDANT", grandparent.id, descendant.id));
  for (const event of events) {
    nodes.push(Object.freeze({ id: event.id, type: "EVENT", label: event.title, eventType: event.type, date: event.date, time: event.time ?? null }));
    for (const profileId of event.profileIds ?? []) if (profiles.some(({ id }) => id === profileId)) edges.push(relationshipEdge("PARTICIPATES_IN", profileId, event.id, [event.date]));
    const placeId = ensurePlace(event.place);
    if (placeId) edges.push(relationshipEdge("OCCURRED_AT", event.id, placeId, [event.date]));
  }
  nodes.push(...placeNodes.values());
  return Object.freeze({ version: FAMILY_DEEP_ENGINE_VERSION, nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}

function forceFromScore(score) {
  if (score >= 92) return LEVELS.direct;
  if (score >= 82) return LEVELS.strong;
  if (score >= 68) return LEVELS.notable;
  if (score >= 54) return LEVELS.secondary;
  return LEVELS.exploratory;
}

function deepObservation({ type, category, participantIds = [], eventIds = [], values = [], facts = [], calculations = [], evidenceIds = [], score = 60, complexityCost = 0, independenceGroups = [], sourceDomains = [] }) {
  const basis = `${type}|${participantIds.sort().join(".")}|${eventIds.sort().join(".")}|${values.join(".")}|${calculations.join("|")}`;
  const adjusted = Math.max(0, Math.min(100, Math.round(score - complexityCost * 8)));
  return Object.freeze({
    id: `family_deep_${stableHash(basis)}`,
    type,
    category,
    participantIds: Object.freeze(unique(participantIds).sort()),
    eventIds: Object.freeze(unique(eventIds).sort()),
    values: Object.freeze(unique(values).map(Number).filter(Number.isFinite)),
    facts: Object.freeze(unique(facts)),
    calculations: Object.freeze(unique(calculations)),
    evidenceIds: Object.freeze(unique(evidenceIds)),
    complexityCost,
    transformations: complexityCost,
    independenceGroups: Object.freeze(unique(independenceGroups)),
    independentPathCount: unique(independenceGroups).length || 1,
    sourceCategories: Object.freeze(unique(sourceDomains)),
    sourceDiversity: unique(sourceDomains).length || 1,
    interestScore: adjusted,
    force: forceFromScore(adjusted),
    interest: adjusted >= 82 ? "HIGH" : adjusted >= 62 ? "MEDIUM" : "CURIOSITY",
    clusterKey: `deep.${type}.${values[0] ?? "none"}`,
  });
}

function samePlaceObservations(signatures) {
  const groups = new Map();
  for (const signature of signatures) {
    const key = signature.place?.id || [signature.place?.city, signature.place?.country].filter(Boolean).join("|").toLocaleLowerCase("fr-FR");
    if (!key) continue;
    const members = groups.get(key) ?? [];
    members.push(signature);
    groups.set(key, members);
  }
  return [...groups.values()].flatMap((members) => members.length < 2 ? [] : [deepObservation({
    type: "SHARED_BIRTH_PLACE",
    category: "places",
    participantIds: members.map(({ profileId }) => profileId),
    facts: members.map(({ profileId, place }) => `${profileId}.birthPlace=${place.city}|${place.country}`),
    calculations: [`${members.map(({ displayName }) => displayName).join(" et ")} · même lieu de naissance : ${members[0].place.city}, ${members[0].place.country}`],
    evidenceIds: members.map(({ profileId }) => `evidence.${profileId}.birthPlace`),
    score: 86,
    independenceGroups: members.map(({ profileId }) => `${profileId}:place`),
    sourceDomains: ["place"],
  })]);
}

function doubleEventAgeEchoes(signatures, events) {
  const result = [];
  for (const event of events) {
    const matches = [];
    for (const signature of signatures) {
      if (!(event.profileIds ?? []).includes(signature.profileId)) continue;
      const age = exactAgeDetailed(signature.date, event.date);
      if (age && age.years === signature.dateDigitSum) matches.push({ signature, age });
    }
    if (matches.length < 2) continue;
    result.push(deepObservation({
      type: "MULTI_EVENT_AGE_ECHO",
      category: "events",
      participantIds: matches.map(({ signature }) => signature.profileId),
      eventIds: [event.id],
      values: matches.map(({ age }) => age.years),
      facts: matches.flatMap(({ signature, age }) => [`${signature.profileId}.dateDigitSum=${signature.dateDigitSum}`, `${event.id}.age.${signature.profileId}=${age.years}`]),
      calculations: matches.flatMap(({ signature, age }) => [`${signature.displayName} avait ${age.years} ans, ${age.months} mois et ${age.days} jours`, `Somme de la date de ${signature.displayName} = ${signature.dateDigitSum}`]),
      evidenceIds: matches.flatMap(({ signature }) => [`evidence.${signature.profileId}.dateDigitSum`, `evidence.${event.id}.age.${signature.profileId}`]),
      score: 99,
      independenceGroups: matches.map(({ signature }) => `${signature.profileId}:event-age:${event.id}`),
      sourceDomains: ["date", "event", "age"],
    }));
  }
  return result;
}

function parentPairChildEchoes(signatures, roles) {
  const parents = signatures.filter(({ profileId }) => roles[profileId] === "parent");
  const children = signatures.filter(({ profileId }) => roles[profileId] === "child");
  if (parents.length < 2 || !children.length) return [];
  const directKinds = ["day", "month", "dateDigitSum", "timeDigitSum"];
  const result = [];
  for (let leftIndex = 0; leftIndex < parents.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < parents.length; rightIndex += 1) {
      const left = parents[leftIndex];
      const right = parents[rightIndex];
      for (const child of children) {
        for (const kind of directKinds) {
          const leftValue = left[kind];
          const rightValue = right[kind];
          if (!Number.isInteger(leftValue) || !Number.isInteger(rightValue)) continue;
          for (const childKind of directKinds) {
            const childValue = child[childKind];
            if (!Number.isInteger(childValue) || leftValue + rightValue !== childValue) continue;
            result.push(deepObservation({
              type: "PARENT_PAIR_CHILD_SUM",
              category: "generations",
              participantIds: [left.profileId, right.profileId, child.profileId],
              values: [leftValue, rightValue, childValue],
              facts: [`${left.profileId}.${kind}=${leftValue}`, `${right.profileId}.${kind}=${rightValue}`, `${child.profileId}.${childKind}=${childValue}`],
              calculations: [`${left.displayName} ${leftValue} + ${right.displayName} ${rightValue} = ${child.displayName} ${childValue}`],
              evidenceIds: [`evidence.${left.profileId}.${kind}`, `evidence.${right.profileId}.${kind}`, `evidence.${child.profileId}.${childKind}`],
              score: kind === childKind ? 91 : 82,
              complexityCost: 1,
              independenceGroups: [`${left.profileId}:${kind}`, `${right.profileId}:${kind}`, `${child.profileId}:${childKind}`],
              sourceDomains: ["generation", "date"],
            }));
          }
        }
      }
    }
  }
  return result;
}

function siblingEchoes(signatures, roles) {
  const children = signatures.filter(({ profileId }) => ["child", "sibling", "grandchild"].includes(roles[profileId]));
  const result = [];
  for (let index = 0; index < children.length; index += 1) {
    for (let other = index + 1; other < children.length; other += 1) {
      const left = children[index];
      const right = children[other];
      const shared = ["dateDigitSum", "timeDigitSum", "dateTimeSum"].filter((kind) => Number.isInteger(left[kind]) && left[kind] === right[kind]);
      if (shared.length < 2) continue;
      result.push(deepObservation({
        type: "SIBLING_MULTI_DOMAIN_ECHO",
        category: "siblings",
        participantIds: [left.profileId, right.profileId],
        values: shared.map((kind) => left[kind]),
        facts: shared.flatMap((kind) => [`${left.profileId}.${kind}=${left[kind]}`, `${right.profileId}.${kind}=${right[kind]}`]),
        calculations: shared.map((kind) => `${left.displayName} et ${right.displayName} · ${kind} = ${left[kind]}`),
        evidenceIds: shared.flatMap((kind) => [`evidence.${left.profileId}.${kind}`, `evidence.${right.profileId}.${kind}`]),
        score: 98,
        independenceGroups: shared.filter((kind) => kind !== "dateTimeSum").map((kind) => `${kind}:direct`),
        sourceDomains: shared.includes("timeDigitSum") ? ["date", "time"] : ["date"],
      }));
    }
  }
  return result;
}

function eventIntervals(events, signatures) {
  const results = [];
  const signatureValues = new Map();
  for (const signature of signatures) for (const kind of ["day", "month", "dateDigitSum", "timeDigitSum", "dateTimeSum"]) {
    const value = signature[kind];
    if (!Number.isInteger(value)) continue;
    const entries = signatureValues.get(value) ?? [];
    entries.push({ signature, kind });
    signatureValues.set(value, entries);
  }
  for (let index = 0; index < events.length; index += 1) {
    for (let other = index + 1; other < events.length; other += 1) {
      const left = events[index];
      const right = events[other];
      const totalDays = Math.abs(Math.round((dateMs(parseDate(left.date)) - dateMs(parseDate(right.date))) / DAY_MS));
      for (const value of [totalDays, totalDays % 365]) {
        if (value <= 0 || !signatureValues.has(value)) continue;
        const matches = signatureValues.get(value);
        results.push(deepObservation({
          type: "EVENT_INTERVAL_ECHO",
          category: "chronology",
          participantIds: matches.map(({ signature }) => signature.profileId),
          eventIds: [left.id, right.id],
          values: [value],
          facts: [`interval.${left.id}.${right.id}=${value}`, ...matches.map(({ signature, kind }) => `${signature.profileId}.${kind}=${value}`)],
          calculations: [`${left.title} → ${right.title} = ${totalDays} jours`, ...matches.map(({ signature, kind }) => `${signature.displayName} · ${kind} = ${value}`)],
          evidenceIds: [`evidence.interval.${left.id}.${right.id}`, ...matches.map(({ signature, kind }) => `evidence.${signature.profileId}.${kind}`)],
          score: value === totalDays ? 80 : 65,
          complexityCost: value === totalDays ? 0 : 1,
          independenceGroups: [`event-interval:${left.id}:${right.id}`, ...matches.map(({ signature, kind }) => `${signature.profileId}:${kind}`)],
          sourceDomains: ["event", "interval", "date"],
        }));
      }
    }
  }
  return results;
}

export function discoverDeepFamilyStructures({ profiles, signatures, roles = {}, events = [] }) {
  const extendedSignatures = Object.freeze(signatures.map((signature) => extendFamilySignature(signature, profiles.find(({ id }) => id === signature.profileId))));
  const candidates = [
    ...samePlaceObservations(extendedSignatures),
    ...doubleEventAgeEchoes(extendedSignatures, events),
    ...parentPairChildEchoes(extendedSignatures, roles),
    ...siblingEchoes(extendedSignatures, roles),
    ...eventIntervals(events, extendedSignatures),
  ];
  const uniqueCandidates = [...new Map(candidates.map((item) => [item.id, item])).values()]
    .filter(({ complexityCost, interestScore }) => complexityCost <= 2 && interestScore >= 48)
    .sort((left, right) => right.interestScore - left.interestScore || right.sourceDiversity - left.sourceDiversity || left.id.localeCompare(right.id));
  const rejected = candidates.filter(({ complexityCost, interestScore }) => complexityCost > 2 || interestScore < 48);
  return Object.freeze({
    version: FAMILY_DEEP_ENGINE_VERSION,
    extendedSignatures,
    familyGraph: buildFamilyGraph({ profiles, roles, events }),
    observations: Object.freeze(uniqueCandidates),
    rejected: Object.freeze(rejected),
  });
}

export function buildEvidenceGraph(observations, familyGraph) {
  const evidenceNodes = [];
  const evidenceEdges = [];
  for (const observation of observations) {
    evidenceNodes.push(Object.freeze({ id: observation.id, type: "MOTIF", label: observation.type, force: observation.force ?? forceFromScore(observation.interestScore) }));
    for (const profileId of observation.participantIds ?? []) evidenceEdges.push(Object.freeze({ sourceId: profileId, targetId: observation.id, type: "SUPPORTS" }));
    for (const eventId of observation.eventIds ?? []) evidenceEdges.push(Object.freeze({ sourceId: eventId, targetId: observation.id, type: "SUPPORTS" }));
  }
  return Object.freeze({ nodes: Object.freeze([...familyGraph.nodes, ...evidenceNodes]), edges: Object.freeze([...familyGraph.edges, ...evidenceEdges]) });
}
