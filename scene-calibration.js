const CALIBRATION_PARAM = "calibration";
const STORAGE_KEY = "tao.sceneCalibration.v1";
const CALIBRATION_REFERENCE_WIDTH = 1080;

const LAYERS = Object.freeze({
  tao: {
    label: "TAO",
    selector: '[data-calibration-target="tao"]',
    defaults: { translateX: -105, translateY: 74, scale: 1.33, renderWidth: 51.8, zIndex: 31, opacity: 1 },
    widthRange: [20, 100],
  },
  desk: {
    label: "BUREAU VIDE",
    selector: '[data-calibration-target="desk"]',
    defaults: { translateX: -5, translateY: 42, scale: 1.22, renderWidth: 84.18, zIndex: 30, opacity: 1 },
    widthRange: [20, 140],
    hint: "Plateau vide autonome : tous les objets sont maintenant des calques séparés.",
    calibrationPreview: true,
  },
  deskMat: {
    label: "TAPIS CENTRAL",
    selector: '[data-calibration-target="deskMat"]',
    defaults: { translateX: -46, translateY: 142, scale: 1.79, renderWidth: 35.99, zIndex: 30, opacity: 1 },
    widthRange: [8, 70],
    hint: "Carte céleste autonome, indépendante du bureau vide.",
    calibrationPreview: true,
  },
  deskPlant: {
    label: "OBJET — PLANTE",
    selector: '[data-calibration-target="deskPlant"]',
    defaults: { translateX: -82, translateY: 12, scale: 2.39, renderWidth: 10.44, zIndex: 33, opacity: 1 },
    widthRange: [3, 40],
    calibrationPreview: true,
  },
  deskLanternLeft: {
    label: "OBJET — LANTERNE GAUCHE",
    selector: '[data-calibration-target="deskLanternLeft"]',
    defaults: { translateX: -123, translateY: 162, scale: 1.09, renderWidth: 14, zIndex: 42, opacity: 1 },
    widthRange: [3, 35],
    calibrationPreview: true,
  },
  deskBowl: {
    label: "OBJET — BOL",
    selector: '[data-calibration-target="deskBowl"]',
    defaults: { translateX: 251, translateY: 80, scale: 1.38, renderWidth: 10.79, zIndex: 51, opacity: 1 },
    widthRange: [2, 30],
    calibrationPreview: true,
  },
  deskBooksSmall: {
    label: "OBJET — PETITS LIVRES",
    selector: '[data-calibration-target="deskBooksSmall"]',
    defaults: { translateX: 59, translateY: 285, scale: 1.61, renderWidth: 21.52, zIndex: 88, opacity: 1 },
    widthRange: [3, 40],
    calibrationPreview: true,
  },
  deskBooksLarge: {
    label: "OBJET — GRANDS LIVRES",
    selector: '[data-calibration-target="deskBooksLarge"]',
    defaults: { translateX: -89, translateY: 108, scale: 1.35, renderWidth: 22, zIndex: 65, opacity: 1 },
    widthRange: [3, 45],
    calibrationPreview: true,
  },
  deskLanternRight: {
    label: "OBJET — LANTERNE DROITE",
    selector: '[data-calibration-target="deskLanternRight"]',
    defaults: { translateX: 78, translateY: 101, scale: 1.17, renderWidth: 19.01, zIndex: 65, opacity: 1 },
    widthRange: [3, 35],
    calibrationPreview: true,
  },
  shelfPatch: {
    label: "ÉTAGÈRE",
    selector: '[data-calibration-target="shelfPatch"]',
    defaults: { translateX: 6, translateY: 15, scale: 1.16, renderWidth: 10.52, zIndex: 9, opacity: 1 },
    widthRange: [5, 50],
    hint: "Calque fixe indépendant de la structure du Pavillon.",
  },
});

const CONTROL_DEFINITIONS = Object.freeze([
  { key: "translateX", label: "Déplacement X (px)", min: -600, max: 600, step: 1 },
  { key: "translateY", label: "Déplacement Y (px)", min: -500, max: 500, step: 1 },
  { key: "scale", label: "Échelle", min: 0.2, max: 2.5, step: 0.01 },
  { key: "renderWidth", label: "Largeur (% scène)", min: 5, max: 140, step: 0.01 },
  { key: "zIndex", label: "Z-index", min: -10, max: 120, step: 1 },
  { key: "opacity", label: "Opacité", min: 0, max: 1, step: 0.01 },
]);

