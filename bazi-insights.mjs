const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

const BRANCH_RELATIONS = Object.freeze({
  combination: [["zi", "chou"], ["yin", "hai"], ["mao", "xu"], ["chen", "you"], ["si", "shen"], ["wu", "wei"]],
  clash: [["zi", "wu"], ["chou", "wei"], ["yin", "shen"], ["mao", "you"], ["chen", "xu"], ["si", "hai"]],
});

export function tenGodFor(dayMaster, otherStem) {
  if (!dayMaster?.element || !otherStem?.element) return null;
  const samePolarity = dayMaster.polarity === otherStem.polarity;
  if (dayMaster.element === otherStem.element) return samePolarity ? "friend" : "rob_wealth";
  if (GENERATES[dayMaster.element] === otherStem.element) return samePolarity ? "eating_god" : "hurting_officer";
  if (CONTROLS[dayMaster.element] === otherStem.element) return samePolarity ? "indirect_wealth" : "direct_wealth";
  if (CONTROLS[otherStem.element] === dayMaster.element) return samePolarity ? "seven_killings" : "direct_officer";
  if (GENERATES[otherStem.element] === dayMaster.element) return samePolarity ? "indirect_resource" : "direct_resource";
  return null;
}

export function visibleTenGods(result) {
  return Object.entries(result?.pillars ?? {}).flatMap(([pillarId, pillar]) => {
    if (!pillar?.determined || !pillar.stem) return [];
    return [{ pillarId, stem: pillar.stem, tenGod: tenGodFor(result.dayMaster, pillar.stem) }];
  });
}

export function branchRelations(result) {
  const branches = Object.entries(result?.pillars ?? {}).flatMap(([pillarId, pillar]) => pillar?.determined && pillar.branch ? [{ pillarId, key: pillar.branch.key }] : []);
  const detected = [];
  for (let left = 0; left < branches.length; left += 1) {
    for (let right = left + 1; right < branches.length; right += 1) {
      for (const [type, pairs] of Object.entries(BRANCH_RELATIONS)) {
        if (pairs.some(([first, second]) =>
          (branches[left].key === first && branches[right].key === second) ||
          (branches[left].key === second && branches[right].key === first))) {
          detected.push({ type, branches: [branches[left], branches[right]] });
        }
      }
    }
  }
  return detected;
}
