# TAO AI Worker

Route publique : `POST /v1/tao/respond`. Santé : `GET /health`.

## Chaîne de fournisseurs

1. `gemini-3.6-flash`
2. `gemini-3.5-flash-lite` pour une indisponibilité temporaire compatible
3. `@cf/google/gemma-4-26b-a4b-it` via le binding Workers AI `AI`
4. `@cf/zai-org/glm-4.7-flash`
5. réponse locale déterministe dans la PWA

Une erreur Gemini `429` ou `RESOURCE_EXHAUSTED` saute volontairement l’étape 2. Chaque sortie est validée par le même contrat TAO. Les journaux ne contiennent ni message utilisateur, ni contexte BaZi, ni clé secrète.

## Configuration et déploiement

Le binding Workers AI et les modèles sont déclarés dans `wrangler.jsonc`. La clé Gemini reste un secret facultatif à l’exécution :

```sh
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

Sans clé Gemini, le Worker commence directement par Workers AI. Tester localement avec `npm test` depuis ce dossier, puis vérifier `/health` après déploiement.