const calibrationEnabled =
  new URLSearchParams(window.location.search).get(CALIBRATION_PARAM) === "1";

function cloneDefaults() {
  return Object.fromEntries(
    Object.entries(LAYERS).map(([id, layer]) => [id, { ...layer.defaults }]),
  );
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function loadValues() {
  const defaults = cloneDefaults();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaults;

    for (const [layerId, layer] of Object.entries(LAYERS)) {
      const candidate = saved[layerId];
      if (!candidate || typeof candidate !== "object") continue;

      for (const definition of CONTROL_DEFINITIONS) {
        const range = definition.key === "renderWidth" ? layer.widthRange : [definition.min, definition.max];
        defaults[layerId][definition.key] = normalizeNumber(
          candidate[definition.key],
          layer.defaults[definition.key],
          range[0],
          range[1],
        );
      }
    }
  } catch (error) {
    console.warn("[TAO] Calibration locale illisible, valeurs initiales restaurées.", error);
  }

  return defaults;
}

function saveValues(values) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    console.warn("[TAO] Les réglages de calibration ne peuvent pas être conservés localement.", error);
  }
}

function applyValuesToElement(element, current) {
  const toSceneUnit = (referencePixels) =>
    `${(referencePixels / CALIBRATION_REFERENCE_WIDTH) * 100}cqw`;
  element.style.setProperty("--calibration-x", toSceneUnit(current.translateX));
  element.style.setProperty("--calibration-y", toSceneUnit(current.translateY));
  element.style.setProperty("--calibration-scale", String(current.scale));
  element.style.width = `${current.renderWidth}%`;
  element.style.height = "auto";
  element.style.zIndex = String(current.zIndex);
  element.style.opacity = String(current.opacity);
}

function activateCanonicalScene() {
  const legacyDesk = document.querySelector("[data-calibration-legacy-desk]");
  if (legacyDesk) legacyDesk.hidden = true;

  for (const layer of Object.values(LAYERS)) {
    const element = document.querySelector(layer.selector);
    if (!element) continue;
    if (layer.calibrationPreview) element.hidden = false;
    applyValuesToElement(element, layer.defaults);
  }
}

