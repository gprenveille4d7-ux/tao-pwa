const POSE_MANIFEST_URL =
  "./public/assets/tao/character/poses/poses-manifest.json";
const DEFAULT_POSE_ID = "TAO_POSE_00_NEUTRE";

async function loadPoseRegistry() {
  const response = await fetch(POSE_MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Registre des postures indisponible (${response.status}).`);
  }

  const manifest = await response.json();
  const toRuntimePose = (category) => ([id, pose]) =>
    Object.freeze({
      id,
      category,
      file: `./public${pose.file}`,
      role: pose.role,
      rarity: pose.rarity,
      label: pose.label ?? id.replace("TAO_POSE_", "").replaceAll("_", " "),
    });
  const canonicalPoses = Object.entries(manifest.poses ?? {}).map(
    toRuntimePose("canonical"),
  );
  const variants = Object.entries(manifest.variants ?? {}).map(
    toRuntimePose("variant"),
  );
  const expectedCanonicalPrefixes = Array.from(
    { length: 13 },
    (_, index) => `TAO_POSE_${String(index).padStart(2, "0")}_`,
  );
  const canonicalRegistryIsComplete = expectedCanonicalPrefixes.every((prefix) =>
    canonicalPoses.some(({ id }) => id.startsWith(prefix)),
  );

  if (
    canonicalPoses.length !== 13 ||
    variants.length !== 2 ||
    !canonicalRegistryIsComplete ||
    !canonicalPoses.some(({ id }) => id === DEFAULT_POSE_ID)
  ) {
    throw new Error(
      "Le registre doit contenir les 13 postures canoniques 00 à 12 et 2 variantes.",
    );
  }

  return Object.freeze([...canonicalPoses, ...variants]);
}

function createTaoCharacter(root, poses, reportError) {
  const image = root.querySelector("[data-tao-image]");
  const poseById = new Map(poses.map((pose) => [pose.id, pose]));
  const preparedPoses = new Map();
  let currentPose = poseById.get(DEFAULT_POSE_ID);
  let fallbackInProgress = false;

  function setPose(poseId) {
    const nextPose = poseById.get(poseId);

    if (!nextPose) {
      throw new Error(`Posture TAO inconnue : ${poseId}`);
    }

    currentPose = nextPose;
    root.dataset.pose = nextPose.id;
    image.src = nextPose.file;
    return nextPose;
  }

  function preloadPose(poseId) {
    const pose = poseById.get(poseId);
    if (!pose) return Promise.reject(new Error(`Posture TAO inconnue : ${poseId}`));
    if (preparedPoses.has(poseId)) return preparedPoses.get(poseId);
    const promise = new Promise((resolve, reject) => {
      const preload = new Image();
      preload.decoding = "async";
      preload.addEventListener("load", () => resolve(pose), { once: true });
      preload.addEventListener("error", () => reject(new Error(`Asset introuvable : ${poseId}`)), { once: true });
      preload.src = pose.file;
    }).catch((error) => {
      preparedPoses.delete(poseId);
      throw error;
    });
    preparedPoses.set(poseId, promise);
    return promise;
  }

  image.addEventListener("error", () => {
    const failedPose = currentPose;
    reportError(`Asset introuvable : ${failedPose.id}`);
    console.error(`[TAO] Asset introuvable : ${failedPose.file}`);

    if (failedPose.id !== DEFAULT_POSE_ID && !fallbackInProgress) {
      fallbackInProgress = true;
      setPose(DEFAULT_POSE_ID);
      return;
    }

    fallbackInProgress = false;
  });

  image.addEventListener("load", () => {
    fallbackInProgress = false;
  });

  return Object.freeze({ setPose, preloadPose });
}

function enablePoseDebugPanel(poses, taoCharacter) {
  const panel = document.querySelector("[data-pose-debug]");
  const select = panel.querySelector("[data-pose-select]");
  const label = panel.querySelector("[data-pose-label]");
  const groups = [
    { category: "canonical", label: "POSTURES CANONIQUES" },
    { category: "variant", label: "VARIANTES" },
  ];

  for (const group of groups) {
    const optionGroup = document.createElement("optgroup");
    optionGroup.label = group.label;

    for (const pose of poses.filter(({ category }) => category === group.category)) {
      const option = document.createElement("option");
      option.value = pose.id;
      option.textContent = `${pose.label} — ${pose.role}`;
      optionGroup.append(option);

      const preload = new Image();
      preload.decoding = "async";
      preload.src = pose.file;
    }

    select.append(optionGroup);
  }

  function selectPose(poseId) {
    const pose = taoCharacter.setPose(poseId);
    label.value = `${pose.label} — ${pose.role}`;
  }

  select.addEventListener("change", () => selectPose(select.value));
  panel.hidden = false;
  selectPose(DEFAULT_POSE_ID);
}

async function initializeTaoCharacter() {
  const root = document.querySelector("[data-tao-character]");
  const debugLabel = document.querySelector("[data-pose-label]");
  const poses = await loadPoseRegistry();
  const taoCharacter = createTaoCharacter(root, poses, (message) => {
    if (debugLabel) debugLabel.value = message;
  });
  const debugEnabled = ["poses", "scene"].includes(
    new URLSearchParams(window.location.search).get("debug"),
  );

  if (debugEnabled) {
    enablePoseDebugPanel(poses, taoCharacter);
  } else {
    taoCharacter.setPose(DEFAULT_POSE_ID);
  }

  return taoCharacter;
}

const taoCharacterReady = initializeTaoCharacter().catch((error) => {
  console.error("[TAO] Initialisation de la bibliothèque impossible.", error);
  throw error;
});

export async function setTaoPose(poseId) {
  const taoCharacter = await taoCharacterReady;
  return taoCharacter.setPose(poseId);
}

export async function preloadTaoPose(poseId) {
  const taoCharacter = await taoCharacterReady;
  return taoCharacter.preloadPose(poseId);
}
