export const CALCULATION_VERSION = "tao-bazi-1.0.0";

export const CALCULATION_CONVENTION = Object.freeze({
  yearBoundary: "Li Chun, longitude solaire apparente 315°",
  monthBoundaries: "Douze Jie, de Li Chun à Xiao Han",
  dayBoundary: "Minuit civil au lieu de naissance",
  hourBasis: "Heure civile locale du fuseau IANA, sans correction solaire",
  ziHour: "23:00–00:59 ; le jour civil ne change qu’à 00:00",
  supportedYears: "1800–2200",
});

const ELEMENT_LABELS = Object.freeze({
  wood: "Bois",
  fire: "Feu",
  earth: "Terre",
  metal: "Métal",
  water: "Eau",
});

export const HEAVENLY_STEMS = Object.freeze([
  { key: "jia", name: "Jia", chinese: "甲", element: "wood", polarity: "yang" },
  { key: "yi", name: "Yi", chinese: "乙", element: "wood", polarity: "yin" },
  { key: "bing", name: "Bing", chinese: "丙", element: "fire", polarity: "yang" },
  { key: "ding", name: "Ding", chinese: "丁", element: "fire", polarity: "yin" },
  { key: "wu", name: "Wu", chinese: "戊", element: "earth", polarity: "yang" },
  { key: "ji", name: "Ji", chinese: "己", element: "earth", polarity: "yin" },
  { key: "geng", name: "Geng", chinese: "庚", element: "metal", polarity: "yang" },
  { key: "xin", name: "Xin", chinese: "辛", element: "metal", polarity: "yin" },
  { key: "ren", name: "Ren", chinese: "壬", element: "water", polarity: "yang" },
  { key: "gui", name: "Gui", chinese: "癸", element: "water", polarity: "yin" },
].map((stem, index) => Object.freeze({ ...stem, index, elementLabel: ELEMENT_LABELS[stem.element] })));

export const EARTHLY_BRANCHES = Object.freeze([
  { key: "zi", name: "Zi", chinese: "子", element: "water", polarity: "yang", animal: "Rat" },
  { key: "chou", name: "Chou", chinese: "丑", element: "earth", polarity: "yin", animal: "Bœuf" },
  { key: "yin", name: "Yin", chinese: "寅", element: "wood", polarity: "yang", animal: "Tigre" },
  { key: "mao", name: "Mao", chinese: "卯", element: "wood", polarity: "yin", animal: "Lapin" },
  { key: "chen", name: "Chen", chinese: "辰", element: "earth", polarity: "yang", animal: "Dragon" },
  { key: "si", name: "Si", chinese: "巳", element: "fire", polarity: "yin", animal: "Serpent" },
  { key: "wu", name: "Wu", chinese: "午", element: "fire", polarity: "yang", animal: "Cheval" },
  { key: "wei", name: "Wei", chinese: "未", element: "earth", polarity: "yin", animal: "Chèvre" },
  { key: "shen", name: "Shen", chinese: "申", element: "metal", polarity: "yang", animal: "Singe" },
  { key: "you", name: "You", chinese: "酉", element: "metal", polarity: "yin", animal: "Coq" },
  { key: "xu", name: "Xu", chinese: "戌", element: "earth", polarity: "yang", animal: "Chien" },
  { key: "hai", name: "Hai", chinese: "亥", element: "water", polarity: "yin", animal: "Cochon" },
].map((branch, index) => Object.freeze({ ...branch, index, elementLabel: ELEMENT_LABELS[branch.element] })));

