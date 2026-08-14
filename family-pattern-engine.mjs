export const FAMILY_PATTERN_ENGINE_VERSION = "tao-family-pattern-2.0.0";

const LEVELS = Object.freeze({ high: "HIGH", medium: "MEDIUM", curiosity: "CURIOSITY" });
const NODE_DEFINITIONS = Object.freeze([
  { kind: "day", category: "date", label: "jour", depth: 0, groups: ["calendar.day"] },
  { kind: "month", category: "date", label: "mois", depth: 0, groups: ["calendar.month"] },
  { kind: "year", category: "date", label: "année", depth: 0, groups: ["calendar.year"] },
  { kind: "dateDigitSum", category: "date", label: "somme de la date", depth: 1, groups: ["date.digits"] },
  { kind: "dateReduced", category: "date", label: "réduction de la date", depth: 2, groups: ["date.digits"] },
  { kind: "hour", category: "time", label: "heure", depth: 0, groups: ["time.hour"] },
  { kind: "minutes", category: "time", label: "minutes", depth: 0, groups: ["time.minute"] },
  { kind: "timeDigitSum", category: "time", label: "somme de l’heure", depth: 1, groups: ["time.digits"] },
  { kind: "timeReduced", category: "time", label: "réduction de l’heure", depth: 2, groups: ["time.digits"] },
  { kind: "dateTimeSum", category: "date_time", label: "date + heure", depth: 2, groups: ["date.digits", "time.digits"] },
  { kind: "dateTimeReduced", category: "date_time", label: "réduction date + heure", depth: 2, groups: ["date.digits", "time.digits"] },
  { kind: "dayOfYear", category: "calendar", label: "jour de l’année", depth: 1, groups: ["calendar.ordinal"] },
]);
const RELATIONAL_KINDS = new Set(["day", "month", "year", "dateDigitSum", "hour", "minutes", "timeDigitSum", "dateTimeSum", "dayOfYear"]);

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

function unique(values) {
  return [...new Set(values)];
}

function interestLevel(score) {
  return score >= 82 ? LEVELS.high : score >= 62 ? LEVELS.medium : LEVELS.curiosity;
}

function reverseDigits(value) {
  const normalized = String(Math.abs(Number(value))).replace(/^0+(?=\d)/, "");
  return Number([...normalized].reverse().join(""));
}

function isPalindrome(value) {
  const normalized = String(Math.abs(Number(value))).replace(/^0+(?=\d)/, "");
  return normalized.length > 1 && normalized === [...normalized].reverse().join("");
}

function dependencyTokens(profileId, definition) {
  return definition.groups.map((group) => `${profileId}:${group}`);
}

function nodeFromSignature(signature, definition) {
  const value = signature[definition.kind];
  if (!Number.isInteger(value)) return null;
  return Object.freeze({
    id: `number.${signature.profileId}.${definition.kind}`,
    profileId: signature.profileId,
    displayName: signature.displayName,
    kind: definition.kind,
    value,
    sourceCategory: definition.category,
    transformDepth: definition.depth,
    dependencyGroups: Object.freeze(dependencyTokens(signature.profileId, definition)),
    calculation: `${signature.displayName} · ${definition.label} = ${value}`,
  });
}

function edge({ operator, value, participants, sourceKinds, sourceCategories, dependencyGroups, calculation, transformDepth = 1 }) {
  const participantIds = unique(participants).sort();
  const dependencies = unique(dependencyGroups).sort();
  const basis = `${operator}|${value}|${participantIds.join(".")}|${sourceKinds.join(".")}|${dependencies.join(".")}`;
  return Object.freeze({
    id: `relation.${stableHash(basis)}`,
    operator,
    value,
    participantIds: Object.freeze(participantIds),
    sourceKinds: Object.freeze(unique(sourceKinds)),
    sourceCategories: Object.freeze(unique(sourceCategories)),
    dependencyGroups: Object.freeze(dependencies),
    dependencyGroup: dependencies.join("|"),
    calculation,
    transformDepth,
  });
}

