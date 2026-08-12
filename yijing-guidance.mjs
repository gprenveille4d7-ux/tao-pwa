const RHYTHMS = Object.freeze({
  qian: "agir maintenant avec une direction nette",
  zhen: "mettre en mouvement un premier geste mesuré",
  li: "clarifier avant d’intensifier",
  dui: "ouvrir le dialogue",
  xun: "transformer progressivement",
  kan: "observer et sécuriser le passage",
  gen: "attendre et consolider",
  kun: "préparer et laisser mûrir",
});

function unique(values, limit = 4) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function lineGuidance(result) {
  return result.changingLines.map((lineNumber) => {
    const reading = result.primary.lineReadings[lineNumber - 1];
    return Object.freeze({ line: lineNumber, title: reading.title, text: reading.text });
  });
}

function profileResonance(profileContext, result) {
  if (!profileContext?.dayMaster) return null;
  const qualities = {
    wood: "croissance et souplesse",
    fire: "expression et clarté",
    earth: "stabilité et continuité",
    metal: "discernement et structure",
    water: "écoute et profondeur",
  };
  const quality = qualities[profileContext.dayMaster.element];
  return Object.freeze({
    title: "Résonance avec ton profil",
    text: `Ton Maître du Jour est ${profileContext.dayMaster.label}. Sans fusionner les deux systèmes, la lecture peut être mise en regard de ta manière naturelle d’aborder ${quality}. Ici, « ${result.primary.french} » t’invite surtout à ${result.primary.posture}. Garde ce rapprochement comme un angle de réflexion, non comme une règle personnelle.`,
  });
}

export function createYijingGuidance({ question, result, profileContext = null }) {
  if (!question?.trim() || !result?.primary) throw new TypeError("Question et tirage résolu requis.");
  const primary = result.primary;
  const transformed = result.transformed;
  const movement = transformed
    ? `Les lignes ${result.changingLines.join(", ")} déplacent la lecture de « ${primary.french} » vers « ${transformed.french} ». Il ne s’agit pas d’une prédiction : ce passage décrit une transformation possible, de ${primary.theme} vers ${transformed.theme}.`
    : `Aucune ligne ne mute. Le signe « ${primary.french} » reste le centre de gravité du tirage : approfondis ${primary.theme} avant de chercher une autre direction.`;
  const essential = [
    `À propos de « ${question.trim()} », TAO retient d’abord ${primary.theme}.`,
    `Le signe ${primary.number}, ${primary.french}, suggère de ${primary.posture}.`,
    `Il ne ferme pas la situation : il propose un point d’observation et une manière d’y entrer avec davantage de conscience.`,
  ];
  const supports = unique([...primary.strengths, ...(transformed?.strengths ?? [])]);
  const cautions = unique([...primary.risks.slice(0, 2), ...(transformed?.risks.slice(0, 1) ?? [])]);
  const actions = unique([
    primary.posture,
    result.changingLines.length ? "relire chaque mutation comme un seuil plutôt que comme un verdict" : "rester assez longtemps avec le signe principal pour en éprouver la justesse",
    transformed?.posture,
    "confronter cette lecture aux faits concrets avant de décider",
  ]);
  return Object.freeze({
    essential: Object.freeze(essential),
    movement,
    supports: Object.freeze(supports),
    cautions: Object.freeze(cautions),
    actions: Object.freeze(actions),
    reflection: transformed?.reflection ?? primary.reflection,
    rhythm: RHYTHMS[transformed?.upper ?? primary.upper],
    lineReadings: Object.freeze(lineGuidance(result)),
    profile: profileResonance(profileContext, result),
    symbolicNotice: "Cette lecture est symbolique et traditionnelle. Elle éclaire une dynamique possible sans prédire l’avenir ni remplacer ton discernement.",
  });
}

