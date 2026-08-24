import { EARTHLY_BRANCHES, HEAVENLY_STEMS, SOLAR_MONTH_BOUNDARIES, getSolarTermInstant } from "./bazi-engine.mjs";
import { tenGodFor } from "./bazi-insights.mjs";

export const DA_YUN_VERSION = "tao-da-yun-1.0.0";
const DAY_MS = 86_400_000;
const JIE_CHINESE = Object.freeze({ li_chun: "立春", jing_zhe: "惊蛰", qing_ming: "清明", li_xia: "立夏", mang_zhong: "芒种", xiao_shu: "小暑", li_qiu: "立秋", bai_lu: "白露", han_lu: "寒露", li_dong: "立冬", da_xue: "大雪", xiao_han: "小寒" });
const HIDDEN_STEMS = Object.freeze({ zi: ["gui"], chou: ["ji", "gui", "xin"], yin: ["jia", "bing", "wu"], mao: ["yi"], chen: ["wu", "yi", "gui"], si: ["bing", "wu", "geng"], wu: ["ding", "ji"], wei: ["ji", "ding", "yi"], shen: ["geng", "ren", "wu"], you: ["xin"], xu: ["wu", "xin", "ding"], hai: ["ren", "jia"] });
const COMBINATIONS = [["zi", "chou"], ["yin", "hai"], ["mao", "xu"], ["chen", "you"], ["si", "shen"], ["wu", "wei"]];
const CLASHES = [["zi", "wu"], ["chou", "wei"], ["yin", "shen"], ["mao", "you"], ["chen", "xu"], ["si", "hai"]];

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function directionFor(yearStemPolarity, convention) {
  if (!["yin", "yang"].includes(yearStemPolarity) || !["masculine", "feminine"].includes(convention)) throw new TypeError("Convention Da Yun incomplète.");
  const forward = (yearStemPolarity === "yang" && convention === "masculine") || (yearStemPolarity === "yin" && convention === "feminine");
  return forward ? "FORWARD" : "BACKWARD";
}

function sexagenaryIndex(pillar) {
  for (let index = 0; index < 60; index += 1) if (index % 10 === pillar.stem.index && index % 12 === pillar.branch.index) return index;
  throw new Error("Pilier hors du cycle sexagésimal.");
}

function jieCandidates(year) {
  const items = [];
  for (const civilYear of [year - 1, year, year + 1]) {
    for (const term of SOLAR_MONTH_BOUNDARIES) {
      const termYear = term.longitude === 285 ? civilYear + 1 : civilYear;
      items.push({ ...term, chinese: JIE_CHINESE[term.key], epochMs: getSolarTermInstant(termYear, term.longitude) });
    }
  }
  return items.sort((a, b) => a.epochMs - b.epochMs).filter((item, index, array) => index === 0 || item.epochMs !== array[index - 1].epochMs);
}

function addYears(epochMs, years) {
  const date = new Date(epochMs);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.getTime();
}

function branchInteractions(branch, natalTheme) {
  const natal = Object.entries(natalTheme.pillars).filter(([, pillar]) => pillar?.determined).map(([pillarId, pillar]) => ({ pillarId, key: pillar.branch.key }));
  return Object.freeze(natal.flatMap((item) => {
    const pair = [branch.key, item.key];
    if (COMBINATIONS.some(([a, b]) => pair.includes(a) && pair.includes(b))) return [{ type: "combination", pillarId: item.pillarId, branch: item.key }];
    if (CLASHES.some(([a, b]) => pair.includes(a) && pair.includes(b))) return [{ type: "clash", pillarId: item.pillarId, branch: item.key }];
    if (branch.key === item.key) return [{ type: "repetition", pillarId: item.pillarId, branch: item.key }];
    return [];
  }));
}