function relationEdges(nodes) {
  const byProfile = new Map();
  for (const node of nodes) {
    const entries = byProfile.get(node.profileId) ?? new Map();
    entries.set(node.kind, node);
    byProfile.set(node.profileId, entries);
  }
  const profileIds = [...byProfile.keys()].sort();
  const edges = [];
  for (let leftIndex = 0; leftIndex < profileIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profileIds.length; rightIndex += 1) {
      const leftId = profileIds[leftIndex];
      const rightId = profileIds[rightIndex];
      const leftNodes = byProfile.get(leftId);
      const rightNodes = byProfile.get(rightId);
      for (const kind of RELATIONAL_KINDS) {
        const left = leftNodes.get(kind);
        const right = rightNodes.get(kind);
        if (!left || !right) continue;
        const dependencies = [...left.dependencyGroups, ...right.dependencyGroups];
        const categories = [left.sourceCategory, right.sourceCategory];
        const difference = Math.abs(left.value - right.value);
        if (difference > 0) edges.push(edge({ operator: "DIFFERENCE", value: difference, participants: [leftId, rightId], sourceKinds: [kind], sourceCategories: categories, dependencyGroups: dependencies, calculation: `|${left.value} − ${right.value}| = ${difference} · ${kind}` }));
        const sum = left.value + right.value;
        if (sum > 0) edges.push(edge({ operator: "SUM", value: sum, participants: [leftId, rightId], sourceKinds: [kind], sourceCategories: categories, dependencyGroups: dependencies, calculation: `${left.value} + ${right.value} = ${sum} · ${kind}` }));
        if (left.value >= 10 && right.value >= 10 && left.value !== right.value && reverseDigits(left.value) === right.value) {
          edges.push(edge({ operator: "MIRROR", value: Math.min(left.value, right.value), participants: [leftId, rightId], sourceKinds: [kind], sourceCategories: categories, dependencyGroups: dependencies, calculation: `${left.value} ↔ ${right.value} · ${kind}` }));
        }
      }
    }
  }
  return edges;
}

function intervalEdges(intervals) {
  const definitions = [
    ["years", "écart d’années", "calendar.year"],
    ["months", "mois restants dans l’intervalle", "calendar.month"],
    ["days", "jours restants dans l’intervalle", "calendar.day"],
    ["totalDays", "écart total en jours", "birth.interval"],
  ];
  const edges = [];
  for (const interval of intervals) {
    for (const [kind, label, dependency] of definitions) {
      const value = interval.birthDate?.[kind];
      if (!Number.isInteger(value) || value <= 0) continue;
      edges.push(edge({ operator: "INTERVAL", value, participants: interval.participantIds, sourceKinds: [`interval.${kind}`], sourceCategories: ["interval"], dependencyGroups: interval.participantIds.map((id) => `${id}:${dependency}`), calculation: `${label} = ${value}`, transformDepth: 1 }));
    }
    if (Number.isInteger(interval.birthTimeMinutes) && interval.birthTimeMinutes > 0) {
      edges.push(edge({ operator: "INTERVAL", value: interval.birthTimeMinutes, participants: interval.participantIds, sourceKinds: ["interval.timeMinutes"], sourceCategories: ["time", "interval"], dependencyGroups: interval.participantIds.flatMap((id) => [`${id}:time.hour`, `${id}:time.minute`]), calculation: `écart entre les heures = ${interval.birthTimeMinutes} minutes`, transformDepth: 1 }));
    }
  }
  return edges;
}

export function buildNumericGraph({ signatures, intervals = [] }) {
  const nodes = signatures.flatMap((signature) => NODE_DEFINITIONS.map((definition) => nodeFromSignature(signature, definition)).filter(Boolean));
  const edges = [...relationEdges(nodes), ...intervalEdges(intervals)];
  const nodeIndex = new Map();
  for (const node of nodes) {
    const entries = nodeIndex.get(node.value) ?? [];
    entries.push(node);
    nodeIndex.set(node.value, entries);
  }
  const edgeIndex = new Map();
  for (const relation of edges) {
    const entries = edgeIndex.get(relation.value) ?? [];
    entries.push(relation);
    edgeIndex.set(relation.value, entries);
  }
  return Object.freeze({
    version: FAMILY_PATTERN_ENGINE_VERSION,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    nodeValues: Object.freeze([...nodeIndex.keys()].sort((a, b) => a - b)),
    edgeValues: Object.freeze([...edgeIndex.keys()].sort((a, b) => a - b)),
  });
}

function independentPaths(paths) {
  const seen = new Set();
  const selected = [];
  for (const path of [...paths].sort((left, right) => left.transformDepth - right.transformDepth || left.id.localeCompare(right.id))) {
    const key = unique(path.dependencyGroups).sort().join("|");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(path);
  }
  return selected;
}

function patternScore(type, independentCount, sourceDiversity, participantCount, averageDepth) {
  const base = {
    SHARED_DERIVED_VALUE: 66,
    REPEATED_DIFFERENCE: 66,
    REPEATED_SUM: 63,
    CROSS_GENERATION_TRANSFER: 78,
    MIRROR_CHAIN: 76,
    PALINDROME_FAMILY: 58,
    EVENT_SIGNATURE_MATCH: 76,
    MULTI_PERSON_CLUSTER: 78,
    CONVERGENT_NUMBER: 60,
  }[type] ?? 55;
  const independenceBonus = Math.min(18, Math.max(0, independentCount - 1) * 6);
  const diversityBonus = Math.min(12, Math.max(0, sourceDiversity - 1) * 4);
  const peopleBonus = Math.min(8, Math.max(0, participantCount - 2) * 2);
  const depthPenalty = Math.max(0, averageDepth - 1) * 5;
  return Math.max(0, Math.min(100, Math.round(base + independenceBonus + diversityBonus + peopleBonus - depthPenalty)));
}