export const SOLAR_MONTH_BOUNDARIES = Object.freeze([
  { key: "li_chun", label: "Li Chun", longitude: 315, monthIndex: 0 },
  { key: "jing_zhe", label: "Jing Zhe", longitude: 345, monthIndex: 1 },
  { key: "qing_ming", label: "Qing Ming", longitude: 15, monthIndex: 2 },
  { key: "li_xia", label: "Li Xia", longitude: 45, monthIndex: 3 },
  { key: "mang_zhong", label: "Mang Zhong", longitude: 75, monthIndex: 4 },
  { key: "xiao_shu", label: "Xiao Shu", longitude: 105, monthIndex: 5 },
  { key: "li_qiu", label: "Li Qiu", longitude: 135, monthIndex: 6 },
  { key: "bai_lu", label: "Bai Lu", longitude: 165, monthIndex: 7 },
  { key: "han_lu", label: "Han Lu", longitude: 195, monthIndex: 8 },
  { key: "li_dong", label: "Li Dong", longitude: 225, monthIndex: 9 },
  { key: "da_xue", label: "Da Xue", longitude: 255, monthIndex: 10 },
  { key: "xiao_han", label: "Xiao Han", longitude: 285, monthIndex: 11 },
]);

const TERM_APPROXIMATE_DATES = Object.freeze({
  0: [3, 20], 15: [4, 4], 30: [4, 20], 45: [5, 5], 60: [5, 21], 75: [6, 5],
  90: [6, 21], 105: [7, 7], 120: [7, 22], 135: [8, 7], 150: [8, 23], 165: [9, 7],
  180: [9, 23], 195: [10, 8], 210: [10, 23], 225: [11, 7], 240: [11, 22],
  255: [12, 7], 270: [12, 21], 285: [1, 5], 300: [1, 20], 315: [2, 4],
  330: [2, 19], 345: [3, 5],
});

const DAY_MS = 86_400_000;
const termCache = new Map();

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function angularDifference(value, target) {
  return mod(value - target + 180, 360) - 180;
}

function solarLongitude(epochMs) {
  const julianDay = epochMs / DAY_MS + 2440587.5;
  const daysSinceJ2000 = julianDay - 2451545.0;
  const meanAnomaly = mod(357.529 + 0.98560028 * daysSinceJ2000, 360);
  const meanLongitude = mod(280.459 + 0.98564736 * daysSinceJ2000, 360);
  return mod(
    meanLongitude +
      1.915 * Math.sin(degreesToRadians(meanAnomaly)) +
      0.02 * Math.sin(degreesToRadians(2 * meanAnomaly)),
    360,
  );
}

export function getSolarTermInstant(year, longitude) {
  if (!Number.isInteger(year) || year < 1800 || year > 2200) {
    throw new RangeError("Le calcul des termes solaires est limité aux années 1800 à 2200.");
  }

  const normalizedLongitude = mod(longitude, 360);
  const approximateDate = TERM_APPROXIMATE_DATES[normalizedLongitude];
  if (!approximateDate) throw new RangeError(`Longitude de terme solaire non prise en charge : ${longitude}`);

  const cacheKey = `${year}:${normalizedLongitude}`;
  if (termCache.has(cacheKey)) return termCache.get(cacheKey);

  const center = Date.UTC(year, approximateDate[0] - 1, approximateDate[1], 12);
  let lower = center - 6 * DAY_MS;
  let upper = center + 6 * DAY_MS;

  if (
    angularDifference(solarLongitude(lower), normalizedLongitude) > 0 ||
    angularDifference(solarLongitude(upper), normalizedLongitude) < 0
  ) {
    throw new Error(`Impossible d’encadrer le terme solaire ${normalizedLongitude}° en ${year}.`);
  }

  for (let iteration = 0; iteration < 52; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (angularDifference(solarLongitude(middle), normalizedLongitude) < 0) lower = middle;
    else upper = middle;
  }

  const instant = Math.round((lower + upper) / 2);
  termCache.set(cacheKey, instant);
  return instant;
}

function parseBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) throw new TypeError("Date de naissance invalide.");
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const validation = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    validation.getUTCFullYear() !== parts.year ||
    validation.getUTCMonth() + 1 !== parts.month ||
    validation.getUTCDate() !== parts.day
  ) {
    throw new TypeError("Date de naissance impossible.");
  }
  if (parts.year < 1800 || parts.year > 2200) {
    throw new RangeError("Le moteur BaZi V1 prend en charge les naissances de 1800 à 2200.");
  }
  return parts;
}

function parseBirthTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? "");
  if (!match) throw new TypeError("Heure de naissance invalide.");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function getZonedParts(epochMs, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(epochMs))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return values;
}

