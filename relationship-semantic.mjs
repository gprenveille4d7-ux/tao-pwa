import { getSemanticConcept } from "./semantic-layer.mjs?v=1.0.1";

const ELEMENT_RELATIONS = Object.freeze({
  same: ({ left, right, leftElementOf }) => `${left} et ${right} partagent une énergie fondamentale ${leftElementOf}. Cette proximité peut faciliter la reconnaissance mutuelle, sans rendre leurs manières d’agir identiques.`,
  left_generates_right: ({ left, right, leftEnergy, rightEnergy }) => `Dans le cycle des Cinq Éléments, ${leftEnergy} nourrit ${rightEnergy}. Ce mouvement peut soutenir l’élan de ${right}, à condition que ${left} ne porte pas seul toute l’impulsion.`,
  right_generates_left: ({ left, right, leftEnergy, rightEnergy }) => `Dans le cycle des Cinq Éléments, ${rightEnergy} nourrit ${leftEnergy}. Ce mouvement peut soutenir l’élan de ${left}, à condition que ${right} conserve aussi son propre espace.`,
  left_controls_right: ({ leftEnergy, rightEnergy }) => `${leftEnergy} et ${rightEnergy} se rencontrent dans une relation de cadrage. Elle peut apporter de la structure, mais demande d’éviter que le cadre devienne pression.`,
  right_controls_left: ({ leftEnergy, rightEnergy }) => `${rightEnergy} et ${leftEnergy} se rencontrent dans une relation de cadrage. Elle peut clarifier la relation, mais gagne à laisser une place réelle aux deux rythmes.`,
  indirect: ({ left, right }) => `${left} et ${right} ne présentent pas de relation élémentaire directe dominante entre leurs Maîtres du Jour. Les autres composantes de leurs thèmes gardent donc une place importante dans la lecture.`,
});

const TYPE_GUIDANCE = Object.freeze({
  couple: ["Distinguez ce qui relève d’un besoin affectif de ce qui relève d’un rythme personnel.", "Préservez un espace de dialogue où chacun peut nommer ses attentes sans conclure trop vite sur l’autre."],
  parent_child: ["Adaptez les attentes à la place et au degré d’autonomie de chacun.", "Cherchez le cadre qui protège sans empêcher l’autre de développer sa propre manière d’avancer."],
  family: ["Ne laissez pas les habitudes familiales parler à la place de chacun.", "Formulez les limites et les besoins avec simplicité, sans chercher à résoudre toute l’histoire familiale en une fois."],
  friendship: ["Appuyez-vous sur ce qui rend la présence simple et réciproque.", "Laissez les différences de rythme exister sans les interpréter comme un manque d’amitié."],
  work: ["Clarifiez les rôles, le niveau d’autonomie et la manière de décider.", "Utilisez vos différences comme une répartition de fonctions, plutôt que comme une compétition de méthodes."],
  other: ["Observez ce qui facilite réellement la circulation entre vous.", "Nommez les ajustements utiles avant qu’ils ne deviennent des suppositions sur l’autre."],
});

const FOCUS_GUIDANCE = Object.freeze({
  general: "Commencez par observer la dynamique d’ensemble avant de chercher une conclusion.",
  differences: "Traitez la différence comme une information sur vos rythmes, pas comme la preuve qu’un seul a raison.",
  communication: "Reformulez ce que vous avez compris avant de répondre ; vos repères ne se présentent pas forcément dans le même ordre.",
  difficult_period: "Dans une période sensible, réduisez les interprétations hâtives et revenez à des faits concrets, proches et vérifiables.",
  better_together: "Choisissez un petit ajustement réciproque que vous pouvez réellement essayer, plutôt qu’une promesse générale.",
});

const AXIS_LABELS = Object.freeze({
  complementarity: "Complémentarité",
  similarity: "Similarité",
  mutualSupport: "Soutien mutuel",
  friction: "Zones de friction",
  adaptation: "Adaptation",
});

const LEVEL_LABELS = Object.freeze({
  strong: "Forte",
  present: "Présente",
  balanced: "Équilibré",
  subtle: "Subtile",
  important: "Importante",
  gentle: "Souple",
  low: "Peu marquée",
});

function labelElement(key) {
  return getSemanticConcept("elements", key).technicalLabel;
}

function elementGrammar(key) {
  const label = labelElement(key);
  if (key === "water") return { subject: "l’Eau", of: "de l’Eau" };
  if (key === "earth") return { subject: "la Terre", of: "de la Terre" };
  return { subject: `le ${label}`, of: `du ${label}` };
}

function personComplement(name) {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(name) ? `d’${name}` : `de ${name}`;
}

function describeInteraction(interaction) {
  const semantic = getSemanticConcept("interactions", interaction.type);
  return {
    title: semantic.humanLabel,
    text: `${interaction.left.branch.name} · ${interaction.left.branch.chinese} et ${interaction.right.branch.name} · ${interaction.right.branch.chinese} : ${semantic.humanDescription}`,
    relationalFocus: interaction.relationalFocus,
  };
}

function directionText(observerName, otherName, tenGodId) {
  const semantic = getSemanticConcept("tenGods", tenGodId);
  return {
    title: `Ce que ${otherName} met en mouvement chez ${observerName}`,
    text: `Du point de vue du Maître du Jour de ${observerName}, l’énergie fondamentale de ${otherName} rejoint la dynamique « ${semantic.humanLabel} ». ${semantic.humanDescription}`,
    technical: `${semantic.technicalFrench} · ${semantic.traditionalLabel}`,
  };
}