function initializeCalibration() {
  if (!calibrationEnabled) return;

  const panel = document.querySelector("[data-calibration-panel]");
  const records = new Map();
  if (!panel) return;

  const legacyDesk = document.querySelector("[data-calibration-legacy-desk]");
  if (legacyDesk) legacyDesk.hidden = true;

  for (const [id, layer] of Object.entries(LAYERS)) {
    const element = document.querySelector(layer.selector);
    if (element) {
      if (layer.calibrationPreview) element.hidden = false;
      records.set(id, { ...layer, element });
    }
  }

  if (records.size !== Object.keys(LAYERS).length) {
    console.error("[TAO] Calibration impossible : un calque requis est absent.");
    return;
  }

  const values = loadValues();
  const inputs = new Map();
  const readouts = new Map();

  const exportConfiguration = () =>
    JSON.stringify(
      Object.fromEntries(Object.keys(LAYERS).map((id) => [id, { ...values[id] }])),
      null,
      2,
    );

  const applyLayer = (id, persist = true) => {
    const record = records.get(id);
    const current = values[id];
    applyValuesToElement(record.element, current);

    const readout = readouts.get(id);
    if (readout) {
      readout.textContent = `X ${current.translateX}px · Y ${current.translateY}px · échelle ${current.scale.toFixed(2)} · largeur ${current.renderWidth.toFixed(2)}% · z ${current.zIndex} · opacité ${current.opacity.toFixed(2)}`;
    }

    if (persist) saveValues(values);
  };

  const syncLayerInputs = (id) => {
    for (const definition of CONTROL_DEFINITIONS) {
      const pair = inputs.get(`${id}:${definition.key}`);
      if (!pair) continue;
      pair.range.value = String(values[id][definition.key]);
      pair.number.value = String(values[id][definition.key]);
    }
    applyLayer(id);
  };

  const header = document.createElement("header");
  header.className = "calibration-panel__header";
  const title = document.createElement("strong");
  title.textContent = "CALIBRATION VISUELLE";
  const subtitle = document.createElement("small");
  subtitle.textContent = "Réglages temporaires — scène normale inchangée";
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.className = "calibration-panel__collapse";
  collapse.textContent = "Réduire";
  collapse.setAttribute("aria-expanded", "true");
  collapse.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("calibration-panel--collapsed");
    collapse.textContent = collapsed ? "Afficher" : "Réduire";
    collapse.setAttribute("aria-expanded", String(!collapsed));
  });
  header.append(title, subtitle, collapse);
  panel.append(header);

  for (const [id, record] of records) {
    const details = document.createElement("details");
    details.className = "calibration-layer";
    details.open = id === "tao";
    const summary = document.createElement("summary");
    summary.textContent = record.label;
    const body = document.createElement("div");
    body.className = "calibration-layer__body";

    if (record.hint) {
      const hint = document.createElement("p");
      hint.className = "calibration-layer__hint";
      hint.textContent = record.hint;
      body.append(hint);
    }

    for (const definition of CONTROL_DEFINITIONS) {
      const bounds = definition.key === "renderWidth" ? record.widthRange : [definition.min, definition.max];
      const control = document.createElement("div");
      control.className = "calibration-control";
      const label = document.createElement("span");
      label.textContent = definition.label;
      const range = document.createElement("input");
      range.type = "range";
      range.min = String(bounds[0]);
      range.max = String(bounds[1]);
      range.step = String(definition.step);
      range.value = String(values[id][definition.key]);
      range.setAttribute("aria-label", `${record.label} — ${definition.label}`);
      const number = document.createElement("input");
      number.type = "number";
      number.min = range.min;
      number.max = range.max;
      number.step = range.step;
      number.value = range.value;
      number.setAttribute("aria-label", `${record.label} — valeur précise — ${definition.label}`);

      const update = (source) => {
        const next = normalizeNumber(source.value, values[id][definition.key], bounds[0], bounds[1]);
        values[id][definition.key] = next;
        range.value = String(next);
        number.value = String(next);
        applyLayer(id);
        exportBox.value = exportConfiguration();
      };

      range.addEventListener("input", () => update(range));
      number.addEventListener("input", () => update(number));
      inputs.set(`${id}:${definition.key}`, { range, number });
      control.append(label, number, range);
      body.append(control);
    }

    const readout = document.createElement("p");
    readout.className = "calibration-layer__readout";
    readouts.set(id, readout);
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Réinitialiser cet élément";
    reset.addEventListener("click", () => {
      values[id] = { ...LAYERS[id].defaults };
      syncLayerInputs(id);
      exportBox.value = exportConfiguration();
    });
    body.append(readout, reset);
    details.append(summary, body);
    panel.append(details);
  }

  const exportBox = document.createElement("textarea");
  exportBox.className = "calibration-panel__export";
  exportBox.readOnly = true;
  exportBox.setAttribute("aria-label", "Configuration de calibration exportable");

  const actions = document.createElement("div");
  actions.className = "calibration-panel__actions";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copier les valeurs";
  const resetAll = document.createElement("button");
  resetAll.type = "button";
  resetAll.textContent = "Réinitialiser tout";
  const status = document.createElement("p");
  status.className = "calibration-panel__status";
  status.setAttribute("role", "status");

  copy.addEventListener("click", async () => {
    exportBox.value = exportConfiguration();
    try {
      await navigator.clipboard.writeText(exportBox.value);
      status.textContent = "Configuration copiée dans le presse-papiers.";
    } catch {
      exportBox.focus();
      exportBox.select();
      status.textContent = "Copie automatique indisponible : le JSON est sélectionné.";
    }
  });

  resetAll.addEventListener("click", () => {
    const defaults = cloneDefaults();
    for (const id of Object.keys(LAYERS)) {
      values[id] = defaults[id];
      syncLayerInputs(id);
    }
    exportBox.value = exportConfiguration();
    status.textContent = "Tous les calques ont retrouvé leurs valeurs initiales.";
  });

  actions.append(copy, resetAll);
  panel.append(actions, exportBox, status);

  for (const id of records.keys()) applyLayer(id, false);
  saveValues(values);
  exportBox.value = exportConfiguration();
  panel.hidden = false;
  document.body.classList.add("is-calibration-mode");

  window.taoCalibration = Object.freeze({
    getConfiguration: () => JSON.parse(exportConfiguration()),
    reset: () => resetAll.click(),
    storageKey: STORAGE_KEY,
  });
}

activateCanonicalScene();
initializeCalibration();