function sameLocalMinute(parts, target) {
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  );
}

export function localDateTimeToInstant(localParts, timeZone) {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone }).format(new Date(0));
  } catch {
    throw new RangeError(`Fuseau IANA invalide : ${timeZone}`);
  }

  const wallClockAsUtc = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
  );
  const offsets = new Set();

  for (const hourOffset of [-36, -12, 0, 12, 36]) {
    const sample = wallClockAsUtc + hourOffset * 3_600_000;
    const zoned = getZonedParts(sample, timeZone);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    offsets.add(zonedAsUtc - sample);
  }

  const candidates = [...offsets]
    .map((offset) => wallClockAsUtc - offset)
    .filter((candidate) => sameLocalMinute(getZonedParts(candidate, timeZone), localParts))
    .sort((a, b) => a - b);

  if (candidates.length === 0) {
    const error = new RangeError("Cette heure civile locale n’existe pas dans le fuseau indiqué.");
    error.code = "BAZI_INVALID_LOCAL_TIME";
    throw error;
  }

  return { epochMs: candidates[0], ambiguous: candidates.length > 1, alternatives: candidates };
}

function nextCivilDate({ year, month, day }) {
  const next = new Date(Date.UTC(year, month - 1, day) + DAY_MS);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function makePillar(stemIndex, branchIndex, extra = {}) {
  const stem = HEAVENLY_STEMS[mod(stemIndex, 10)];
  const branch = EARTHLY_BRANCHES[mod(branchIndex, 12)];
  return Object.freeze({
    determined: true,
    stem,
    branch,
    label: `${stem.name} ${branch.name}`,
    chinese: `${stem.chinese}${branch.chinese}`,
    ...extra,
  });
}

function undeterminedPillar(reason) {
  return Object.freeze({ determined: false, stem: null, branch: null, label: "Non déterminé", reason });
}

function yearPillarAt(epochMs, civilYear) {
  const liChun = getSolarTermInstant(civilYear, 315);
  const baziYear = epochMs >= liChun ? civilYear : civilYear - 1;
  const cycleIndex = mod(baziYear - 4, 60);
  return makePillar(cycleIndex % 10, cycleIndex % 12, {
    baziYear,
    boundary: "Li Chun",
    boundaryInstant: new Date(liChun).toISOString(),
  });
}

function monthBoundariesForBaziYear(baziYear) {
  const boundaries = SOLAR_MONTH_BOUNDARIES.map((term) => ({
    ...term,
    epochMs: getSolarTermInstant(term.longitude === 285 ? baziYear + 1 : baziYear, term.longitude),
  }));
  boundaries.push({
    key: "li_chun_next",
    label: "Li Chun",
    longitude: 315,
    monthIndex: 12,
    epochMs: getSolarTermInstant(baziYear + 1, 315),
  });
  return boundaries;
}

function monthPillarAt(epochMs, yearPillar) {
  const boundaries = monthBoundariesForBaziYear(yearPillar.baziYear);
  let active = boundaries[0];

  for (const boundary of boundaries) {
    if (epochMs >= boundary.epochMs) active = boundary;
    else break;
  }

  const monthIndex = Math.min(active.monthIndex, 11);
  const firstMonthStem = mod((yearPillar.stem.index % 5) * 2 + 2, 10);
  return makePillar(firstMonthStem + monthIndex, 2 + monthIndex, {
    solarMonthIndex: monthIndex + 1,
    boundary: active.label,
    boundaryInstant: new Date(active.epochMs).toISOString(),
  });
}

function gregorianJulianDayNumber({ year, month, day }) {
  const a = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - a;
  const adjustedMonth = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * adjustedMonth + 2) / 5) +
    365 * adjustedYear +
    Math.floor(adjustedYear / 4) -
    Math.floor(adjustedYear / 100) +
    Math.floor(adjustedYear / 400) -
    32045
  );
}

function dayPillarForDate(dateParts) {
  const cycleIndex = mod(gregorianJulianDayNumber(dateParts) - 11, 60);
  return makePillar(cycleIndex % 10, cycleIndex % 12, {
    cycleIndex,
    boundary: "Minuit civil local",
  });
}

