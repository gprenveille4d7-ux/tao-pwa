export const FAMILY_INVENTORY_ENGINE_VERSION = "tao-family-inventory-1.0.0";

const IMPORTANCE_ORDER = Object.freeze({ major: 0, notable: 1, curiosity: 2 });
const CATEGORY_ORDER = Object.freeze({ number: 0, date: 1, time: 2, cycle: 3, generation: 4, location: 5, bazi: 6, singularity: 7 });
const SOURCE_DEFINITIONS = Object.freeze([
  { key: "birthDay", field: "day", label: "Jour de naissance", domain: "date", dependency: "birth-date-calendar" },
  { key: "birthMonth", field: "month", label: "Mois de naissance", domain: "date", dependency: "birth-date-calendar" },
  { key: "dateDigitSum", field: "dateDigitSum", label: "Somme des chiffres de la date", domain: "date", dependency: "birth-date-digits" },
  { key: "timeDigitSum", field: "timeDigitSum", label: "Somme des chiffres de l’heure", domain: "time", dependency: "birth-time-digits" },
  { key: "dateTimeSum", field: "dateTimeSum", label: "Somme de la date et de l’heure", domain: "time", dependency: "birth-date-time-total" },
  { key: "dayOfYear", field: "dayOfYear", label: "Jour dans l’année", domain: "cycle", dependency: "birth-date-ordinal" },
]);

const NUMBER_TYPES = new Set([
  "SHARED_VALUE",
  "SHARED_DERIVED_VALUE",
  "MULTI_PERSON_CLUSTER",
  "CONVERGENT_NUMBER",
  "CROSS_GENERATION_VALUE",
  "CROSS_GENERATION_TRANSFER",
  "PALINDROME_FAMILY",
]);

const NUMBER_ANCHOR_TYPES = new Set([
  "SHARED_VALUE",
  "SHARED_DERIVED_VALUE",
  "MULTI_PERSON_CLUSTER",
  "CROSS_GENERATION_VALUE",
  "CROSS_GENERATION_TRANSFER",
  "PALINDROME_FAMILY",
]);

const PUBLIC_STANDALONE_TYPES = new Set([
  "DATE_MIRROR",
  "NUMBER_MIRROR",
  "ORDINAL_MIRROR",
  "MIRROR_CHAIN",
  "SHARED_BIRTH_PLACE",
  "EVENT_AGE_MATCH",
  "MULTI_EVENT_AGE_ECHO",
  "EVENT_SIGNATURE_MATCH",
  "INTERVAL_MATCHES_SIGNATURE",
  "EVENT_INTERVAL_ECHO",
]);

const SIGNATURE_TYPES = new Set(["MULTI_SIGNATURE_MATCH", "SIBLING_MULTI_DOMAIN_ECHO"]);

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function generationForRole(role) {
  if (role === "grandparent") return -1;
  if (["child", "grandchild"].includes(role)) return 1;
  return 0;
}

function occurrenceKey(occurrence) {
  return `${occurrence.personId}|${occurrence.sourceType}|${String(occurrence.sourceValue)}`;
}

export function deduplicateOccurrences(occurrences = []) {
  const uniqueOccurrences = new Map();
  for (const occurrence of occurrences) {
    if (!occurrence?.personId || !occurrence?.sourceType) continue;
    const normalized = Object.freeze({
      personId: String(occurrence.personId),
      personName: String(occurrence.personName ?? "Une personne"),
      sourceType: String(occurrence.sourceType),
      sourceLabel: String(occurrence.sourceLabel ?? "Donnée familiale"),
      sourceValue: occurrence.sourceValue,
      rawValue: occurrence.rawValue ?? null,
      generation: Number.isInteger(occurrence.generation) ? occurrence.generation : 0,
      dependencyGroupIds: Object.freeze(unique(occurrence.dependencyGroupIds ?? [])),
    });
    uniqueOccurrences.set(occurrenceKey(normalized), normalized);
  }
  return Object.freeze([...uniqueOccurrences.values()].sort((left, right) => left.personName.localeCompare(right.personName, "fr") || left.sourceLabel.localeCompare(right.sourceLabel, "fr")));
}

