export const FAMILY_CONSTELLATION_SEMANTIC_VERSION = "tao-family-semantic-4.0.0";

const CATEGORY_LABELS = Object.freeze({
  number: "Nombres",
  date: "Dates et miroirs",
  time: "Dates et heures",
  cycle: "Événements et intervalles",
  generation: "Générations",
  location: "Lieux",
  bazi: "Résonances BaZi",
  singularity: "Singularités",
});

const IMPORTANCE_LABELS = Object.freeze({ major: "Motif majeur", notable: "Motif notable", curiosity: "Curiosité" });
const FORCE_LABELS = Object.freeze({ major: "Direct ou fortement structuré", notable: "Notable", curiosity: "Exploratoire" });

function joinNames(values) {
  return new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" }).format(values);
}

function patternTitle(pattern) {
  return pattern.canonicalPatternId.startsWith("number:") ? `Le ${pattern.label} dans la famille` : pattern.label;
}

function patternDescription(pattern, participantNames) {
  if (pattern.canonicalPatternId.startsWith("number:")) {
    const generations = pattern.generationCount > 1 ? ` sur ${pattern.generationCount} générations` : "";
    return `${pattern.label} apparaît directement ${pattern.occurrenceCount} fois chez ${joinNames(participantNames)}${generations}. Les variantes qui en découlent sont rattachées à ce motif unique.`;
  }
  return pattern.explanation;
}

function patternCard(pattern, profileMap) {
  const participantNames = pattern.participantIds.map((id) => profileMap.get(id)?.firstName ?? "Une personne");
  return Object.freeze({
    id: pattern.id,
    canonicalPatternId: pattern.canonicalPatternId,
    type: "CANONICAL_FAMILY_PATTERN",
    category: pattern.category,
    categoryLabel: CATEGORY_LABELS[pattern.category] ?? "Correspondances",
    title: patternTitle(pattern),
    label: pattern.label,
    importance: pattern.importance,
    importanceLabel: IMPORTANCE_LABELS[pattern.importance],
    interest: pattern.importance === "major" ? "HIGH" : pattern.importance === "notable" ? "MEDIUM" : "CURIOSITY",
    interestLabel: IMPORTANCE_LABELS[pattern.importance],
    participantIds: pattern.participantIds,
    participantNames: Object.freeze(participantNames),
    personCount: pattern.personCount,
    generationCount: pattern.generationCount,
    occurrenceCount: pattern.occurrenceCount,
    occurrences: pattern.occurrences,
    relatedFeatures: pattern.relatedFeatures,
    relatedFeatureCount: pattern.relatedFeatures.length,
    dependencyGroupIds: pattern.dependencyGroupIds,
    values: pattern.values,
    description: patternDescription(pattern, participantNames),
    explanation: pattern.explanation,
    calculations: pattern.calculationDetails,
    calculationDetails: pattern.calculationDetails,
    facts: pattern.evidenceIds,
    evidenceIds: pattern.evidenceIds,
    observationIds: pattern.observationIds,
    relatedFeatureIds: Object.freeze(pattern.relatedFeatures.map(({ id }) => id).filter(Boolean)),
    independentPathCount: pattern.dependencyGroupIds.length || 1,
    sourceDiversity: pattern.sourceDiversity,
    force: pattern.importance === "major" ? "DIRECT" : pattern.importance === "notable" ? "NOTABLE" : "EXPLORATORY",
    forceLabel: FORCE_LABELS[pattern.importance],
    complexityCost: pattern.directness === "direct" ? 0 : 1,
  });
}