function hourPillarForTime(timeParts, dayPillar) {
  const branchIndex = Math.floor((timeParts.hour + 1) / 2) % 12;
  const stemIndex = mod((dayPillar.stem.index % 5) * 2 + branchIndex, 10);
  return makePillar(stemIndex, branchIndex, {
    localTime: `${String(timeParts.hour).padStart(2, "0")}:${String(timeParts.minute).padStart(2, "0")}`,
    interval: branchIndex === 0 ? "23:00–00:59" : `${String(branchIndex * 2 - 1).padStart(2, "0")}:00–${String(branchIndex * 2).padStart(2, "0")}:59`,
  });
}

function samePillar(left, right) {
  return left.stem.index === right.stem.index && left.branch.index === right.branch.index;
}

function calculateElementBalance(pillars) {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const polarity = { yin: 0, yang: 0 };
  const components = [];

  for (const [pillarName, pillar] of Object.entries(pillars)) {
    if (!pillar?.determined) continue;
    for (const [kind, component] of [["stem", pillar.stem], ["branch", pillar.branch]]) {
      counts[component.element] += 1;
      polarity[component.polarity] += 1;
      components.push({ pillar: pillarName, kind, element: component.element, polarity: component.polarity });
    }
  }

  const total = components.length;
  const elements = Object.fromEntries(
    Object.entries(counts).map(([key, count]) => [
      key,
      { key, label: ELEMENT_LABELS[key], count, ratio: total ? count / total : 0, percent: total ? Math.round((count / total) * 100) : 0 },
    ]),
  );

  return {
    elements,
    yinYang: {
      yin: polarity.yin,
      yang: polarity.yang,
      yinPercent: total ? Math.round((polarity.yin / total) * 100) : 0,
      yangPercent: total ? Math.round((polarity.yang / total) * 100) : 0,
      total,
    },
    components,
  };
}

function createReading(dayMaster, elements, yinYang) {
  const ordered = Object.values(elements).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
  const strongest = ordered.filter((entry) => entry.count === ordered[0].count).map((entry) => entry.label);
  const weakest = ordered.filter((entry) => entry.count === ordered.at(-1).count).map((entry) => entry.label);
  const tendency = yinYang.yin === yinYang.yang ? "un équilibre égal entre Yin et Yang" : yinYang.yin > yinYang.yang ? "une dominante Yin" : "une dominante Yang";
  return [
    `Dans cette lecture traditionnelle, ton Maître du Jour est ${dayMaster.polarity === "yang" ? "Yang" : "Yin"} ${dayMaster.elementLabel} — ${dayMaster.name}.`,
    `Parmi les composantes visibles des piliers, ${strongest.join(" et ")} ${strongest.length > 1 ? "sont les éléments les plus présents" : "est l’élément le plus présent"}.`,
    `${weakest.join(" et ")} ${weakest.length > 1 ? "sont les moins représentés" : "est le moins représenté"}, tandis que l’ensemble montre ${tendency}. Ces comptages constituent un repère de structure, pas un diagnostic ni une prédiction.`,
  ];
}

function assertProfile(profile) {
  if (!profile || typeof profile.id !== "string") throw new TypeError("Profil absent ou invalide.");
  if (!profile.birthPlace || typeof profile.birthPlace.timezone !== "string") {
    throw new TypeError("Le lieu et son fuseau IANA sont nécessaires au calcul.");
  }
  if (typeof profile.birthTimeKnown !== "boolean") throw new TypeError("État de l’heure de naissance absent.");
  if (profile.birthTimeKnown && typeof profile.birthTime !== "string") throw new TypeError("Heure de naissance absente.");
}

