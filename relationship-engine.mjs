import { tenGodFor } from "./bazi-insights.mjs";

export const RELATIONSHIP_READING_VERSION = "tao-relationship-1.1.0";

export const RELATIONSHIP_TYPES = Object.freeze([
  "couple",
  "parent_child",
  "family",
  "friendship",
  "work",
  "other",
]);

export const RELATIONSHIP_GOALS = Object.freeze([
  "overview",
  "differences",
  "communication",
  "difficult_period",
  "cooperation",
]);

// Conservé comme alias public pendant la migration des composants existants.
export const RELATIONSHIP_FOCUSES = RELATIONSHIP_GOALS;

const LEGACY_GOALS = Object.freeze({ general: "overview", better_together: "cooperation" });

export const RELATIONSHIP_GOAL_MATRIX = Object.freeze({
  overview: Object.freeze({ dimensions: Object.freeze({ overview: 6, support: 3, complementarity: 3, tension: 2, differences: 1 }) }),
  differences: Object.freeze({ dimensions: Object.freeze({ differences: 6, communication: 3, complementarity: 2, tension: 2, overview: 1 }) }),
  communication: Object.freeze({ dimensions: Object.freeze({ communication: 6, differences: 3, tension: 3, adaptation: 2, support: 1 }) }),
  difficult_period: Object.freeze({ dimensions: Object.freeze({ difficult_period: 6, tension: 5, support: 4, adaptation: 3, communication: 2 }) }),
  cooperation: Object.freeze({ dimensions: Object.freeze({ cooperation: 6, complementarity: 5, adaptation: 4, support: 2, tension: 1 }) }),
});

export function normalizeRelationshipGoal(value = "overview") {
  const normalized = LEGACY_GOALS[value] ?? value;
  assertChoice(normalized, RELATIONSHIP_GOALS, "Objectif relationnel");
  return normalized;
}

const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const CROSS_BRANCH_RELATIONS = Object.freeze({
  combination: Object.freeze([["zi", "chou"], ["yin", "hai"], ["mao", "xu"], ["chen", "you"], ["si", "shen"], ["wu", "wei"]]),
  clash: Object.freeze([["zi", "wu"], ["chou", "wei"], ["yin", "shen"], ["mao", "you"], ["chen", "xu"], ["si", "hai"]]),
});

function assertChoice(value, allowed, label) {
  if (!allowed.includes(value)) throw new TypeError(`${label} inconnu : ${value}`);
}

function assertTheme(theme, label) {
  if (!theme?.dayMaster?.key || !theme?.dayMaster?.element || !theme?.dayMaster?.polarity) {
    throw new TypeError(`Le thème ${label} ne contient pas de Maître du Jour déterminé.`);
  }
}

export function elementRelation(leftElement, rightElement) {
  if (leftElement === rightElement) return "same";
  if (GENERATES[leftElement] === rightElement) return "left_generates_right";
  if (GENERATES[rightElement] === leftElement) return "right_generates_left";
  if (CONTROLS[leftElement] === rightElement) return "left_controls_right";
  if (CONTROLS[rightElement] === leftElement) return "right_controls_left";
  return "indirect";
}

function determinedBranches(theme, side) {
  return Object.entries(theme.pillars ?? {}).flatMap(([pillarId, pillar]) =>
    pillar?.determined && pillar.branch?.key
      ? [{ side, pillarId, key: pillar.branch.key, branch: pillar.branch }]
      : []);
}

function isPair(left, right, pair) {
  return (left === pair[0] && right === pair[1]) || (left === pair[1] && right === pair[0]);
}

export function crossBranchRelations(leftTheme, rightTheme) {
  const leftBranches = determinedBranches(leftTheme, "left");
  const rightBranches = determinedBranches(rightTheme, "right");
  const detected = [];
  for (const left of leftBranches) {
    for (const right of rightBranches) {
      for (const [type, pairs] of Object.entries(CROSS_BRANCH_RELATIONS)) {
        if (pairs.some((pair) => isPair(left.key, right.key, pair))) {
          detected.push(Object.freeze({
            id: `${type}.${left.pillarId}.${left.key}.${right.pillarId}.${right.key}`,
            type,
            left,
            right,
            relationalFocus: left.pillarId === "day" && right.pillarId === "day",
          }));
        }
      }
    }
  }
  return Object.freeze(detected);
}

function elementDistance(leftTheme, rightTheme) {
  return Object.keys(GENERATES).reduce((total, key) => {
    const left = Number(leftTheme.elements?.[key]?.ratio ?? 0);
    const right = Number(rightTheme.elements?.[key]?.ratio ?? 0);
    return total + Math.abs(left - right);
  }, 0);
}

