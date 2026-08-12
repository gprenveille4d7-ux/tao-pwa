const MANIFEST_URL = "./public/assets/tao/outside/sky-manifest.json";
const debugMode = new URLSearchParams(window.location.search).get("debug");
const debugEnabled = ["scene", "outside"].includes(debugMode);

const DEFAULT_COMPOSITION = Object.freeze({
  x: 8,
  y: -19,
  scale: 0.53,
});

const toPublicUrl = (path) => `./public${path}`;

async function loadManifest() {
  const response = await fetch(MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Registre extérieur indisponible (${response.status}).`);
  }

  return response.json();
}

function createExteriorController(image, states, defaultStateId) {
  const stateById = new Map(states.map((state) => [state.id, state]));
  const fallbackState = stateById.get(defaultStateId) ?? states[0];
  let currentStateId = fallbackState.id;
  let requestToken = 0;

  image.src = toPublicUrl(fallbackState.file);
  image.dataset.exteriorState = fallbackState.id;

  const announceChange = (state) => {
    image.dispatchEvent(
      new CustomEvent("tao:exterior-change", { detail: state }),
    );
  };

  const announceError = (detail) => {
    image.dispatchEvent(new CustomEvent("tao:exterior-error", { detail }));
  };

  const setState = (id) => {
    const state = stateById.get(id);

    if (!state) {
      requestToken += 1;
      console.error(`[TAO] État extérieur inconnu : ${id}`);
      announceError({ id, reason: "unknown-id", activeStateId: currentStateId });
      return false;
    }

    if (state.id === currentStateId) {
      requestToken += 1;
      announceChange(state);
      return true;
    }

    const token = ++requestToken;
    const requestedUrl = toPublicUrl(state.file);
    const probe = new Image();
    probe.decoding = "async";

    probe.addEventListener("load", () => {
      if (token !== requestToken) return;
      image.src = requestedUrl;
      image.dataset.exteriorState = state.id;
      currentStateId = state.id;
      announceChange(state);
    });

    probe.addEventListener("error", () => {
      if (token !== requestToken) return;
      console.error(`[TAO] Asset extérieur introuvable : ${requestedUrl}`);
      announceError({
        id: state.id,
        file: state.file,
        reason: "asset-load-failed",
        activeStateId: currentStateId,
      });
    });

    probe.src = requestedUrl;
    return true;
  };

  return Object.freeze({
    setState,
    getState: () => currentStateId,
    hasState: (id) => stateById.has(id),
    states: Object.freeze([...states]),
  });
}

function createCompositionControls(image) {
  const values = { ...DEFAULT_COMPOSITION };
  const fieldset = document.createElement("fieldset");
  fieldset.className = "scene-debug__tuning";

  const legend = document.createElement("legend");
  legend.textContent = "CADRAGE DU PAYSAGE";
  fieldset.append(legend);

  const readout = document.createElement("output");
  readout.className = "scene-debug__readout";
  readout.dataset.exteriorComposition = "";

  const updateComposition = () => {
    image.style.setProperty("--outside-x", `${values.x}%`);
    image.style.setProperty("--outside-y", `${values.y}%`);
    image.style.setProperty("--outside-scale", String(values.scale));
    readout.value = `X ${values.x} % · Y ${values.y} % · ÉCHELLE ${values.scale.toFixed(2)}`;
  };

  const addRange = ({ key, label, min, max, step, format }) => {
    const row = document.createElement("label");
    row.className = "scene-debug__range";

    const title = document.createElement("span");
    title.textContent = label;

    const value = document.createElement("output");
    value.htmlFor = `outside-${key}`;

    const input = document.createElement("input");
    input.id = `outside-${key}`;
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(values[key]);
    input.dataset.exteriorControl = key;

    const refreshValue = () => {
      values[key] = Number(input.value);
      value.value = format(values[key]);
      updateComposition();
    };

    input.addEventListener("input", refreshValue);
    refreshValue();
    row.append(title, value, input);
    fieldset.append(row);
  };

  addRange({ key: "x", label: "Horizontal", min: -20, max: 20, step: 1, format: (value) => `${value} %` });
  addRange({ key: "y", label: "Vertical", min: -25, max: 5, step: 1, format: (value) => `${value} %` });
  addRange({ key: "scale", label: "Échelle", min: 0.5, max: 1.1, step: 0.01, format: (value) => value.toFixed(2) });

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Réinitialiser le cadrage";
  reset.addEventListener("click", () => {
    values.x = DEFAULT_COMPOSITION.x;
    values.y = DEFAULT_COMPOSITION.y;
    values.scale = DEFAULT_COMPOSITION.scale;
    for (const input of fieldset.querySelectorAll("input[data-exterior-control]")) {
      input.value = String(values[input.dataset.exteriorControl]);
      input.dispatchEvent(new Event("input"));
    }
  });

  const hint = document.createElement("small");
  hint.textContent = "Réglage de test non enregistré : communique les valeurs affichées pour les officialiser.";

  fieldset.append(readout, reset, hint);
  updateComposition();
  return fieldset;
}

function enableOutsidePanelToggle(panel) {
  const header = panel.querySelector("header");
  if (!header) return;

  panel.classList.add("scene-debug--outside");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "scene-debug__toggle";
  toggle.setAttribute("aria-expanded", "true");
  toggle.textContent = "Réduire";
  toggle.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("scene-debug--collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.textContent = collapsed ? "Afficher" : "Réduire";
  });
  header.append(toggle);
}

function enableDebugPanel(controller, image) {
  const panel = document.querySelector("[data-scene-debug]");
  const host = document.querySelector("[data-exterior-debug]");
  if (!panel || !host) return;

  panel.hidden = false;
  document.body.classList.add("is-scene-debug");
  if (debugMode === "outside") enableOutsidePanelToggle(panel);

  const label = document.createElement("label");
  label.htmlFor = "exterior-state-select";
  label.textContent = `DÉCOR EXTÉRIEUR (${controller.states.length})`;

  const select = document.createElement("select");
  select.id = "exterior-state-select";
  select.dataset.exteriorSelect = "";

  for (const state of controller.states) {
    const option = document.createElement("option");
    option.value = state.id;
    option.textContent = state.label || state.title || state.id;
    select.append(option);
  }

  const output = document.createElement("output");

  const showActiveState = () => {
    select.value = controller.getState();
    output.value = select.selectedOptions[0]?.textContent || controller.getState();
  };

  select.addEventListener("change", () => {
    const requested = controller.setState(select.value);
    output.value = requested ? "Chargement…" : "État extérieur inconnu";
    if (!requested) showActiveState();
  });

  image.addEventListener("tao:exterior-change", showActiveState);
  image.addEventListener("tao:exterior-error", (event) => {
    showActiveState();
    output.value = `Échec du chargement — ${output.value}`;
    console.error("[TAO] Changement extérieur refusé.", event.detail);
  });

  showActiveState();
  host.append(label, select, output, createCompositionControls(image));
}

async function initializeExteriorStates() {
  const image = document.querySelector("[data-exterior-image]");
  if (!image) return;

  const manifest = await loadManifest();
  const states = (manifest.standaloneStates || []).filter(
    (state) => state.status !== "BLOCKED",
  );

  if (states.length !== 19) {
    throw new Error(`Le registre extérieur doit contenir 19 états (reçu : ${states.length}).`);
  }

  const controller = createExteriorController(
    image,
    states,
    manifest.defaultState,
  );
  window.taoExterior = controller;

  if (debugEnabled) enableDebugPanel(controller, image);
}

initializeExteriorStates().catch((error) =>
  console.error("[TAO] Initialisation des états extérieurs impossible.", error),
);
