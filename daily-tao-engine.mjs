import {
  CALCULATION_VERSION,
  calculateTemporalPillars,
  getSolarTermInstant,
} from "./bazi-engine.mjs";
import { buildDailyPersonalSignature } from "./daily-personal-signature.mjs";

export const DAILY_CALCULATION_VERSION = "tao-daily-2.0.0";

const ELEMENTS = Object.freeze(["wood", "fire", "earth", "metal", "water"]);
const ELEMENT_LABELS = Object.freeze({ wood: "Bois", fire: "Feu", earth: "Terre", metal: "Métal", water: "Eau" });
const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

const SOLAR_TERMS = Object.freeze([
  [285, "Xiao Han", "Petit Froid", "Le mouvement hivernal se concentre et invite à préserver les ressources."],
  [300, "Da Han", "Grand Froid", "La saison atteint sa profondeur avant le retour progressif du mouvement."],
  [315, "Li Chun", "Début du Printemps", "Un nouveau cycle s’ouvre et favorise les premiers élans mesurés."],
  [330, "Yu Shui", "Eaux de Pluie", "Ce qui était retenu recommence doucement à circuler."],
  [345, "Jing Zhe", "Éveil des Insectes", "L’énergie se réveille et demande une attention souple."],
  [0, "Chun Fen", "Équinoxe de Printemps", "La lumière et l’ombre cherchent un équilibre passager."],
  [15, "Qing Ming", "Clarté Pure", "La période encourage la clarté, le tri et une vision plus nette."],
  [30, "Gu Yu", "Pluie des Grains", "La croissance se nourrit de régularité et de patience."],
  [45, "Li Xia", "Début de l’Été", "L’expansion s’affirme et invite à employer l’élan avec discernement."],
  [60, "Xiao Man", "Petite Plénitude", "Les choses se remplissent sans être encore arrivées à maturité."],
  [75, "Mang Zhong", "Grains en Épis", "Le moment soutient les gestes utiles et le soin porté à ce qui mûrit."],
  [90, "Xia Zhi", "Solstice d’Été", "Le Yang culmine ; ménager des espaces de calme aide à garder l’équilibre."],
  [105, "Xiao Shu", "Petite Chaleur", "L’intensité monte et gagne à être accompagnée avec mesure."],
  [120, "Da Shu", "Grande Chaleur", "La saison demande de préserver l’énergie au cœur de l’expansion."],
  [135, "Li Qiu", "Début de l’Automne", "Le mouvement commence à se recueillir et favorise le discernement."],
  [150, "Chu Shu", "Fin de la Chaleur", "L’intensité décroît et laisse place à une organisation plus posée."],
  [165, "Bai Lu", "Rosée Blanche", "La fraîcheur invite à simplifier et à observer les nuances."],
  [180, "Qiu Fen", "Équinoxe d’Automne", "Yin et Yang se répondent dans un équilibre temporaire."],
  [195, "Han Lu", "Rosée Froide", "La saison encourage le recentrage et la préparation."],
  [210, "Shuang Jiang", "Descente du Givre", "Le temps du tri s’approfondit avant l’entrée dans l’hiver."],
  [225, "Li Dong", "Début de l’Hiver", "L’énergie se tourne vers l’intérieur et valorise la conservation."],
  [240, "Xiao Xue", "Petite Neige", "Le ralentissement progressif invite à protéger l’essentiel."],
  [255, "Da Xue", "Grande Neige", "Le silence saisonnier soutient l’introspection et la stabilité."],
  [270, "Dong Zhi", "Solstice d’Hiver", "Le Yin culmine tandis qu’un nouvel élan commence discrètement."],
]);