export function buildFamilyConstellationReading({ analysis, profiles }) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const inventory = analysis.patternInventory ?? { patterns: [], importance: { major: 0, notable: 0, curiosity: 0 }, total: 0 };
  const cards = inventory.patterns.map((pattern) => patternCard(pattern, profileMap));
  const primaryCards = cards.filter(({ importance }) => importance === "major").slice(0, 4);
  const dominant = cards[0] ?? null;
  const headline = cards.length && inventory.importance.major === 0
    ? `Aucun motif familial majeur détecté dans les règles actuellement analysées · ${inventory.importance.notable} notable${inventory.importance.notable > 1 ? "s" : ""} · ${inventory.importance.curiosity} curiosité${inventory.importance.curiosity > 1 ? "s" : ""}`
    : cards.length
      ? `${cards.length} motif${cards.length > 1 ? "s" : ""} détecté${cards.length > 1 ? "s" : ""} · ${inventory.importance.major} majeur${inventory.importance.major > 1 ? "s" : ""} · ${inventory.importance.notable} notable${inventory.importance.notable > 1 ? "s" : ""} · ${inventory.importance.curiosity} curiosité${inventory.importance.curiosity > 1 ? "s" : ""}`
      : "Aucun motif structuré ne ressort de ces données.";
  const overview = dominant
    ? `Le motif dominant est « ${dominant.title} ». Il relie ${dominant.personCount} personne${dominant.personCount > 1 ? "s" : ""}, ${dominant.generationCount} génération${dominant.generationCount > 1 ? "s" : ""} et ${dominant.occurrenceCount} occurrence${dominant.occurrenceCount > 1 ? "s" : ""} vérifiable${dominant.occurrenceCount > 1 ? "s" : ""}.`
    : "TAO préfère conserver un résultat sobre plutôt que fabriquer une correspondance.";
  const majorTitles = primaryCards.map(({ title }) => title.toLocaleLowerCase("fr-FR"));
  const synthesis = majorTitles.length
    ? `${joinNames(majorTitles)} ${majorTitles.length > 1 ? "forment" : "forme"} le cœur de cette constellation. Chaque idée n’est comptée qu’une fois ; ses répétitions, transformations simples et échos générationnels restent regroupés dans sa fiche.`
    : cards.length ? "Quelques singularités existent, mais aucune ne mérite d’être placée au centre de la lecture." : "Aucun motif n’est forcé : l’absence de correspondance nette est aussi un résultat valable.";
  const byImportance = (importance) => Object.freeze(cards.filter((card) => card.importance === importance));
  const byCategory = (category) => Object.freeze(cards.filter((card) => card.category === category));
  return Object.freeze({
    headline,
    overview,
    synthesis,
    cards: Object.freeze(cards),
    primaryCards: Object.freeze(primaryCards),
    inventory: Object.freeze({ major: byImportance("major"), notable: byImportance("notable"), curiosity: byImportance("curiosity") }),
    sections: Object.freeze(Object.fromEntries(Object.keys(CATEGORY_LABELS).map((category) => [category, byCategory(category)]))),
    categoryLabels: CATEGORY_LABELS,
    importanceLabels: IMPORTANCE_LABELS,
    forceLabels: FORCE_LABELS,
    disclaimer: "Ces correspondances sont des observations factuelles et structurelles. Elles ne prouvent ni causalité, ni destin, ni transmission surnaturelle.",
    methodology: "TAO calcule largement, déduplique par identité canonique, regroupe les résultats dépendants et ne présente chaque motif qu’une seule fois.",
  });
}

export function familyObservationFacts(analysis) {
  const patterns = analysis.patternInventory?.patterns ?? [];
  return Object.freeze(patterns.slice(0, 16).map((pattern) => Object.freeze({
    id: pattern.id,
    canonicalPatternId: pattern.canonicalPatternId,
    type: "FAMILY_CANONICAL_PATTERN",
    value: pattern.values.join("/"),
    label: `${pattern.label} · ${pattern.personCount} personne${pattern.personCount > 1 ? "s" : ""} · ${pattern.occurrenceCount} occurrence${pattern.occurrenceCount > 1 ? "s" : ""}`,
    importance: pattern.importance,
    occurrenceCount: pattern.occurrenceCount,
    generationCount: pattern.generationCount,
    participantIds: pattern.participantIds,
    occurrences: pattern.occurrences.map(({ personId, sourceType, sourceLabel, sourceValue }) => ({ personId, sourceType, sourceLabel, sourceValue })),
    relatedFeatureIds: pattern.observationIds,
    evidenceIds: pattern.evidenceIds,
  })));
}

export function formatEstimatedFrequency(frequency, simulationCount) {
  const minimumResolution = 1 / Math.max(1, Number(simulationCount) || 1);
  if (frequency <= minimumResolution * 1.5 || frequency < 0.01) return "< 1 %";
  const percentage = frequency * 100;
  return `≈ ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: percentage < 3 ? 1 : 0 }).format(percentage)} %`;
}

export function familyRarityLabel(category) {
  return ({ COMMON: "Fréquente", FAIRLY_COMMON: "Assez courante", UNCOMMON: "Peu fréquente", RARE: "Rare dans la simulation", VERY_RARE: "Très rare dans la simulation" })[category] ?? "Estimation indisponible";
}
