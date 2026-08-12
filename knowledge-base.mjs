import { earthlyBranches, elements, heavenlyStems, tenGods } from "./locales/fr/bazi.js";
import { HEXAGRAMS, TRIGRAMS } from "./yijing-data.mjs";

function normalized({ id, originalName, frenchName, englishName = null, shortDescription, fullDescription = null, symbolism = null, interpretation = null, sources = ["TAO · base locale"] }) {
  return Object.freeze({ id, originalName, frenchName, englishName, shortDescription, fullDescription: fullDescription ?? shortDescription, symbolism, interpretation, sources });
}

export const TAO_KNOWLEDGE_BASE_VERSION = "tao-knowledge-fr-1.0.0";

export const KNOWLEDGE_BASE = Object.freeze({
  elements: Object.freeze(Object.entries(elements).map(([id, item]) => normalized({ id, originalName: id, frenchName: item.label, englishName: id, shortDescription: item.description, symbolism: item.label }))),
  heavenlyStems: Object.freeze(Object.entries(heavenlyStems).map(([id, item]) => normalized({ id, originalName: `${item.pinyin} · ${item.hanzi}`, frenchName: item.french, shortDescription: `${item.label} représente le ${item.french}.`, symbolism: item.element }))),
  earthlyBranches: Object.freeze(Object.entries(earthlyBranches).map(([id, item]) => normalized({ id, originalName: `${item.pinyin} · ${item.hanzi}`, frenchName: item.french, shortDescription: `${item.animal}, associé à l’élément ${item.element}.`, symbolism: item.animal }))),
  tenGods: Object.freeze(Object.entries(tenGods).map(([id, item]) => normalized({ id, originalName: `${item.pinyin} · ${item.hanzi}`, frenchName: item.label, shortDescription: item.definition, symbolism: item.alternative }))),
  trigrams: Object.freeze(Object.values(TRIGRAMS).map((item) => normalized({ id: item.id, originalName: `${item.pinyin} · ${item.hanzi}`, frenchName: item.french, shortDescription: `${item.image} : ${item.quality}.`, symbolism: item.image }))),
  hexagrams: Object.freeze(HEXAGRAMS.map((item) => normalized({ id: String(item.number), originalName: `${item.pinyin} · ${item.hanzi}`, frenchName: item.french, shortDescription: item.summary, fullDescription: item.generalMeaning, symbolism: item.image, interpretation: item.posture }))),
});

export function findKnowledge(category, id) {
  return KNOWLEDGE_BASE[category]?.find((entry) => entry.id === String(id)) ?? null;
}