function qualitativeAxes({ leftTheme, rightTheme, relation, interactions }) {
  const clashes = interactions.filter(({ type }) => type === "clash").length;
  const combinations = interactions.filter(({ type }) => type === "combination").length;
  const sameElement = leftTheme.dayMaster.element === rightTheme.dayMaster.element;
  const samePolarity = leftTheme.dayMaster.polarity === rightTheme.dayMaster.polarity;
  const distance = elementDistance(leftTheme, rightTheme);
  const generative = relation.includes("generates");
  const controlling = relation.includes("controls");

  return Object.freeze({
    complementarity: generative || combinations >= 2 ? "strong" : controlling || combinations === 1 ? "present" : "subtle",
    similarity: sameElement && samePolarity ? "strong" : sameElement || distance <= 0.55 ? "present" : "subtle",
    mutualSupport: generative || combinations > clashes ? "present" : sameElement ? "balanced" : "subtle",
    friction: clashes >= 2 ? "important" : clashes === 1 || controlling ? "present" : "low",
    adaptation: clashes >= 2 || (controlling && !sameElement) ? "important" : samePolarity && sameElement ? "gentle" : "balanced",
  });
}

function stableFact({ id, type, value, label, strength, dimensions, role = "neutral" }) {
  return Object.freeze({ id, type, value, label, strength, dimensions: Object.freeze(dimensions), role });
}

function makeStableFacts({ leftProfile, rightProfile, leftTheme, rightTheme, relation, leftTenGod, rightTenGod, interactions, axes }) {
  const facts = [
    stableFact({ id: "relation_left_daymaster", type: "RELATION_DAY_MASTER", value: leftTheme.dayMaster.key, label: `${leftProfile.firstName} : ${leftTheme.dayMaster.name} ${leftTheme.dayMaster.chinese}`, strength: 0.92, dimensions: ["overview", "differences", "communication"] }),
    stableFact({ id: "relation_right_daymaster", type: "RELATION_DAY_MASTER", value: rightTheme.dayMaster.key, label: `${rightProfile.firstName} : ${rightTheme.dayMaster.name} ${rightTheme.dayMaster.chinese}`, strength: 0.92, dimensions: ["overview", "differences", "communication"] }),
    stableFact({ id: "relation_element_dynamic", type: "RELATION_ELEMENT_DYNAMIC", value: relation, label: `${leftTheme.dayMaster.element} / ${rightTheme.dayMaster.element}`, strength: 1, dimensions: ["overview", "cooperation", "difficult_period", "complementarity"], role: relation.includes("controls") ? "tension" : "supportive" }),
    stableFact({ id: "relation_left_tengod", type: "RELATION_TEN_GOD", value: leftTenGod, label: `${leftProfile.firstName} perçoit ${rightProfile.firstName} : ${leftTenGod}`, strength: 0.82, dimensions: ["differences", "communication", "cooperation"] }),
    stableFact({ id: "relation_right_tengod", type: "RELATION_TEN_GOD", value: rightTenGod, label: `${rightProfile.firstName} perçoit ${leftProfile.firstName} : ${rightTenGod}`, strength: 0.82, dimensions: ["differences", "communication", "cooperation"] }),
  ];
  const axisDimensions = {
    complementarity: ["overview", "cooperation", "complementarity"],
    similarity: ["overview", "differences", "communication"],
    mutualSupport: ["overview", "difficult_period", "support"],
    friction: ["differences", "communication", "difficult_period", "tension"],
    adaptation: ["communication", "difficult_period", "cooperation", "adaptation"],
  };
  Object.entries(axes).forEach(([axis, level]) => facts.push(stableFact({
    id: `relation_axis_${axis}`,
    type: "RELATION_AXIS",
    value: `${axis}:${level}`,
    label: `${axis} : ${level}`,
    strength: ["strong", "important"].includes(level) ? 0.9 : ["present", "balanced"].includes(level) ? 0.75 : 0.58,
    dimensions: axisDimensions[axis],
    role: axis === "friction" ? "tension" : ["complementarity", "mutualSupport"].includes(axis) ? "supportive" : "neutral",
  })));
  interactions.slice(0, 12).forEach((interaction, index) => facts.push(stableFact({
    id: `relation_branch_${index + 1}`,
    type: `RELATION_BRANCH_${interaction.type.toUpperCase()}`,
    value: `${interaction.left.key}_${interaction.right.key}`,
    label: `${interaction.type} : ${interaction.left.pillarId}.${interaction.left.key} / ${interaction.right.pillarId}.${interaction.right.key}`,
    strength: interaction.relationalFocus ? 0.94 : 0.72,
    dimensions: interaction.type === "clash"
      ? ["differences", "communication", "difficult_period", "tension"]
      : ["overview", "cooperation", "difficult_period", "support", "complementarity"],
    role: interaction.type === "clash" ? "tension" : "supportive",
  })));
  return Object.freeze(facts);
}