function createPattern({ type, category, value, paths, extraCalculations = [], eventIds = [] }) {
  const independent = independentPaths(paths);
  const participantIds = unique(paths.flatMap((path) => path.participantIds ?? (path.profileId ? [path.profileId] : []))).sort();
  const sourceCategories = unique(paths.flatMap((path) => path.sourceCategories ?? (path.sourceCategory ? [path.sourceCategory] : [])));
  const dependencyGroups = unique(independent.flatMap((path) => path.dependencyGroups ?? []));
  const averageDepth = independent.length ? independent.reduce((sum, path) => sum + (path.transformDepth ?? 0), 0) / independent.length : 0;
  const score = patternScore(type, independent.length, sourceCategories.length, participantIds.length, averageDepth);
  const pathIds = independent.map(({ id }) => id).sort();
  const id = `family_pattern_${stableHash(`${type}|${value}|${pathIds.join("|")}`)}`;
  return Object.freeze({
    id,
    type,
    category,
    pattern: true,
    participantIds: Object.freeze(participantIds),
    eventIds: Object.freeze(unique(eventIds)),
    values: Object.freeze([Number(value)]),
    facts: Object.freeze(independent.map(({ id: pathId }) => pathId)),
    calculations: Object.freeze([...independent.map(({ calculation }) => calculation).filter(Boolean), ...extraCalculations]),
    dependencyGroups: Object.freeze(dependencyGroups),
    dependencyGroup: [...dependencyGroups].sort().join("|"),
    independentPaths: Object.freeze(pathIds),
    independentPathCount: independent.length,
    sourceDiversity: sourceCategories.length,
    sourceCategories: Object.freeze(sourceCategories),
    transformations: Math.ceil(averageDepth),
    interestScore: score,
    interest: interestLevel(score),
    clusterKey: `pattern.${type}.${value}`,
  });
}

function groupByValue(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!Number.isInteger(entry.value) || entry.value <= 0) continue;
    const values = groups.get(entry.value) ?? [];
    values.push(entry);
    groups.set(entry.value, values);
  }
  return groups;
}

function repeatedRelationPatterns(graph, operator, type) {
  const groups = new Map();
  for (const relation of graph.edges.filter((entry) => entry.operator === operator)) {
    const key = `${relation.value}|${relation.participantIds.join(".")}`;
    const paths = groups.get(key) ?? [];
    paths.push(relation);
    groups.set(key, paths);
  }
  const patterns = [];
  for (const paths of groups.values()) {
    const value = paths[0].value;
    const independent = independentPaths(paths);
    const sourceKinds = unique(independent.flatMap(({ sourceKinds: kinds }) => kinds));
    if (independent.length < 2 || sourceKinds.length < 2) continue;
    patterns.push(createPattern({ type, category: "recurring", value, paths }));
  }
  return patterns;
}

function sharedDerivedPatterns(graph) {
  const patterns = [];
  for (const [value, nodes] of groupByValue(graph.nodes)) {
    const participants = unique(nodes.map(({ profileId }) => profileId));
    const kinds = unique(nodes.map(({ kind }) => kind));
    if (participants.length < 2 || (kinds.length < 2 && participants.length < 3)) continue;
    patterns.push(createPattern({ type: participants.length >= 3 ? "MULTI_PERSON_CLUSTER" : "SHARED_DERIVED_VALUE", category: "recurring", value, paths: nodes }));
  }
  return patterns;
}

function convergentPatterns(graph) {
  const patterns = [];
  const directPaths = graph.nodes.map((node) => ({ ...node, participantIds: [node.profileId], sourceCategories: [node.sourceCategory] }));
  const allPaths = [...directPaths, ...graph.edges.filter(({ operator }) => operator !== "MIRROR")];
  for (const [value, paths] of groupByValue(allPaths)) {
    const independent = independentPaths(paths);
    const participants = unique(independent.flatMap((path) => path.participantIds ?? []));
    const sourceCategories = unique(independent.flatMap((path) => path.sourceCategories ?? []));
    const relationalCount = independent.filter(({ operator }) => Boolean(operator)).length;
    const operatorDiversity = unique(independent.map(({ operator }) => operator).filter(Boolean)).length;
    const sufficientlyDiverse = sourceCategories.length >= 3 || (sourceCategories.length >= 2 && independent.length >= 4 && operatorDiversity >= 2);
    if (independent.length < 3 || participants.length < 2 || relationalCount < 1 || !sufficientlyDiverse) continue;
    patterns.push(createPattern({ type: "CONVERGENT_NUMBER", category: "recurring", value, paths }));
  }
  return patterns;
}

