const TITLES = Object.freeze({
  DATE_MIRROR: "Une date miroir",
  MULTI_SIGNATURE_MATCH: "Le même trio numérique",
  CROSS_GENERATION_VALUE: "Un nombre traverse les générations",
  EVENT_AGE_MATCH: "Un âge rejoint une signature",
  EVENT_SIGNATURE_MATCH: "Une date importante fait écho",
  INTERVAL_MATCHES_SIGNATURE: "Un intervalle reproduit une signature",
  NUMBER_MIRROR: "Deux nombres se répondent",
  ORDINAL_MIRROR: "Deux jours de l’année forment un miroir",
  SHARED_VALUE: "Une valeur commune",
  SIMPLE_ARITHMETIC: "Une relation arithmétique simple",
  PALINDROME_VALUE: "Une valeur palindrome",
  SIMPLE_MULTIPLE: "Un multiple simple",
  WEEKDAY_MATCH: "Un même jour de semaine",
  SHARED_DERIVED_VALUE: "Une valeur relie plusieurs dimensions",
  REPEATED_DIFFERENCE: "Le même écart réapparaît",
  REPEATED_SUM: "La même somme se répète",
  CROSS_GENERATION_TRANSFER: "Une valeur passe entre les générations",
  MIRROR_CHAIN: "Une chaîne de nombres miroirs",
  PALINDROME_FAMILY: "Un palindrome partagé",
  MULTI_PERSON_CLUSTER: "Une valeur relie plusieurs personnes",
  CONVERGENT_NUMBER: "Plusieurs chemins convergent",
  SHARED_BIRTH_PLACE: "Un lieu relie plusieurs naissances",
  MULTI_EVENT_AGE_ECHO: "Deux âges rejoignent le même événement",
  PARENT_PAIR_CHILD_SUM: "Deux valeurs parentales se rejoignent chez un enfant",
  SIBLING_MULTI_DOMAIN_ECHO: "Une signature de fratrie particulièrement nette",
  EVENT_INTERVAL_ECHO: "Un intervalle rejoint une signature familiale",
});

const CATEGORY_LABELS = Object.freeze({ recurring: "Nombres récurrents", mirrors: "Effets miroir", generations: "Générations", siblings: "Entre les enfants", dates_times: "Dates & heures", events: "Événements", places: "Lieux", chronology: "Chronologie", curiosities: "Curiosités" });
const INTEREST_LABELS = Object.freeze({ HIGH: "✦✦✦ Correspondance très nette", MEDIUM: "✦✦ Correspondance intéressante", CURIOSITY: "✦ Curiosité numérique" });
const FORCE_LABELS = Object.freeze({ DIRECT: "Direct", STRONG: "Fort", NOTABLE: "Notable", SECONDARY: "Secondaire", EXPLORATORY: "Exploratoire" });

function names(observation, profileMap) {
  return observation.participantIds.map((id) => profileMap.get(id)?.firstName ?? "Une personne");
}

function joinNames(values) {
  return new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" }).format(values);
}

