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

const GOAL_PRESENTATION = Object.freeze({
  overview: Object.freeze({
    label: "Comprendre la relation dans son ensemble",
    question: "Comment fonctionne votre relation ?",
    priorities: Object.freeze(["fonctionnement global", "complémentarités", "soutien mutuel", "points de tension"]),
  }),
  differences: Object.freeze({
    label: "Mieux comprendre vos différences",
    question: "Pourquoi ne fonctionnez-vous pas toujours de la même façon ?",
    priorities: Object.freeze(["besoins différents", "rythmes", "réactions", "complémentarités issues des différences"]),
  }),
  communication: Object.freeze({
    label: "Améliorer votre communication",
    question: "Comment mieux vous entendre et vous répondre ?",
    priorities: Object.freeze(["expression des besoins", "écoute", "rythme de réponse", "désaccords"]),
  }),
  difficult_period: Object.freeze({
    label: "Traverser une période difficile",
    question: "Sur quoi pouvez-vous vous appuyer lorsque les choses deviennent difficiles ?",
    priorities: Object.freeze(["ressources relationnelles", "fragilités potentielles", "apaisement", "besoins fondamentaux"]),
  }),
  cooperation: Object.freeze({
    label: "Mieux fonctionner ensemble",
    question: "Comment tirer le meilleur de votre fonctionnement à deux ?",
    priorities: Object.freeze(["coopération", "organisation", "prise de décision", "complémentarités pratiques"]),
  }),
});

const TYPE_LABELS = Object.freeze({ couple: "Couple", parent_child: "Parent et enfant", family: "Famille", friendship: "Amitié", work: "Travail", other: "Autre" });

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

function communicationText(comparison, names) {
  const left = comparison.dayMasters.left;
  const right = comparison.dayMasters.right;
  if (left.polarity !== right.polarity) {
    return `${names.left} et ${names.right} n’exposent pas nécessairement leur position au même rythme. Le mouvement ${left.polarity === "yang" ? "Yang" : "Yin"} de ${names.left} et le mouvement ${right.polarity === "yang" ? "Yang" : "Yin"} de ${names.right} invitent à laisser une place distincte à l’expression et à l’intégration.`;
  }
  return `${names.left} et ${names.right} partagent une polarité ${left.polarity === "yang" ? "Yang" : "Yin"}. Dans un échange, ce tempo commun peut faciliter l’élan, mais aussi amplifier un même réflexe si personne ne ralentit pour reformuler.`;
}

function goalSummary({ comparison, names, elementSummary, difference }) {
  switch (comparison.relationshipGoal) {
    case "differences":
      return `${difference} L’enjeu n’est pas de réduire cet écart, mais de comprendre ce que chacun essaie de protéger ou de rendre possible.`;
    case "communication":
      return `${communicationText(comparison, names)} La qualité du dialogue dépend ici moins d’une parole parfaite que d’un rythme suffisamment lisible pour les deux.`;
    case "difficult_period":
      return comparison.tensionDynamics.length
        ? `Cette lecture ne suppose aucune crise. Elle met d’abord en lumière les appuis disponibles, puis les mécanismes symboliques susceptibles d’amplifier une tension lorsqu’elle existe.`
        : `Cette lecture ne suppose aucune crise. Les faits calculés montrent surtout des ressources de soutien ; elles peuvent servir de point d’appui lorsque le contexte devient plus sensible.`;
    case "cooperation":
      return comparison.elementRelation.includes("generates")
        ? `Votre dynamique élémentaire décrit un mouvement de soutien orienté. Dans l’action, cette asymétrie peut devenir une répartition utile si l’impulsion de l’un ne se transforme pas en charge permanente.`
        : `Votre manière de fonctionner ensemble gagne à rendre explicites les rôles, les décisions et les temps d’ajustement. Les faits BaZi restent les mêmes ; cette lecture observe leur portée pratique.`;
    default:
      return elementSummary;
  }
}