export function calculateDaYun({ profile, natalTheme, now = Date.now(), cycleCount = 10 }) {
  if (!profile?.birthTimeKnown || !natalTheme?.metadata?.utcInstant) return Object.freeze({ available: false, reason: "birth-time-required", version: DA_YUN_VERSION });
  if (!["masculine", "feminine"].includes(profile.daYunConvention)) return Object.freeze({ available: false, reason: "convention-required", version: DA_YUN_VERSION });
  if (!natalTheme.pillars.year?.determined || !natalTheme.pillars.month?.determined) return Object.freeze({ available: false, reason: "pillars-undetermined", version: DA_YUN_VERSION });
  const birthEpochMs = Date.parse(natalTheme.metadata.utcInstant);
  const direction = directionFor(natalTheme.pillars.year.stem.polarity, profile.daYunConvention);
  const candidates = jieCandidates(Number(profile.birthDate.slice(0, 4)));
  const targetJie = direction === "FORWARD" ? candidates.find((item) => item.epochMs >= birthEpochMs) : candidates.slice().reverse().find((item) => item.epochMs <= birthEpochMs);
  if (!targetJie) throw new Error("Jie de référence introuvable.");
  const intervalSeconds = Math.abs(targetJie.epochMs - birthEpochMs) / 1000;
  const startAgeExact = intervalSeconds / (3 * 86_400);
  const ageYears = Math.floor(startAgeExact);
  const ageMonthsFloat = (startAgeExact - ageYears) * 12;
  const ageMonths = Math.floor(ageMonthsFloat);
  const ageDays = Math.round((ageMonthsFloat - ageMonths) * 30);
  const firstStartEpochMs = birthEpochMs + startAgeExact * 365.2425 * DAY_MS;
  const monthIndex = sexagenaryIndex(natalTheme.pillars.month);
  const step = direction === "FORWARD" ? 1 : -1;
  const cycles = [];
  for (let index = 0; index < cycleCount; index += 1) {
    const sexagenary = mod(monthIndex + step * (index + 1), 60);
    const stem = HEAVENLY_STEMS[sexagenary % 10];
    const branch = EARTHLY_BRANCHES[sexagenary % 12];
    const startEpochMs = addYears(firstStartEpochMs, index * 10);
    const endEpochMs = addYears(firstStartEpochMs, (index + 1) * 10);
    cycles.push(Object.freeze({
      index: index + 1, startEpochMs, endEpochMs, startDate: new Date(startEpochMs).toISOString(), endDate: new Date(endEpochMs).toISOString(),
      startAge: startAgeExact + index * 10, endAge: startAgeExact + (index + 1) * 10,
      stem, branch: Object.freeze({ ...branch, hiddenStems: HIDDEN_STEMS[branch.key].map((key) => HEAVENLY_STEMS.find((stemItem) => stemItem.key === key)) }),
      pillar: Object.freeze({ chinese: `${stem.chinese}${branch.chinese}`, pinyin: `${stem.name} ${branch.name}`, sexagenaryIndex: sexagenary }),
      dayMasterRelationship: tenGodFor(natalTheme.dayMaster, stem),
      movements: Object.freeze([stem.element, branch.element]), natalInteractions: branchInteractions(branch, natalTheme),
      temporalStatus: now < startEpochMs ? "future" : now >= endEpochMs ? "past" : "current",
    }));
  }
  const currentCycle = cycles.find((cycle) => cycle.temporalStatus === "current") ?? null;
  return Object.freeze({
    available: true, version: DA_YUN_VERSION, dayMaster: natalTheme.dayMaster, direction, directionLabel: direction === "FORWARD" ? "Progression directe · 顺行" : "Progression inverse · 逆行",
    yearStem: natalTheme.pillars.year.stem, yearStemPolarity: natalTheme.pillars.year.stem.polarity, convention: profile.daYunConvention,
    directionRule: `${natalTheme.pillars.year.stem.polarity} + ${profile.daYunConvention}`,
    monthPillar: natalTheme.pillars.month, targetJie: Object.freeze({ ...targetJie, utc: new Date(targetJie.epochMs).toISOString() }),
    birthEpochMs, intervalSeconds, startAgeExact, startAge: Object.freeze({ years: ageYears, months: ageMonths, days: ageDays }),
    firstStartEpochMs, firstStartDate: new Date(firstStartEpochMs).toISOString(), cycles: Object.freeze(cycles), currentCycle,
    calculationMethod: "Jie directionnel ; 3 jours réels = 1 année symbolique ; projection calendaire 365,2425 jours puis cycles de 10 années civiles.",
  });
}