function describe(observation, profileMap, eventMap) {
  const people = names(observation, profileMap);
  const value = observation.values[0];
  switch (observation.type) {
    case "DATE_MIRROR": return `Le jour et le mois de ${people[0]} et ${people[1]} sont exactement inversés.`;
    case "MULTI_SIGNATURE_MATCH": return `${joinNames(people)} produisent le même ensemble : date ${observation.values[0]}, heure ${observation.values[1]}, puis total ${observation.values[2]}.`;
    case "CROSS_GENERATION_VALUE": return `Le ${value} change de place entre les générations : il apparaît directement comme jour chez certains membres et comme mois chez d’autres.`;
    case "INTERVAL_MATCHES_SIGNATURE": return `Un écart réel de ${value} minutes entre deux heures rejoint la somme de date d’un autre membre de la famille.`;
    case "EVENT_AGE_MATCH": return `Lors de « ${eventMap.get(observation.eventIds[0])?.title ?? "cet événement"} », l’âge de ${people[0]} rejoint exactement la somme des chiffres de sa date de naissance.`;
    case "EVENT_SIGNATURE_MATCH": return `La date de « ${eventMap.get(observation.eventIds[0])?.title ?? "cet événement"} » reprend une valeur déjà présente chez ${joinNames(people)}.`;
    case "NUMBER_MIRROR": return `${observation.values[0]} et ${observation.values[1]} utilisent les mêmes chiffres dans l’ordre inverse.`;
    case "ORDINAL_MIRROR": return `Les jours ordinaux ${observation.values[0]} et ${observation.values[1]} utilisent les mêmes chiffres en ordre miroir.`;
    case "SHARED_VALUE": return `La valeur ${value} apparaît indépendamment chez ${joinNames(people)}.`;
    case "SIMPLE_ARITHMETIC": return `Les valeurs de ${joinNames(people)} forment une égalité simple qui rejoint une signature déjà présente.`;
    case "PALINDROME_VALUE": return `${value} se lit de la même manière dans les deux sens. Ce motif reste une curiosité s’il n’est pas repris ailleurs.`;
    case "SIMPLE_MULTIPLE": return `${observation.values[1]} reprend exactement ${observation.values[0]} sous la forme d’un double ou d’un triple déjà présent dans la famille.`;
    case "SHARED_DERIVED_VALUE": return `La valeur ${value} apparaît dans plusieurs dimensions indépendantes chez ${joinNames(people)}.`;
    case "REPEATED_DIFFERENCE": return `Le même écart ${value} réapparaît dans ${observation.independentPathCount} dimensions indépendantes.`;
    case "REPEATED_SUM": return `La somme ${value} est obtenue par ${observation.independentPathCount} chemins distincts.`;
    case "CROSS_GENERATION_TRANSFER": return `La valeur ${value} traverse plusieurs générations sans dépendre d’une longue chaîne de calculs.`;
    case "MIRROR_CHAIN": return `Plusieurs inversions numériques se répondent autour de ${value}.`;
    case "PALINDROME_FAMILY": return `La valeur palindrome ${value} apparaît chez plusieurs membres de la constellation.`;
    case "MULTI_PERSON_CLUSTER": return `La valeur ${value} relie directement ou par une dérivation courte ${joinNames(people)}.`;
    case "CONVERGENT_NUMBER": return `La valeur ${value} est retrouvée par ${observation.independentPathCount} chemins indépendants issus de ${observation.sourceDiversity} catégories de données.`;
    case "SHARED_BIRTH_PLACE": return `${joinNames(people)} partagent le même lieu de naissance. Cette relation est géographique et directe ; aucun nombre n’est fabriqué à partir du nom du lieu.`;
    case "MULTI_EVENT_AGE_ECHO": return `Au même événement familial, l’âge de ${joinNames(people)} rejoint pour chacun la somme de sa propre date de naissance.`;
    case "PARENT_PAIR_CHILD_SUM": return `Deux valeurs directes des parents s’additionnent pour rejoindre une valeur directe chez ${people.at(-1)}.`;
    case "SIBLING_MULTI_DOMAIN_ECHO": return `${joinNames(people)} partagent la même somme de date et la même somme d’heure. Leur total commun en découle ; il n’est donc pas compté comme une troisième preuve indépendante.`;
    case "EVENT_INTERVAL_ECHO": return `La durée exacte entre deux événements rejoint une valeur déjà présente indépendamment dans la constellation.`;
    default: return `Une correspondance simple relie ${joinNames(people)} autour de ${observation.values.join(", ")}.`;
  }
}