function featureFamily(type) {
  if (["SHARED_VALUE", "SHARED_DERIVED_VALUE", "MULTI_PERSON_CLUSTER", "CONVERGENT_NUMBER", "PALINDROME_FAMILY"].includes(type)) return "presence";
  if (["CROSS_GENERATION_VALUE", "CROSS_GENERATION_TRANSFER"].includes(type)) return "generation";
  if (["MULTI_SIGNATURE_MATCH", "SIBLING_MULTI_DOMAIN_ECHO"].includes(type)) return "signature";
  if (["NUMBER_MIRROR", "ORDINAL_MIRROR", "MIRROR_CHAIN", "DATE_MIRROR"].includes(type)) return "mirror";
  if (["SIMPLE_ARITHMETIC", "PARENT_PAIR_CHILD_SUM"].includes(type)) return "arithmetic";
  if (type === "SIMPLE_MULTIPLE") return "multiple";
  if (type.includes("EVENT") || type === "EVENT_AGE_MATCH") return "event";
  if (type.includes("INTERVAL")) return "interval";
  if (type === "SHARED_BIRTH_PLACE") return "location";
  return type.toLocaleLowerCase("fr-FR");
}

function featureKey(feature) {
  const family = featureFamily(feature.type);
  const participants = unique(feature.participantIds ?? []).sort().join(".");
  const values = unique(feature.values ?? []).map(Number).filter(Number.isFinite).sort((a, b) => a - b).join(".");
  const eventIds = unique(feature.eventIds ?? []).sort().join(".");
  return `${family}|${participants}|${values}|${eventIds}`;
}

export function deduplicateRelatedFeatures(features = []) {
  const byKey = new Map();
  for (const feature of features) {
    if (!feature?.type) continue;
    const key = featureKey(feature);
    const existing = byKey.get(key);
    if (!existing || Number(feature.interestScore ?? 0) > Number(existing.interestScore ?? 0)) byKey.set(key, feature);
  }
  return Object.freeze([...byKey.values()].sort((left, right) => Number(right.interestScore ?? 0) - Number(left.interestScore ?? 0) || String(left.type).localeCompare(String(right.type))));
}

function directOccurrences(signatures, profiles, roles) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const byValue = new Map();
  for (const signature of signatures) {
    const profile = profileMap.get(signature.profileId);
    for (const source of SOURCE_DEFINITIONS) {
      const value = signature[source.field];
      if (!Number.isInteger(value)) continue;
      const entries = byValue.get(value) ?? [];
      entries.push({
        personId: signature.profileId,
        personName: profile?.firstName ?? signature.displayName,
        sourceType: source.key,
        sourceLabel: source.label,
        sourceValue: value,
        rawValue: source.domain === "time" ? signature.time : signature.date,
        generation: generationForRole(roles[signature.profileId]),
        dependencyGroupIds: [`${signature.profileId}:${source.dependency}`],
      });
      byValue.set(value, entries);
    }
  }
  return byValue;
}

function primaryValues(observation) {
  const values = (observation.values ?? []).map(Number).filter(Number.isFinite);
  if (!values.length) return [];
  if (observation.type === "SIMPLE_ARITHMETIC" || observation.type === "PARENT_PAIR_CHILD_SUM") return [values.at(-1)];
  if (observation.type === "SIMPLE_MULTIPLE") return [Math.min(...values), Math.max(...values)];
  return values;
}

function dateMirrorId(observation, signatures) {
  const signatureMap = new Map(signatures.map((signature) => [signature.profileId, signature]));
  const dates = (observation.participantIds ?? []).map((id) => signatureMap.get(id)).filter(Boolean).map(({ day, month }) => `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`).sort();
  return `date-mirror:${dates.join(":") || observation.id}`;
}