function differenceText(comparison, names) {
  const left = comparison.dayMasters.left;
  const right = comparison.dayMasters.right;
  if (left.element === right.element && left.polarity !== right.polarity) {
    return `${names.left} et ${names.right} partagent le même Élément, mais l’un l’exprime sur un mode Yang et l’autre sur un mode Yin. La direction est proche ; le rythme et la manière de la rendre visible peuvent différer.`;
  }
  if (left.polarity === right.polarity) {
    return `Vos Maîtres du Jour partagent une polarité ${left.polarity === "yang" ? "Yang" : "Yin"}. Cette similitude de mouvement peut créer un rythme commun, mais aussi amplifier les mêmes réflexes.`;
  }
  return `Vos polarités fondamentales diffèrent : ${names.left} porte ici un mouvement ${left.polarity === "yang" ? "Yang" : "Yin"}, tandis que ${names.right} porte un mouvement ${right.polarity === "yang" ? "Yang" : "Yin"}. Cette différence peut devenir une alternance utile si elle n’est pas vécue comme une opposition de valeur.`;
}

export function buildRelationshipSemanticReading({ comparison, leftProfile, rightProfile }) {
  const names = { left: leftProfile.firstName, right: rightProfile.firstName };
  const leftStem = getSemanticConcept("stems", comparison.dayMasters.left.key);
  const rightStem = getSemanticConcept("stems", comparison.dayMasters.right.key);
  const leftGrammar = elementGrammar(comparison.dayMasters.left.element);
  const rightGrammar = elementGrammar(comparison.dayMasters.right.element);
  const context = {
    ...names,
    leftElementSubject: leftGrammar.subject,
    leftElementOf: leftGrammar.of,
    rightElementSubject: rightGrammar.subject,
    rightElementOf: rightGrammar.of,
    leftEnergy: `${leftGrammar.subject} ${personComplement(names.left)}`,
    rightEnergy: `${rightGrammar.subject} ${personComplement(names.right)}`,
  };
  const elementSummary = ELEMENT_RELATIONS[comparison.elementRelation](context);
  const interactions = comparison.interactions.map(describeInteraction);
  const combinations = interactions.filter((_, index) => comparison.interactions[index].type === "combination");
  const clashes = interactions.filter((_, index) => comparison.interactions[index].type === "clash");
  const leftToRight = directionText(names.left, names.right, comparison.tenGods.leftToRight);
  const rightToLeft = directionText(names.right, names.left, comparison.tenGods.rightToLeft);
  const coupleDayFocus = comparison.relationshipType === "couple"
    ? interactions.filter(({ relationalFocus }) => relationalFocus)
    : [];

  const closeness = [
    elementSummary,
    combinations[0]?.text,
    `${leftStem.humanTitle} et ${rightStem.humanTitle} décrivent deux manières distinctes d’entrer dans le mouvement ; leur rencontre peut devenir une ressource lorsqu’elle reste consciente.`,
  ].filter(Boolean).slice(0, 3);
  const differences = [differenceText(comparison, names), clashes[0]?.text].filter(Boolean).slice(0, 3);
  const adjustments = clashes.length
    ? clashes.slice(0, 3).map(({ text }) => text)
    : ["Aucune opposition majeure n’apparaît entre les Branches comparées. Cela ne signifie pas une relation sans difficulté : les habitudes, le contexte et la parole restent déterminants."];
  if (coupleDayFocus.length) {
    adjustments.unshift(`Dans une lecture de couple, les Branches du Jour forment ici un repère relationnel particulier. ${coupleDayFocus[0].text}`);
  }

  return Object.freeze({
    title: `${names.left} & ${names.right}`,
    eyebrow: "Relations & harmonie",
    summary: elementSummary,
    archetypes: Object.freeze([
      { name: names.left, title: leftStem.humanTitle, traditional: leftStem.traditionalLabel, technical: leftStem.technicalFrench },
      { name: names.right, title: rightStem.humanTitle, traditional: rightStem.traditionalLabel, technical: rightStem.technicalFrench },
    ]),
    axes: Object.freeze(Object.entries(comparison.axes).map(([id, level]) => Object.freeze({ id, label: AXIS_LABELS[id], level, levelLabel: LEVEL_LABELS[level] }))),
    closeness: Object.freeze(closeness),
    differences: Object.freeze(differences),
    directions: Object.freeze([leftToRight, rightToLeft]),
    adjustments: Object.freeze(adjustments.slice(0, 3)),
    recommendations: Object.freeze([...TYPE_GUIDANCE[comparison.relationshipType], FOCUS_GUIDANCE[comparison.focus]].slice(0, 3)),
    technical: Object.freeze([
      `${names.left} : ${leftStem.traditionalLabel} — ${leftStem.technicalFrench}`,
      `${names.right} : ${rightStem.traditionalLabel} — ${rightStem.technicalFrench}`,
      `${names.left} vers ${names.right} : ${leftToRight.technical}`,
      `${names.right} vers ${names.left} : ${rightToLeft.technical}`,
      ...interactions.slice(0, 4).map(({ title, text }) => `${title} — ${text}`),
    ]),
    disclaimer: "Cette lecture décrit des dynamiques symboliques de fond. Elle ne mesure ni la valeur, ni la solidité, ni l’avenir d’une relation.",
    axisDisclaimer: "Ces repères sont des indicateurs de lecture propres à TAO. Ils ne constituent ni des notes ni une mesure objective.",
    cyclesNote: "Les cycles relationnels ne sont pas inclus dans cette première lecture. Aucun climat temporel n’est simulé sans calcul déterministe dédié.",
  });
}
