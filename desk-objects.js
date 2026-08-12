const MANIFEST_URL = "./public/assets/tao/desk-objects/desk-objects-manifest.json";
const debugEnabled =
  new URLSearchParams(window.location.search).get("debug") === "scene";

const toPublicUrl = (path) => `./public${path}`;

async function loadManifest() {
  const response = await fetch(MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Registre du bureau indisponible (${response.status}).`);
  }

  return response.json();
}

function createObjectElement(object) {
  const image = document.createElement("img");
  image.className = "desk-object";
  image.dataset.deskObject = object.id;
  image.alt = "";
  image.ariaHidden = "true";
  image.draggable = false;
  image.hidden = true;
  image.style.setProperty("--object-x", `${object.position.x}%`);
  image.style.setProperty("--object-bottom", `${object.position.bottom}%`);
  image.style.setProperty("--object-width", `${object.position.width}%`);
  image.style.setProperty("--object-rotation", `${object.position.rotation}deg`);
  image.style.zIndex = object.layer;
  return image;
}

function createDeskObjectController(root, objects) {
  const records = new Map();

  for (const object of objects) {
    const element = createObjectElement(object);
    records.set(object.id, {
      object,
      element,
      loaded: false,
      visible: false,
      requestToken: 0,
    });
    root.append(element);
  }

  const announceChange = (record) => {
    root.dispatchEvent(
      new CustomEvent("tao:desk-object-change", {
        detail: { id: record.object.id, visible: record.visible },
      }),
    );
  };

  const announceError = (record, reason) => {
    root.dispatchEvent(
      new CustomEvent("tao:desk-object-error", {
        detail: { id: record.object.id, file: record.object.file, reason },
      }),
    );
  };

  const setVisible = (id, visible) => {
    const record = records.get(id);

    if (!record) {
      console.error(`[TAO] Objet de bureau inconnu : ${id}`);
      return false;
    }

    record.requestToken += 1;

    if (!visible) {
      record.visible = false;
      record.element.hidden = true;
      announceChange(record);
      return true;
    }

    if (record.loaded) {
      record.visible = true;
      record.element.hidden = false;
      announceChange(record);
      return true;
    }

    const token = record.requestToken;
    const requestedUrl = toPublicUrl(record.object.file);
    const probe = new Image();
    probe.decoding = "async";

    probe.addEventListener("load", () => {
      if (token !== record.requestToken) return;
      record.element.src = requestedUrl;
      record.loaded = true;
      record.visible = true;
      record.element.hidden = false;
      announceChange(record);
    });

    probe.addEventListener("error", () => {
      if (token !== record.requestToken) return;
      record.visible = false;
      record.element.hidden = true;
      console.error(`[TAO] Asset de bureau introuvable : ${requestedUrl}`);
      announceError(record, "asset-load-failed");
    });

    probe.src = requestedUrl;
    return true;
  };

  const getState = () =>
    objects.map((object) => {
      const record = records.get(object.id);
      return { id: object.id, visible: record.visible, loaded: record.loaded };
    });

  return Object.freeze({
    setVisible,
    setDeskObjectVisible: setVisible,
    setAllVisible(visible) {
      for (const id of records.keys()) setVisible(id, visible);
    },
    getState,
    hasObject: (id) => records.has(id),
    objects: Object.freeze([...objects]),
  });
}

function enableDebugPanel(objects, controller, root) {
  const panel = document.querySelector("[data-scene-debug]");
  const host = document.querySelector("[data-desk-debug]");
  if (!panel || !host) return;

  panel.hidden = false;
  document.body.classList.add("is-scene-debug");

  const title = document.createElement("h3");
  title.textContent = `OBJETS DU BUREAU (${objects.length})`;

  const actions = document.createElement("div");
  actions.className = "scene-debug__actions";

  const showAll = document.createElement("button");
  showAll.type = "button";
  showAll.textContent = "Tout afficher";

  const hideAll = document.createElement("button");
  hideAll.type = "button";
  hideAll.textContent = "Tout masquer";
  actions.append(showAll, hideAll);

  const list = document.createElement("div");
  list.className = "scene-debug__checks";
  const inputs = new Map();

  for (const object of objects) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = object.visibleByDefault;
    input.dataset.deskToggle = object.id;
    input.addEventListener("change", () => {
      controller.setVisible(object.id, input.checked);
    });
    inputs.set(object.id, input);
    label.append(input, document.createTextNode(object.label));
    list.append(label);
  }

  const output = document.createElement("output");
  const syncOutput = () => {
    const visible = controller.getState().filter((entry) => entry.visible).length;
    output.value = `${visible} objet${visible > 1 ? "s" : ""} visible${visible > 1 ? "s" : ""}`;
  };

  showAll.addEventListener("click", () => {
    controller.setAllVisible(true);
    for (const input of inputs.values()) input.checked = true;
  });

  hideAll.addEventListener("click", () => {
    controller.setAllVisible(false);
    for (const input of inputs.values()) input.checked = false;
    syncOutput();
  });

  root.addEventListener("tao:desk-object-change", (event) => {
    const input = inputs.get(event.detail.id);
    if (input) input.checked = event.detail.visible;
    syncOutput();
  });

  root.addEventListener("tao:desk-object-error", (event) => {
    const input = inputs.get(event.detail.id);
    if (input) input.checked = false;
    syncOutput();
    console.error("[TAO] Affichage de l’objet refusé.", event.detail);
  });

  syncOutput();
  host.append(title, actions, list, output);
}

async function initializeDeskObjects() {
  const root = document.querySelector("[data-desk-objects]");
  if (!root) return;

  const manifest = await loadManifest();
  const objects = (manifest.runtimeObjects || []).filter(
    (object) => object.runtimeReady === true,
  );

  if (objects.length !== manifest.runtimeReadyCount) {
    throw new Error(
      `Le registre annonce ${manifest.runtimeReadyCount} objets utilisables, mais ${objects.length} sont disponibles.`,
    );
  }

  const controller = createDeskObjectController(root, objects);
  window.taoDeskObjects = controller;

  for (const object of objects) {
    if (object.visibleByDefault) controller.setVisible(object.id, true);
  }

  if (debugEnabled) enableDebugPanel(objects, controller, root);
}

initializeDeskObjects().catch((error) =>
  console.error("[TAO] Initialisation des objets du bureau impossible.", error),
);