export function calculateTemporalPillars({ date, timeZone, localTime = "12:00" }) {
  const dateParts = parseBirthDate(date);
  const timeParts = parseBirthTime(localTime);
  const conversion = localDateTimeToInstant({ ...dateParts, ...timeParts }, timeZone);
  const year = yearPillarAt(conversion.epochMs, dateParts.year);
  const month = monthPillarAt(conversion.epochMs, year);
  const day = dayPillarForDate(dateParts);

  return Object.freeze({
    pillars: Object.freeze({ year, month, day }),
    epochMs: conversion.epochMs,
    localDate: date,
    localTime,
    timeZone,
    calculationVersion: CALCULATION_VERSION,
  });
}

export function calculateBazi(profile) {
  assertProfile(profile);
  const dateParts = parseBirthDate(profile.birthDate);
  const timeZone = profile.birthPlace.timezone;
  const warnings = [];
  let year;
  let month;
  let hour;
  let utcInstant = null;

  if (profile.birthTimeKnown) {
    const timeParts = parseBirthTime(profile.birthTime);
    const conversion = localDateTimeToInstant({ ...dateParts, ...timeParts }, timeZone);
    utcInstant = new Date(conversion.epochMs).toISOString();
    if (conversion.ambiguous) warnings.push("Heure civile répétée lors d’un changement de fuseau : la première occurrence a été retenue.");
    year = yearPillarAt(conversion.epochMs, dateParts.year);
    month = monthPillarAt(conversion.epochMs, year);
    const day = dayPillarForDate(dateParts);
    hour = hourPillarForTime(timeParts, day);

    const pillars = { year, month, day, hour };
    const balance = calculateElementBalance(pillars);
    return Object.freeze({
      profileId: profile.id,
      calculationVersion: CALCULATION_VERSION,
      pillars,
      dayMaster: day.stem,
      elements: balance.elements,
      yinYang: balance.yinYang,
      components: balance.components,
      reading: createReading(day.stem, balance.elements, balance.yinYang),
      warnings,
      metadata: {
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthTimeKnown: true,
        timezone: timeZone,
        latitude: profile.birthPlace.latitude,
        longitude: profile.birthPlace.longitude,
        utcInstant,
        calculationConvention: CALCULATION_CONVENTION,
      },
    });
  }

  const nextDate = nextCivilDate(dateParts);
  const start = localDateTimeToInstant({ ...dateParts, hour: 0, minute: 0 }, timeZone).epochMs;
  const end = localDateTimeToInstant({ ...nextDate, hour: 0, minute: 0 }, timeZone).epochMs - 1;
  const yearAtStart = yearPillarAt(start, dateParts.year);
  const yearAtEnd = yearPillarAt(end, dateParts.year);
  year = samePillar(yearAtStart, yearAtEnd)
    ? yearAtStart
    : undeterminedPillar("L’heure manque le jour de la frontière annuelle de Li Chun.");

  if (year.determined) {
    const monthAtStart = monthPillarAt(start, yearAtStart);
    const monthAtEnd = monthPillarAt(end, yearAtEnd);
    month = samePillar(monthAtStart, monthAtEnd)
      ? monthAtStart
      : undeterminedPillar("L’heure manque le jour d’une frontière de mois solaire.");
  } else {
    month = undeterminedPillar("Le mois dépend de la frontière annuelle indéterminée.");
  }

  if (!year.determined || !month.determined) warnings.push("Une frontière solaire tombe ce jour-là ; l’heure serait nécessaire pour lever l’ambiguïté.");
  const day = dayPillarForDate(dateParts);
  hour = undeterminedPillar("Heure de naissance inconnue.");
  const pillars = { year, month, day, hour };
  const balance = calculateElementBalance(pillars);

  return Object.freeze({
    profileId: profile.id,
    calculationVersion: CALCULATION_VERSION,
    pillars,
    dayMaster: day.stem,
    elements: balance.elements,
    yinYang: balance.yinYang,
    components: balance.components,
    reading: createReading(day.stem, balance.elements, balance.yinYang),
    warnings,
    metadata: {
      birthDate: profile.birthDate,
      birthTime: null,
      birthTimeKnown: false,
      timezone: timeZone,
      latitude: profile.birthPlace.latitude,
      longitude: profile.birthPlace.longitude,
      utcInstant: null,
      calculationConvention: CALCULATION_CONVENTION,
    },
  });
}