function mirrorChainPatterns(graph) {
  const mirrors = graph.edges.filter(({ operator }) => operator === "MIRROR");
  const groups = groupByValue(mirrors);
  return [...groups.entries()].flatMap(([value, paths]) => independentPaths(paths).length >= 2
    ? [createPattern({ type: "MIRROR_CHAIN", category: "mirrors", value, paths })]
    : []);
}

function palindromeFamilyPatterns(graph) {
  const groups = groupByValue(graph.nodes.filter(({ value }) => isPalindrome(value)));
  return [...groups.entries()].flatMap(([value, paths]) => unique(paths.map(({ profileId }) => profileId)).length >= 2
    ? [createPattern({ type: "PALINDROME_FAMILY", category: "curiosities", value, paths })]
    : []);
}

function observationConvergences(graph, observations) {
  const patterns = [];
  const nodesByValue = groupByValue(graph.nodes.map((node) => ({ ...node, participantIds: [node.profileId], sourceCategories: [node.sourceCategory] })));
  for (const observation of observations) {
    const value = observation.values?.[0];
    if (!Number.isInteger(value)) continue;
    const supporting = nodesByValue.get(value) ?? [];
    if (observation.type === "CROSS_GENERATION_VALUE" && supporting.length >= 2) {
      const path = { ...observation, value, sourceCategories: ["generation"], dependencyGroups: observation.facts ?? [], calculation: observation.calculations?.[0], transformDepth: observation.transformations ?? 0 };
      patterns.push(createPattern({ type: "CROSS_GENERATION_TRANSFER", category: "generations", value, paths: [path, ...supporting] }));
    }
    if (["EVENT_AGE_MATCH", "EVENT_SIGNATURE_MATCH"].includes(observation.type) && supporting.length) {
      const path = { ...observation, value, sourceCategories: ["event"], dependencyGroups: observation.facts ?? [], calculation: observation.calculations?.[0], transformDepth: observation.transformations ?? 0 };
      patterns.push(createPattern({ type: "EVENT_SIGNATURE_MATCH", category: "events", value, paths: [path, ...supporting], eventIds: observation.eventIds }));
    }
  }
  return patterns;
}

export function discoverDeepPatterns({ graph, observations = [] }) {
  const candidates = [
    ...repeatedRelationPatterns(graph, "DIFFERENCE", "REPEATED_DIFFERENCE"),
    ...repeatedRelationPatterns(graph, "SUM", "REPEATED_SUM"),
    ...sharedDerivedPatterns(graph),
    ...convergentPatterns(graph),
    ...mirrorChainPatterns(graph),
    ...palindromeFamilyPatterns(graph),
    ...observationConvergences(graph, observations),
  ];
  const uniquePatterns = [...new Map(candidates.map((pattern) => [pattern.id, pattern])).values()]
    .filter(({ independentPathCount }) => independentPathCount >= 2)
    .sort((left, right) => right.interestScore - left.interestScore || right.sourceDiversity - left.sourceDiversity || left.id.localeCompare(right.id));
  return Object.freeze(uniquePatterns);
}

export function calculateConstellationDensity(patterns, observations = []) {
  const candidates = [...patterns, ...observations]
    .sort((left, right) => right.interestScore - left.interestScore)
    .slice(0, 12);
  const participantIds = unique(candidates.flatMap(({ participantIds: ids = [] }) => ids));
  const sourceCategories = unique(candidates.flatMap(({ sourceCategories = [] }) => sourceCategories));
  const rawDensity = candidates.reduce((sum, item, index) => {
    const weight = 1 / (1 + index * 0.14);
    const independence = Math.max(1, item.independentPathCount ?? 1);
    const diversity = Math.max(1, item.sourceDiversity ?? 1);
    return sum + Math.max(0, item.interestScore - 42) * weight * (1 + Math.min(3, independence - 1) * 0.18 + Math.min(3, diversity - 1) * 0.12);
  }, 0);
  const adjustedDensity = rawDensity + participantIds.length * 3 + sourceCategories.length * 4;
  return Object.freeze({
    rawDensity: Math.round(adjustedDensity * 100) / 100,
    constellationDensity: Math.min(100, Math.round(adjustedDensity / 5.5)),
    motifCount: patterns.length,
    independentPatternCount: patterns.filter(({ independentPathCount = 0 }) => independentPathCount >= 2).length,
    participantCoverage: participantIds.length,
    sourceDiversity: sourceCategories.length,
    maxInterestScore: candidates[0]?.interestScore ?? 0,
  });
}