export function canonicalPatternIdForObservation(observation, signatures = []) {
  const participants = unique(observation.participantIds ?? []).sort().join(":");
  const values = primaryValues(observation);
  if (SIGNATURE_TYPES.has(observation.type)) return `signature:${participants}`;
  if (observation.type === "DATE_MIRROR") return dateMirrorId(observation, signatures);
  if (["NUMBER_MIRROR", "ORDINAL_MIRROR", "MIRROR_CHAIN"].includes(observation.type)) return `mirror:${[...values].sort((a, b) => a - b).join(":")}`;
  if (observation.type === "SHARED_BIRTH_PLACE") return `location:${stableHash((observation.calculations ?? []).join("|"))}`;
  if (["EVENT_AGE_MATCH", "MULTI_EVENT_AGE_ECHO"].includes(observation.type)) return `event:${unique(observation.eventIds ?? []).sort().join(":")}:age`;
  if (observation.type === "EVENT_SIGNATURE_MATCH") return `event:${unique(observation.eventIds ?? []).sort().join(":")}:signature:${values.join(":")}`;
  if (["INTERVAL_MATCHES_SIGNATURE", "EVENT_INTERVAL_ECHO"].includes(observation.type)) return `interval:${unique(observation.eventIds ?? observation.participantIds ?? []).sort().join(":")}:${values.join(":")}`;
  if (["REPEATED_DIFFERENCE", "REPEATED_SUM"].includes(observation.type)) return `relation:${featureFamily(observation.type)}:${values[0]}`;
  if (NUMBER_TYPES.has(observation.type) && values.length) return `number:${values[0]}`;
  return `singularity:${featureFamily(observation.type)}:${participants}:${values.join(":") || stableHash(observation.id)}`;
}

function importanceFor({ personCount, generationCount, occurrenceCount, directness, sourceDiversity, bestScore }) {
  if ((personCount >= 4 && generationCount >= 2) || (personCount >= 3 && generationCount >= 2 && sourceDiversity >= 2) || (directness && bestScore >= 94 && personCount >= 2)) return "major";
  if (personCount >= 2 || generationCount >= 2 || bestScore >= 76 || occurrenceCount >= 3) return "notable";
  return "curiosity";
}

export function importanceFromPattern(pattern) {
  return importanceFor({
    personCount: pattern.personCount ?? 0,
    generationCount: pattern.generationCount ?? 0,
    occurrenceCount: pattern.occurrenceCount ?? pattern.occurrences?.length ?? 0,
    directness: pattern.directness !== "derived",
    sourceDiversity: pattern.sourceDiversity ?? 1,
    bestScore: pattern.interestScore ?? 0,
  });
}

function categoryForObservation(observation) {
  if (observation.type === "SHARED_BIRTH_PLACE") return "location";
  if (observation.category === "mirrors") return "date";
  if (observation.category === "events" || observation.category === "chronology") return "cycle";
  if (observation.category === "generations" || observation.category === "siblings") return "generation";
  if (observation.category === "dates_times") return "time";
  return "singularity";
}

function labelForPattern(id, observation, occurrences) {
  if (id.startsWith("number:")) return id.slice("number:".length);
  if (id.startsWith("signature:")) return "Signature commune de dates et d’heures";
  if (observation?.type === "DATE_MIRROR") return "Dates miroir";
  if (["NUMBER_MIRROR", "ORDINAL_MIRROR", "MIRROR_CHAIN"].includes(observation?.type)) return "Nombres miroir";
  if (observation?.type === "SHARED_BIRTH_PLACE") return "Lieu de naissance partagé";
  if (observation?.type?.includes("EVENT") || observation?.type === "EVENT_AGE_MATCH") return "Écho avec un événement familial";
  if (observation?.type?.includes("INTERVAL")) return "Intervalle familial remarquable";
  return occurrences[0]?.sourceLabel ?? "Singularité familiale";
}

function explanationFor(pattern) {
  if (pattern.canonicalPatternId.startsWith("number:")) {
    const generationText = pattern.generationCount > 1 ? ` et traverse ${pattern.generationCount} générations` : "";
    return `Le ${pattern.label} apparaît chez ${pattern.personCount} membre${pattern.personCount > 1 ? "s" : ""}${generationText}. Toutes ses occurrences directes sont regroupées ici.`;
  }
  if (pattern.canonicalPatternId.startsWith("signature:")) return `${pattern.personCount} membres partagent la même structure de date et d’heure. Les totaux qui en découlent restent rattachés à ce seul motif.`;
  if (pattern.canonicalPatternId.startsWith("date-mirror:")) return "Le jour et le mois de deux dates de naissance sont inversés. Cette symétrie est présentée une seule fois.";
  if (pattern.canonicalPatternId.startsWith("mirror:")) return "Ces valeurs utilisent les mêmes chiffres dans un ordre miroir.";
  if (pattern.category === "location") return "Plusieurs membres partagent ce lieu de naissance. Il s’agit d’un lien géographique direct.";
  return "Cette correspondance est conservée comme un motif autonome parce qu’elle apporte une information distincte à l’inventaire.";
}

