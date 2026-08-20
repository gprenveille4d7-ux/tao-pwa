export const FAMILY_CONSTELLATION_LEXICON_VERSION = "tao-family-lexicon-fr-1.0.0";

const LABELS = Object.freeze({
  day: "jour de naissance", month: "mois de naissance", year: "année de naissance", dateDigitSum: "somme des chiffres de la date",
  reducedDate: "réduction de la date", hour: "heure", minutes: "minutes", timeDigitSum: "somme des chiffres de l’heure",
  reducedTime: "réduction de l’heure", dateTimeSum: "somme de la date et de l’heure", dayOfYear: "jour ordinal de l’année",
  isoWeek: "semaine civile", minutesSinceMidnight: "minutes écoulées depuis minuit", birthPlace: "lieu de naissance",
  DATE_MIRROR: "date miroir", MULTI_SIGNATURE_MATCH: "signature commune", CROSS_GENERATION_VALUE: "écho entre générations",
  EVENT_AGE_MATCH: "âge et date en écho", EVENT_SIGNATURE_MATCH: "événement en écho", INTERVAL_MATCHES_SIGNATURE: "intervalle en écho",
  NUMBER_MIRROR: "nombres miroirs", ORDINAL_MIRROR: "jours ordinaux miroirs", SHARED_VALUE: "valeur commune",
  SIMPLE_ARITHMETIC: "relation arithmétique simple", PALINDROME_VALUE: "valeur palindrome", SIMPLE_MULTIPLE: "multiple simple",
  SHARED_DERIVED_VALUE: "valeur dérivée commune", REPEATED_DIFFERENCE: "écart récurrent", REPEATED_SUM: "somme récurrente",
  CROSS_GENERATION_TRANSFER: "passage entre générations", MIRROR_CHAIN: "chaîne miroir", PALINDROME_FAMILY: "palindrome familial",
  MULTI_PERSON_CLUSTER: "motif multi-personnes", CONVERGENT_NUMBER: "nombre convergent", SHARED_BIRTH_PLACE: "lieu de naissance commun",
  MULTI_EVENT_AGE_ECHO: "âges communs lors d’un événement", PARENT_PAIR_CHILD_SUM: "somme parents-enfant",
  SIBLING_MULTI_DOMAIN_ECHO: "écho de fratrie", EVENT_INTERVAL_ECHO: "intervalle entre événements",
});

export function familyTechnicalLabel(key) {
  return LABELS[String(key)] ?? String(key).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("fr-FR"));
}

export function humanizeFamilyCalculation(value) {
  return String(value).replace(/\b(dateDigitSum|reducedDate|timeDigitSum|reducedTime|dateTimeSum|dayOfYear|isoWeek|minutesSinceMidnight|birthPlace)\b/g, (key) => familyTechnicalLabel(key));
}

export function listFamilyLexiconEntries() {
  return Object.freeze(Object.entries(LABELS).map(([key, label]) => Object.freeze({ key, label })));
}