export function rankRelationshipFacts(stableFacts, relationshipGoal) {
  const goal = normalizeRelationshipGoal(relationshipGoal);
  const weights = RELATIONSHIP_GOAL_MATRIX[goal].dimensions;
  return Object.freeze(stableFacts.map((fact) => {
    const relevance = fact.dimensions.reduce((total, dimension) => total + (weights[dimension] ?? 0), 0);
    return Object.freeze({ ...fact, priorityScore: Math.round((fact.strength * 100) + (relevance * 12)) });
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id)));
}

function relationshipAnalysisKey({ leftProfile, rightProfile, relationshipType, relationshipGoal, stableFacts }) {
  const source = JSON.stringify({
    version: RELATIONSHIP_READING_VERSION,
    leftId: leftProfile.id,
    rightId: rightProfile.id,
    relationshipType,
    relationshipGoal,
    facts: stableFacts.map(({ id, value }) => [id, value]),
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `tao.relationship.${RELATIONSHIP_READING_VERSION}.${(hash >>> 0).toString(36)}`;
}

export function compareBaziProfiles({
  leftProfile,
  rightProfile,
  leftTheme,
  rightTheme,
  relationshipType = "other",
  relationshipGoal,
  focus,
}) {
  if (!leftProfile?.id || !rightProfile?.id || leftProfile.id === rightProfile.id) {
    throw new TypeError("Choisis deux profils distincts.");
  }
  assertTheme(leftTheme, "de la première personne");
  assertTheme(rightTheme, "de la seconde personne");
  assertChoice(relationshipType, RELATIONSHIP_TYPES, "Contexte relationnel");
  const goal = normalizeRelationshipGoal(relationshipGoal ?? focus ?? "overview");

  const relation = elementRelation(leftTheme.dayMaster.element, rightTheme.dayMaster.element);
  const leftTenGod = tenGodFor(leftTheme.dayMaster, rightTheme.dayMaster);
  const rightTenGod = tenGodFor(rightTheme.dayMaster, leftTheme.dayMaster);
  const interactions = crossBranchRelations(leftTheme, rightTheme);
  const axes = qualitativeAxes({ leftTheme, rightTheme, relation, interactions });
  const stableFacts = makeStableFacts({ leftProfile, rightProfile, leftTheme, rightTheme, relation, leftTenGod, rightTenGod, interactions, axes });
  const priorityFacts = rankRelationshipFacts(stableFacts, goal);
  const key = relationshipAnalysisKey({ leftProfile, rightProfile, relationshipType, relationshipGoal: goal, stableFacts });
  const goalFact = Object.freeze({ id: "relationship_goal", type: "RELATIONSHIP_GOAL", value: goal, label: `Objectif relationnel : ${goal}` });
  const contextFact = Object.freeze({ id: "relationship_context", type: "RELATIONSHIP_CONTEXT", value: relationshipType, label: `Contexte relationnel : ${relationshipType}` });

  return Object.freeze({
    version: RELATIONSHIP_READING_VERSION,
    profiles: Object.freeze({ leftId: leftProfile.id, rightId: rightProfile.id }),
    relationshipType,
    relationshipGoal: goal,
    focus: goal,
    analysisKey: key,
    dayMasters: Object.freeze({ left: leftTheme.dayMaster, right: rightTheme.dayMaster }),
    elementRelation: relation,
    tenGods: Object.freeze({ leftToRight: leftTenGod, rightToLeft: rightTenGod }),
    interactions,
    axes,
    stableFacts,
    priorityFacts,
    supportiveDynamics: Object.freeze(stableFacts.filter(({ role }) => role === "supportive")),
    tensionDynamics: Object.freeze(stableFacts.filter(({ role }) => role === "tension")),
    complementaryDynamics: Object.freeze(stableFacts.filter(({ dimensions }) => dimensions.includes("complementarity"))),
    communicationRelevantFacts: Object.freeze(stableFacts.filter(({ dimensions }) => dimensions.includes("communication"))),
    cooperationRelevantFacts: Object.freeze(stableFacts.filter(({ dimensions }) => dimensions.includes("cooperation"))),
    facts: Object.freeze([goalFact, contextFact, ...priorityFacts.slice(0, 16)].map((fact) => Object.freeze({
      id: fact.id,
      type: fact.type,
      value: fact.value,
      label: fact.label,
    }))),
  });
}