function patternFromGroup({ canonicalPatternId, observations, occurrences, category }) {
  const cleanOccurrences = deduplicateOccurrences(occurrences);
  const allFeatures = deduplicateRelatedFeatures(observations);
  const features = Object.freeze(cleanOccurrences.length ? allFeatures.filter((feature) => !["presence", "generation"].includes(featureFamily(feature.type))) : allFeatures);
  const occurrenceParticipantIds = unique(cleanOccurrences.map(({ personId }) => personId)).sort();
  const participantIds = unique([...occurrenceParticipantIds, ...features.flatMap(({ participantIds = [] }) => participantIds)]).sort();
  const generations = unique(cleanOccurrences.map(({ generation }) => generation));
  const dependencyGroupIds = unique([...cleanOccurrences.flatMap(({ dependencyGroupIds }) => dependencyGroupIds), ...features.flatMap(({ dependencyGroups = [], independenceGroups = [] }) => [...dependencyGroups, ...independenceGroups])]);
  const sourceDomains = unique(cleanOccurrences.map(({ sourceType }) => SOURCE_DEFINITIONS.find(({ key }) => key === sourceType)?.domain ?? category));
  const bestScore = Math.max(0, ...features.map(({ interestScore = 0 }) => interestScore));
  const directness = cleanOccurrences.length ? "direct" : "derived";
  const provisional = {
    personCount: occurrenceParticipantIds.length || participantIds.length,
    generationCount: generations.length || (participantIds.length ? 1 : 0),
    occurrenceCount: cleanOccurrences.length || features.length,
    directness,
    sourceDiversity: sourceDomains.length || 1,
    bestScore,
  };
  const representative = features[0] ?? null;
  const label = labelForPattern(canonicalPatternId, representative, cleanOccurrences);
  const pattern = {
    id: `family_inventory_${stableHash(canonicalPatternId)}`,
    canonicalPatternId,
    category,
    label,
    importance: importanceFor(provisional),
    occurrences: cleanOccurrences,
    relatedFeatures: features,
    dependencyGroupIds: Object.freeze(dependencyGroupIds),
    generationCount: provisional.generationCount,
    personCount: provisional.personCount,
    occurrenceCount: provisional.occurrenceCount,
    sourceDiversity: provisional.sourceDiversity,
    directness,
    interestScore: bestScore,
    participantIds: Object.freeze(participantIds),
    values: Object.freeze(unique([...cleanOccurrences.map(({ sourceValue }) => Number(sourceValue)), ...features.flatMap(({ values = [] }) => values)]).filter(Number.isFinite)),
    observationIds: Object.freeze(features.map(({ id }) => id)),
    evidenceIds: Object.freeze(unique(features.flatMap(({ evidenceIds = [], facts = [] }) => evidenceIds.length ? evidenceIds : facts))),
    calculationDetails: Object.freeze(unique([...cleanOccurrences.map(({ personName, sourceLabel, sourceValue }) => `${personName} · ${sourceLabel} = ${sourceValue}`), ...features.flatMap(({ calculations = [] }) => calculations)])),
  };
  pattern.explanation = explanationFor(pattern);
  return Object.freeze(pattern);
}

function signaturePatternGroups(observations, directByValue, signatures) {
  const groups = new Map();
  for (const observation of observations.filter(({ type }) => SIGNATURE_TYPES.has(type))) {
    const id = canonicalPatternIdForObservation(observation, signatures);
    const existing = groups.get(id) ?? { observations: [], occurrences: [] };
    existing.observations.push(observation);
    for (const value of observation.values ?? []) {
      for (const occurrence of directByValue.get(Number(value)) ?? []) if ((observation.participantIds ?? []).includes(occurrence.personId)) existing.occurrences.push(occurrence);
    }
    groups.set(id, existing);
  }
  return groups;
}

function coveredBySignature(numberOccurrences, signatureGroups) {
  const people = unique(numberOccurrences.map(({ personId }) => personId)).sort().join(":");
  return [...signatureGroups.entries()].some(([id, group]) => id === `signature:${people}` && numberOccurrences.every((occurrence) => group.occurrences.some((candidate) => occurrenceKey(candidate) === occurrenceKey(occurrence))));
}