function goalRecommendations({ comparison, communication, typeGuidance }) {
  switch (comparison.relationshipGoal) {
    case "differences":
      return [
        "Nommez une différence de rythme sans la transformer en défaut de caractère.",
        "Demandez à l’autre ce dont il a besoin avant de conclure à partir de votre propre manière de fonctionner.",
        typeGuidance,
      ];
    case "communication":
      return [
        "Lors d’un désaccord, reformulez d’abord ce que vous avez compris avant de proposer une solution.",
        communication,
        "Si le rythme monte, accordez-vous un temps d’intégration clairement annoncé plutôt qu’un silence ambigu.",
      ];
    case "difficult_period":
      return [
        "Revenez à un fait concret et proche avant d’interpréter l’intention de l’autre.",
        "Préservez ce qui soutient déjà la relation au lieu de chercher à tout résoudre en une fois.",
        typeGuidance,
      ];
    case "cooperation":
      return [
        "Distinguez qui initie, qui structure et comment la décision finale est partagée.",
        "Confiez à chacun une responsabilité lisible, puis prévoyez un point d’ajustement commun.",
        typeGuidance,
      ];
    default:
      return [
        "Commencez par observer la dynamique d’ensemble avant de chercher une conclusion.",
        typeGuidance,
        "Choisissez un ajustement simple et réciproque plutôt qu’une promesse générale.",
      ];
  }
}

