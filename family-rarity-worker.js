import { estimateFamilyRarity } from "./family-rarity-engine.mjs?v=2.0.1";

self.addEventListener("message", (event) => {
  const { requestId, input, options = {} } = event.data ?? {};
  if (!requestId || !input) return;
  try {
    const result = estimateFamilyRarity(input, {
      simulationCount: options.simulationCount,
      model: options.model,
      seed: options.seed,
      onProgress(progress) {
        self.postMessage({ type: "progress", requestId, progress });
      },
    });
    self.postMessage({ type: "result", requestId, result });
  } catch (error) {
    self.postMessage({ type: "error", requestId, error: error instanceof Error ? error.message : "Simulation indisponible." });
  }
});