const GUIDANCE = Object.freeze({
  wood: { favor: ["faire progresser une idée", "rester souple", "cultiver ce qui commence"], moderate: ["l’impatience", "la dispersion"], domains: ["Créativité", "Action"] },
  fire: { favor: ["exprimer clairement", "partager avec chaleur", "donner de l’élan"], moderate: ["la précipitation", "la surstimulation"], domains: ["Relations", "Créativité"] },
  earth: { favor: ["stabiliser", "prendre soin du concret", "avancer avec régularité"], moderate: ["la rigidité", "la rumination"], domains: ["Action", "Repos"] },
  metal: { favor: ["clarifier", "structurer", "choisir l’essentiel"], moderate: ["la sévérité", "le contrôle excessif"], domains: ["Réflexion", "Action"] },
  water: { favor: ["observer", "écouter", "laisser mûrir une réponse"], moderate: ["l’isolement", "l’indécision prolongée"], domains: ["Réflexion", "Repos"] },
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function generatorOf(element) {
  return ELEMENTS.find((candidate) => GENERATES[candidate] === element);
}

function controllerOf(element) {
  return ELEMENTS.find((candidate) => CONTROLS[candidate] === element);
}

function currentSolarTerm(epochMs, civilYear) {
  const candidates = [];
  for (const year of [civilYear - 1, civilYear, civilYear + 1]) {
    for (const [longitude, pinyin, label, description] of SOLAR_TERMS) {
      candidates.push({ longitude, pinyin, label, description, epochMs: getSolarTermInstant(year, longitude) });
    }
  }
  candidates.sort((a, b) => a.epochMs - b.epochMs);
  return candidates.filter((term) => term.epochMs <= epochMs).at(-1);
}

function createElementImpact(natalTheme, dayPillar) {
  const dailyCounts = Object.fromEntries(ELEMENTS.map((key) => [key, 0]));
  dailyCounts[dayPillar.stem.element] += 1;
  dailyCounts[dayPillar.branch.element] += 1;
  const natalTotal = natalTheme.yinYang.total;
  const total = natalTotal + 2;

  return Object.fromEntries(ELEMENTS.map((key) => {
    const natalCount = natalTheme.elements[key].count;
    const dailyCount = dailyCounts[key];
    const combinedCount = natalCount + dailyCount;
    return [key, {
      key,
      label: ELEMENT_LABELS[key],
      natalCount,
      dailyCount,
      combinedCount,
      percent: Math.round((combinedCount / total) * 100),
    }];
  }));
}

function createResonance(natalTheme, dayPillar) {
  const master = natalTheme.dayMaster.element;
  const daily = dayPillar.stem.element;
  const reasons = [];
  let relation = "neutral";

  if (daily === master) {
    relation = "same";
    reasons.push("L’élément du jour rejoint directement celui de ton Maître du Jour.");
  } else if (GENERATES[daily] === master) {
    relation = "nourishes";
    reasons.push("L’élément du jour nourrit symboliquement ton Maître du Jour.");
  } else if (GENERATES[master] === daily) {
    relation = "supports";
    reasons.push("Ton Maître du Jour peut soutenir le mouvement symbolique de la journée.");
  } else if (CONTROLS[daily] === master || CONTROLS[master] === daily) {
    relation = "controls";
    reasons.push("La relation entre les éléments invite davantage à la mesure et à l’ajustement.");
  } else {
    reasons.push("Les deux éléments se rencontrent sans relation dominante directe.");
  }

  const complementaryPolarity = dayPillar.stem.polarity !== natalTheme.dayMaster.polarity;
  if (complementaryPolarity) reasons.push("Les polarités Yin et Yang apportent une complémentarité interne.");
  const level = ["same", "nourishes"].includes(relation) ? "high" : relation === "controls" ? "gentle" : "moderate";
  return { level, relation, complementaryPolarity, reasons };
}

function createDomainSignals(natalTheme, dayPillar, elements, resonance) {
  const ranked = Object.values(elements).sort((a, b) => b.percent - a.percent || a.key.localeCompare(b.key));
  const natalBranches = Object.values(natalTheme.pillars).filter((pillar) => pillar?.determined !== false && pillar?.branch);
  const branchEchoes = natalBranches.filter((pillar) => pillar.branch.key === dayPillar.branch.key).length;
  const controlled = resonance.relation === "controls";
  const yang = dayPillar.stem.polarity === "yang";
  return Object.freeze({
    dominantElement: ranked[0].key,
    quieterElement: ranked.at(-1).key,
    branchEchoes,
    relations: branchEchoes ? "sensitive" : resonance.complementaryPolarity ? "fluid" : "observing",
    action: controlled ? "prudence" : yang ? "favorable" : "balanced",
    creativity: ["wood", "fire"].includes(dayPillar.stem.element) ? "strong" : resonance.relation === "supports" ? "moderate" : "gentle",
    personalRhythm: yang ? "outward" : "inward",
    retreat: controlled ? "priority" : ["water", "earth"].includes(dayPillar.stem.element) ? "useful" : "neutral",
  });
}

export function calculateDailyTao({ date, timeZone, profile, natalTheme }) {
  if (!profile?.id || !natalTheme?.dayMaster) throw new TypeError("Profil et thème natal requis.");
  const temporal = calculateTemporalPillars({ date, timeZone, localTime: "12:00" });
  const { year, month, day } = temporal.pillars;
  const season = currentSolarTerm(temporal.epochMs, Number(date.slice(0, 4)));
  const elements = createElementImpact(natalTheme, day);
  const resonance = createResonance(natalTheme, day);
  const personalSignature = buildDailyPersonalSignature({ date, profile, natalTheme, dayPillar: day });
  const domains = { ...createDomainSignals(natalTheme, day, elements, resonance), ...personalSignature.dimensions };
  const guidance = GUIDANCE[day.stem.element];
  const polarity = day.stem.polarity === "yang" ? "Yang" : "Yin";
  const rhythm = day.stem.polarity === "yang" ? "mouvement mesuré" : "observation active";
  const supportingElement = generatorOf(day.stem.element);
  const attentionElement = controllerOf(day.stem.element);

  return Object.freeze({
    calculationVersion: DAILY_CALCULATION_VERSION,
    baziCalculationVersion: CALCULATION_VERSION,
    profileId: profile.id,
    date,
    timeZone,
    pillars: { year, month, day },
    dayEnergy: {
      label: `${day.stem.elementLabel} ${polarity} · ${day.branch.name}`,
      stem: day.stem,
      branch: day.branch,
      animal: day.branch.animal,
      summary: day.stem.polarity === "yang"
        ? `Une journée qui invite à mobiliser l’énergie de ${day.stem.elementLabel.toLowerCase()} avec présence, sans forcer le rythme.`
        : `Une journée qui invite à écouter les nuances de ${day.stem.elementLabel.toLowerCase()} et à progresser avec finesse.`,
    },
    overview: {
      energy: `${day.stem.elementLabel} ${polarity}`,
      rhythm,
      supported: ELEMENT_LABELS[supportingElement],
      attention: ELEMENT_LABELS[attentionElement],
    },
    resonance,
    personalSignature,
    domains,
    elements,
    guidance: {
      ...guidance,
      rhythm: day.stem.polarity === "yang" ? "Action consciente" : "Contemplation active",
    },
    solarTerm: { ...season, instant: new Date(season.epochMs).toISOString() },
    methodology: "Indicateur symbolique interne fondé sur la relation des cinq éléments et la polarité du Tronc du Jour avec le Maître du Jour natal.",
  });
}