function goalSections({ comparison, closeness, differences, directions, adjustments, recommendations, communication, elementSummary }) {
  switch (comparison.relationshipGoal) {
    case "differences":
      return [
        { id: "different-rhythms", title: "Deux manières d’entrer en mouvement", values: differences },
        { id: "misunderstandings", title: "Ce qui peut être mal interprété", values: [communication, ...adjustments].slice(0, 3) },
        { id: "difference-resource", title: "Ce que vos différences peuvent apporter", values: [elementSummary, ...directions.map(({ text }) => text)].slice(0, 3) },
        { id: "difference-action", title: "Un repère concret", values: recommendations },
      ];
    case "communication":
      return [
        { id: "communication-entry", title: "Votre manière d’entrer dans l’échange", values: [communication, ...directions.map(({ text }) => text)].slice(0, 3) },
        { id: "communication-friction", title: "Quand le rythme se désaccorde", values: adjustments },
        { id: "communication-needs", title: "Rendre les besoins plus lisibles", values: differences.slice(0, 2) },
        { id: "communication-action", title: "À essayer lors du prochain échange", values: recommendations },
      ];
    case "difficult_period":
      return [
        { id: "crisis-support", title: "Vos appuis lorsque le contexte se tend", values: closeness },
        { id: "crisis-amplifiers", title: "Ce qui peut amplifier une tension", values: adjustments },
        { id: "crisis-needs", title: "Ce que chacun gagne à préserver", values: [...differences, ...directions.map(({ text }) => text)].slice(0, 3) },
        { id: "crisis-action", title: "Une voie d’apaisement", values: recommendations },
      ];
    case "cooperation":
      return [
        { id: "cooperation-roles", title: "Votre répartition naturelle", values: [elementSummary, ...directions.map(({ text }) => text)].slice(0, 3) },
        { id: "cooperation-decisions", title: "Décider et avancer ensemble", values: recommendations },
        { id: "cooperation-friction", title: "Les frottements possibles dans l’action", values: adjustments },
        { id: "cooperation-assets", title: "Vos complémentarités pratiques", values: closeness },
      ];
    default:
      return [
        { id: "overview-closeness", title: "Ce qui vous rapproche", values: closeness },
        { id: "overview-differences", title: "Vos différences", values: differences },
        { id: "overview-adjustments", title: "Ce qui demande un ajustement", values: adjustments },
        { id: "overview-action", title: "Ce que vous pouvez cultiver", values: recommendations },
      ];
  }
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

  const difference = differenceText(comparison, names);
  const communication = communicationText(comparison, names);
  const closeness = [
    elementSummary,
    combinations[0]?.text,
    `${leftStem.humanTitle} et ${rightStem.humanTitle} décrivent deux manières distinctes d’entrer dans le mouvement ; leur rencontre peut devenir une ressource lorsqu’elle reste consciente.`,
  ].filter(Boolean).slice(0, 3);
  const differences = [difference, clashes[0]?.text].filter(Boolean).slice(0, 3);
  const adjustments = clashes.length
    ? clashes.slice(0, 3).map(({ text }) => text)
    : ["Aucune opposition majeure n’apparaît entre les Branches comparées. Cela ne signifie pas une relation sans difficulté : les habitudes, le contexte et la parole restent déterminants."];
  if (coupleDayFocus.length) {
    adjustments.unshift(`Dans une lecture de couple, les Branches du Jour forment ici un repère relationnel particulier. ${coupleDayFocus[0].text}`);
  }
  const goal = GOAL_PRESENTATION[comparison.relationshipGoal];
  const recommendations = goalRecommendations({ comparison, communication, typeGuidance: TYPE_GUIDANCE[comparison.relationshipType][0] });
  const sections = goalSections({ comparison, closeness, differences, directions: [leftToRight, rightToLeft], adjustments, recommendations, communication, elementSummary });
  const priorityFacts = comparison.priorityFacts.slice(0, 5).map((fact) => ({
    id: fact.id,
    label: fact.label,
    reason: `Retenu pour l’angle « ${goal.label.toLowerCase()} »`,
  }));

  return Object.freeze({
    title: `${names.left} & ${names.right}`,
    eyebrow: "Relations & harmonie",
    relationshipGoal: comparison.relationshipGoal,
    goalLabel: goal.label,
    goalQuestion: goal.question,
    relationshipTypeLabel: TYPE_LABELS[comparison.relationshipType],
    contextLabel: `${TYPE_LABELS[comparison.relationshipType]} · ${goal.label}`,
    summary: goalSummary({ comparison, names, elementSummary, difference }),
    archetypes: Object.freeze([
      { name: names.left, title: leftStem.humanTitle, traditional: leftStem.traditionalLabel, technical: leftStem.technicalFrench },
      { name: names.right, title: rightStem.humanTitle, traditional: rightStem.traditionalLabel, technical: rightStem.technicalFrench },
    ]),
    axes: Object.freeze(Object.entries(comparison.axes).map(([id, level]) => Object.freeze({ id, label: AXIS_LABELS[id], level, levelLabel: LEVEL_LABELS[level] }))),
    closeness: Object.freeze(closeness),
    differences: Object.freeze(differences),
    directions: Object.freeze([leftToRight, rightToLeft]),
    adjustments: Object.freeze(adjustments.slice(0, 3)),
    recommendations: Object.freeze(recommendations),
    sections: Object.freeze(sections.map((section) => Object.freeze({ ...section, values: Object.freeze(section.values.filter(Boolean).slice(0, 3)) }))),
    priorityFacts: Object.freeze(priorityFacts.map((fact) => Object.freeze(fact))),
    conclusion: recommendations[0],
    aiPrompt: `OBJECTIF DE L’UTILISATEUR : ${goal.label}. Interprète uniquement les faits relationnels transmis sous cet angle. Priorise : ${goal.priorities.join(", ")}. N’invente aucun conflit ni aucune donnée BaZi.`,
    technical: Object.freeze([
      `${names.left} : ${leftStem.traditionalLabel} — ${leftStem.technicalFrench}`,
      `${names.right} : ${rightStem.traditionalLabel} — ${rightStem.technicalFrench}`,
      `${names.left} vers ${names.right} : ${leftToRight.technical}`,
      `${names.right} vers ${names.left} : ${rightToLeft.technical}`,
      `Objectif appliqué : ${comparison.relationshipGoal}`,
      `Clé d’analyse : ${comparison.analysisKey}`,
      ...interactions.slice(0, 4).map(({ title, text }) => `${title} — ${text}`),
    ]),
    disclaimer: "Cette lecture décrit des dynamiques symboliques de fond. Elle ne mesure ni la valeur, ni la solidité, ni l’avenir d’une relation.",
    axisDisclaimer: "Ces repères sont des indicateurs de lecture propres à TAO. Ils ne constituent ni des notes ni une mesure objective.",
    cyclesNote: "Les cycles relationnels ne sont pas inclus dans cette première lecture. Aucun climat temporel n’est simulé sans calcul déterministe dédié.",
  });
}