export function buildFamilyConstellationReading({ analysis, profiles, events = [] }) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const observations = analysis.displayObservations ?? analysis.clusteredObservations ?? analysis.selectedObservations;
  const cards = observations.map((observation) => Object.freeze({
    id: observation.id,
    type: observation.type,
    category: observation.category,
    categoryLabel: CATEGORY_LABELS[observation.category] ?? "Correspondances",
    title: TITLES[observation.type] ?? "Un écho numérique",
    interest: observation.interest,
    interestLabel: INTEREST_LABELS[observation.interest],
    participantNames: Object.freeze(names(observation, profileMap)),
    values: observation.values,
    description: describe(observation, profileMap, eventMap),
    calculations: observation.calculations,
    facts: observation.facts,
    independentPathCount: observation.independentPathCount ?? 1,
    sourceDiversity: observation.sourceDiversity ?? 1,
    force: observation.force ?? (observation.interestScore >= 92 ? "DIRECT" : observation.interestScore >= 82 ? "STRONG" : observation.interestScore >= 68 ? "NOTABLE" : observation.interestScore >= 54 ? "SECONDARY" : "EXPLORATORY"),
    forceLabel: FORCE_LABELS[observation.force] ?? (observation.interestScore >= 92 ? "Direct" : observation.interestScore >= 82 ? "Fort" : observation.interestScore >= 68 ? "Notable" : observation.interestScore >= 54 ? "Secondaire" : "Exploratoire"),
    complexityCost: observation.complexityCost ?? observation.transformations ?? 0,
    evidenceIds: Object.freeze(observation.evidenceIds ?? observation.facts ?? []),
  }));
  const selected = [];
  const selectedKeys = new Set();
  for (const card of cards.filter(({ force }) => ["DIRECT", "STRONG", "NOTABLE"].includes(force))) {
    const key = `${card.category}|${card.values[0] ?? "none"}|${[...card.participantNames].sort().join(".")}`;
    if (selectedKeys.has(key)) continue;
    selectedKeys.add(key);
    selected.push(card);
    if (selected.length === 4) break;
  }
  const headline = selected.length
    ? `${selected.length === 1 ? "Un motif ressort" : `${selected.length} motifs ressortent`} particulièrement de cette constellation.`
    : cards.length
      ? "TAO observe quelques échos discrets, sans symétrie dominante."
      : "TAO n’a pas trouvé de symétrie particulièrement forte dans ces dates.";
  const synthesis = selected.length
    ? `Parmi les correspondances calculées, ${joinNames(selected.map(({ title }) => title.toLocaleLowerCase("fr-FR")))} ${selected.length === 1 ? "ressort" : "ressortent"} le plus clairement. ${selected.length === 1 ? "Elle a" : "Elles ont"} été retenue${selected.length === 1 ? "" : "s"} parce qu’${selected.length === 1 ? "elle repose" : "elles reposent"} sur des relations courtes et vérifiables, sans longue chaîne de transformations.`
    : "Aucun motif n’est forcé : l’absence de correspondance nette est aussi un résultat valable.";
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const section = (items = []) => Object.freeze(items.map(({ id }) => cardsById.get(id)).filter(Boolean));
  const sections = Object.freeze({
    parents: section(analysis.sections?.parents),
    parentChild: section(analysis.sections?.parentChild),
    siblings: section(analysis.sections?.siblings),
    generations: section(analysis.sections?.generations),
    mirrors: section(analysis.sections?.mirrors),
    events: section(analysis.sections?.events),
    places: section(analysis.sections?.places),
    chronology: section(analysis.sections?.chronology),
  });
  const dominantValues = [...new Set(selected.flatMap(({ values }) => values))];
  const overview = selected.length
    ? `${selected.length} structure${selected.length > 1 ? "s" : ""} ressort${selected.length > 1 ? "ent" : ""} réellement. ${dominantValues.length ? `Elles se répondent autour de ${joinNames(dominantValues.slice(0, 4).map(String))}, mais leur intérêt vient surtout de la manière dont ces valeurs circulent entre personnes, dates, heures et événements.` : "Leur intérêt vient de leur simplicité et de leur présence dans plusieurs branches de la famille."}`
    : "Peu de motifs structurés ressortent de ces données. TAO préfère conserver ce résultat sobre plutôt que fabriquer un axe familial artificiel.";
  return Object.freeze({
    headline,
    overview,
    synthesis,
    cards: Object.freeze(cards),
    primaryCards: Object.freeze(selected),
    sections,
    categoryLabels: CATEGORY_LABELS,
    forceLabels: FORCE_LABELS,
    disclaimer: "Ces correspondances sont des observations factuelles et structurelles. Elles ne prouvent ni causalité, ni destin, ni transmission surnaturelle.",
    methodology: "TAO calcule largement, filtre selon la simplicité, regroupe les résultats dépendants et ne retient que les motifs explicables par des preuves vérifiables.",
  });
}

export function familyObservationFacts(analysis) {
  return Object.freeze((analysis.displayObservations ?? analysis.clusteredObservations ?? analysis.selectedObservations).slice(0, 16).map((observation) => Object.freeze({
    id: observation.id,
    type: `FAMILY_${observation.type}`,
    value: observation.values.join("/"),
    label: observation.calculations.slice(0, 3).join(" · "),
  })));
}

export function formatEstimatedFrequency(frequency, simulationCount) {
  const minimumResolution = 1 / Math.max(1, Number(simulationCount) || 1);
  if (frequency <= minimumResolution * 1.5 || frequency < 0.01) return "< 1 %";
  const percentage = frequency * 100;
  return `≈ ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: percentage < 3 ? 1 : 0 }).format(percentage)} %`;
}

export function familyRarityLabel(category) {
  return ({
    COMMON: "Fréquente",
    FAIRLY_COMMON: "Assez courante",
    UNCOMMON: "Peu fréquente",
    RARE: "Rare dans la simulation",
    VERY_RARE: "Très rare dans la simulation",
  })[category] ?? "Estimation indisponible";
}
