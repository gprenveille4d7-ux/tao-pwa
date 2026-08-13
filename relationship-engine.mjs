import { tenGodFor } from "./bazi-insights.mjs";

export const RELATIONSHIP_READING_VERSION = "tao-relationship-1.0.0";

export const RELATIONSHIP_TYPES = Object.freeze([
  "couple",
  "parent_child",
  "family",
  "friendship",
  "work",
  "other",
]);

export const RELATIONSHIP_FOCUSES = Object.freeze([
  "general",
  "differences",
  "communication",
  "difficult_period",
  "better_together",
]);

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

function makeFacts({ leftProfile, rightProfile, leftTheme, rightTheme, relation, leftTenGod, rightTenGod, interactions, relationshipType, focus }) {
  const facts = [
    { id: "relation_left_daymaster", type: "RELATION_DAY_MASTER", value: leftTheme.dayMaster.key, label: `${leftProfile.firstName} : ${leftTheme.dayMaster.name} ${leftTheme.dayMaster.chinese}` },
    { id: "relation_right_daymaster", type: "RELATION_DAY_MASTER", value: rightTheme.dayMaster.key, label: `${rightProfile.firstName} : ${rightTheme.dayMaster.name} ${rightTheme.dayMaster.chinese}` },
    { id: "relation_element_dynamic", type: "RELATION_ELEMENT_DYNAMIC", value: relation, label: `${leftTheme.dayMaster.element} / ${rightTheme.dayMaster.element}` },
    { id: "relation_left_tengod", type: "RELATION_TEN_GOD", value: leftTenGod, label: `${leftProfile.firstName} perçoit ${rightProfile.firstName} : ${leftTenGod}` },
    { id: "relation_right_tengod", type: "RELATION_TEN_GOD", value: rightTenGod, label: `${rightProfile.firstName} perçoit ${leftProfile.firstName} : ${rightTenGod}` },
    { id: "relation_context", type: "RELATION_CONTEXT", value: relationshipType, label: `Contexte relationnel : ${relationshipType}` },
    { id: "relation_focus", type: "RELATION_FOCUS", value: focus, label: `Angle de lecture : ${focus}` },
  ];
  interactions.slice(0, 12).forEach((interaction, index) => facts.push({
    id: `relation_branch_${index + 1}`,
    type: `RELATION_BRANCH_${interaction.type.toUpperCase()}`,
    value: `${interaction.left.key}_${interaction.right.key}`,
    label: `${interaction.type} : ${interaction.left.pillarId}.${interaction.left.key} / ${interaction.right.pillarId}.${interaction.right.key}`,
  }));
  return Object.freeze(facts.map((fact) => Object.freeze(fact)));
}

export function compareBaziProfiles({
  leftProfile,
  rightProfile,
  leftTheme,
  rightTheme,
  relationshipType = "other",
  focus = "general",
}) {
  if (!leftProfile?.id || !rightProfile?.id || leftProfile.id === rightProfile.id) {
    throw new TypeError("Choisis deux profils distincts.");
  }
  assertTheme(leftTheme, "de la première personne");
  assertTheme(rightTheme, "de la seconde personne");
  assertChoice(relationshipType, RELATIONSHIP_TYPES, "Contexte relationnel");
  assertChoice(focus, RELATIONSHIP_FOCUSES, "Angle de lecture");

  const relation = elementRelation(leftTheme.dayMaster.element, rightTheme.dayMaster.element);
  const leftTenGod = tenGodFor(leftTheme.dayMaster, rightTheme.dayMaster);
  const rightTenGod = tenGodFor(rightTheme.dayMaster, leftTheme.dayMaster);
  const interactions = crossBranchRelations(leftTheme, rightTheme);
  const axes = qualitativeAxes({ leftTheme, rightTheme, relation, interactions });

  return Object.freeze({
    version: RELATIONSHIP_READING_VERSION,
    profiles: Object.freeze({ leftId: leftProfile.id, rightId: rightProfile.id }),
    relationshipType,
    focus,
    dayMasters: Object.freeze({ left: leftTheme.dayMaster, right: rightTheme.dayMaster }),
    elementRelation: relation,
    tenGods: Object.freeze({ leftToRight: leftTenGod, rightToLeft: rightTenGod }),
    interactions,
    axes,
    facts: makeFacts({ leftProfile, rightProfile, leftTheme, rightTheme, relation, leftTenGod, rightTenGod, interactions, relationshipType, focus }),
  });
}