export function buildFamilyPatternInventory({ observations = [], signatures = [], profiles = [], roles = {} }) {
  const safeObservations = [...new Map(observations.filter(Boolean).map((item) => [item.id, item])).values()];
  const directByValue = directOccurrences(signatures, profiles, roles);
  const signatureGroups = signaturePatternGroups(safeObservations, directByValue, signatures);
  const groups = new Map();

  for (const [id, group] of signatureGroups) groups.set(id, { ...group, category: "time" });

  const observedNumberValues = unique(safeObservations.flatMap((observation) => NUMBER_ANCHOR_TYPES.has(observation.type) ? primaryValues(observation) : []));
  for (const value of observedNumberValues) {
    const occurrences = directByValue.get(Number(value)) ?? [];
    const people = unique(occurrences.map(({ personId }) => personId));
    if (people.length < 2 || coveredBySignature(occurrences, signatureGroups)) continue;
    const id = `number:${value}`;
    groups.set(id, { observations: [], occurrences: [...occurrences], category: "number" });
  }

  for (const observation of safeObservations) {
    let id = canonicalPatternIdForObservation(observation, signatures);
    const values = primaryValues(observation);
    const allValues = unique((observation.values ?? []).map(Number).filter(Number.isFinite));
    const participantKey = unique(observation.participantIds ?? []).sort().join(":");
    const matchingSignature = [...signatureGroups.keys()].find((signatureId) => signatureId === `signature:${participantKey}` && values.some((value) => (signatureGroups.get(signatureId).occurrences ?? []).some((occurrence) => occurrence.sourceValue === value)));
    if ((observation.type === "SIMPLE_ARITHMETIC" || observation.type === "SIMPLE_MULTIPLE" || observation.type === "PARENT_PAIR_CHILD_SUM") && matchingSignature) id = matchingSignature;
    else if ((NUMBER_TYPES.has(observation.type) || ["SIMPLE_ARITHMETIC", "SIMPLE_MULTIPLE", "PALINDROME_VALUE", "PARENT_PAIR_CHILD_SUM"].includes(observation.type)) && allValues.some((value) => groups.has(`number:${value}`))) id = `number:${allValues.find((value) => groups.has(`number:${value}`))}`;
    else if (NUMBER_TYPES.has(observation.type) || ["SIMPLE_ARITHMETIC", "SIMPLE_MULTIPLE", "PALINDROME_VALUE", "PARENT_PAIR_CHILD_SUM", "REPEATED_DIFFERENCE", "REPEATED_SUM"].includes(observation.type)) continue;
    const existing = groups.get(id) ?? { observations: [], occurrences: [], category: categoryForObservation(observation) };
    existing.observations.push(observation);
    groups.set(id, existing);
  }

  const patterns = [...groups.entries()].map(([canonicalPatternId, group]) => patternFromGroup({ canonicalPatternId, ...group }))
    .filter(({ occurrenceCount, relatedFeatures }) => occurrenceCount > 0 && (relatedFeatures.length || occurrenceCount >= 2))
    .filter(({ category, directness, relatedFeatures }) => category !== "singularity" || directness !== "derived" || relatedFeatures.some(({ type }) => PUBLIC_STANDALONE_TYPES.has(type)))
    .sort((left, right) => IMPORTANCE_ORDER[left.importance] - IMPORTANCE_ORDER[right.importance]
      || right.personCount - left.personCount
      || right.generationCount - left.generationCount
      || right.interestScore - left.interestScore
      || CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category]
      || left.canonicalPatternId.localeCompare(right.canonicalPatternId));

  const sections = Object.freeze(Object.fromEntries(Object.keys(CATEGORY_ORDER).map((category) => [category, Object.freeze(patterns.filter((pattern) => pattern.category === category))])));
  const importance = Object.freeze({
    major: patterns.filter((pattern) => pattern.importance === "major").length,
    notable: patterns.filter((pattern) => pattern.importance === "notable").length,
    curiosity: patterns.filter((pattern) => pattern.importance === "curiosity").length,
  });
  return Object.freeze({
    version: FAMILY_INVENTORY_ENGINE_VERSION,
    patterns: Object.freeze(patterns),
    sections,
    importance,
    total: patterns.length,
    dominantPatternId: patterns[0]?.canonicalPatternId ?? null,
  });
}
