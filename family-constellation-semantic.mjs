const TITLES = Object.freeze({
  DATE_MIRROR: "Une date miroir",
  MULTI_SIGNATURE_MATCH: "Le même trio numérique",
  CROSS_GENERATION_VALUE: "Un nombre traverse les générations",
  EVENT_AGE_MATCH: "Un âge rejoint une signature",
  EVENT_SIGNATURE_MATCH: "Une date importante fait écho",
  INTERVAL_MATCHES_SIGNATURE: "Un intervalle reproduit une signature",
  NUMBER_MIRROR: "Deux nombres se répondent",
  SHARED_VALUE: "Une valeur commune",
  SIMPLE_ARITHMETIC: "Une relation arithmétique simple",
  PALINDROME_VALUE: "Une valeur palindrome",
  SIMPLE_MULTIPLE: "Un multiple simple",
  WEEKDAY_MATCH: "Un même jour de semaine",
});

const CATEGORY_LABELS = Object.freeze({ recurring: "Nombres récurrents", mirrors: "Miroirs", generations: "Générations", dates_times: "Dates & heures", events: "Événements", curiosities: "Curiosités" });
const INTEREST_LABELS = Object.freeze({ HIGH: "✦✦✦ Correspondance très nette", MEDIUM: "✦✦ Correspondance intéressante", CURIOSITY: "✦ Curiosité numérique" });

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
    case "SHARED_VALUE": return `La valeur ${value} apparaît indépendamment chez ${joinNames(people)}.`;
    case "SIMPLE_ARITHMETIC": return `Les valeurs de ${joinNames(people)} forment une égalité simple qui rejoint une signature déjà présente.`;
    case "PALINDROME_VALUE": return `${value} se lit de la même manière dans les deux sens. Ce motif reste une curiosité s’il n’est pas repris ailleurs.`;
    case "SIMPLE_MULTIPLE": return `${observation.values[1]} reprend exactement ${observation.values[0]} sous la forme d’un double ou d’un triple déjà présent dans la famille.`;
    default: return `Une correspondance simple relie ${joinNames(people)} autour de ${observation.values.join(", ")}.`;
  }
}

export function buildFamilyConstellationReading({ analysis, profiles, events = [] }) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const observations = analysis.clusteredObservations ?? analysis.selectedObservations;
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
  }));
  const strong = cards.filter(({ interest }) => interest === "HIGH");
  const headline = strong.length
    ? `TAO a trouvé ${strong.length} correspondance${strong.length > 1 ? "s" : ""} particulièrement nette${strong.length > 1 ? "s" : ""} dans cette constellation.`
    : cards.length
      ? "TAO observe quelques échos discrets, sans symétrie dominante."
      : "TAO n’a pas trouvé de symétrie particulièrement forte dans ces dates.";
  const selected = cards.slice(0, 3);
  const synthesis = selected.length
    ? `Parmi les correspondances calculées, ${joinNames(selected.map(({ title }) => title.toLocaleLowerCase("fr-FR")))} ${selected.length === 1 ? "ressort" : "ressortent"} le plus clairement. ${selected.length === 1 ? "Elle a" : "Elles ont"} été retenue${selected.length === 1 ? "" : "s"} parce qu’${selected.length === 1 ? "elle repose" : "elles reposent"} sur des relations courtes et vérifiables, sans longue chaîne de transformations.`
    : "Aucun motif n’est forcé : l’absence de correspondance nette est aussi un résultat valable.";
  return Object.freeze({ headline, synthesis, cards: Object.freeze(cards), primaryCards: Object.freeze(selected), categoryLabels: CATEGORY_LABELS, disclaimer: "Ces correspondances sont des observations mathématiques et symboliques. Elles ne prouvent pas qu’un nombre influence les événements." });
}

export function familyObservationFacts(analysis) {
  return Object.freeze((analysis.clusteredObservations ?? analysis.selectedObservations).slice(0, 16).map((observation) => Object.freeze({
    id: observation.id,
    type: `FAMILY_${observation.type}`,
    value: observation.values.join("/"),
    label: observation.calculations.slice(0, 3).join(" · "),
  })));
}
