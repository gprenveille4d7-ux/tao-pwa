# Cerveau IA TAO — Gemini derrière Cloudflare Worker

Version : `tao-brain-v1`  
Contrat : `tao-ai-contract-1`

## Architecture retenue

```text
TAO PWA (GitHub Pages)
  ├─ moteurs BaZi, quotidien et Yi Jing locaux
  ├─ couche sémantique française locale
  ├─ contexte minimisé, mémoire et cache locaux
  └─ POST HTTPS
       ↓
Cloudflare Worker /v1/tao/respond
  ├─ validation, CORS, limites, rate limiting
  ├─ prompt système et schéma strict
  └─ secret GEMINI_API_KEY
       ↓
Gemini Interactions API (store: false)
```

Gemini est placé après les moteurs. Il explique et relie des faits déjà calculés ; il ne calcule jamais le BaZi et ne tire jamais le Yi Jing. Une panne réseau, un quota épuisé ou un Worker absent n’empêche aucune fonction déterministe de TAO.

## Inventaire réutilisé

- `bazi-engine.mjs`, `bazi-cache.mjs` : thème natal déterministe et cache par profil ;
- `daily-tao-engine.mjs`, `daily-cache.mjs` : faits quotidiens, domaines et recommandations ;
- `semantic-layer.mjs` : archétypes, relations, `sourceFacts`, règles et confiance ;
- `yijing-engine.mjs`, `yijing-guidance.mjs`, `yijing-history.js` : tirage, mutations, guidance et carnet ;
- `profile-store.js` : profil actif et persistance locale ;
- `tao-character.js`, `tao-narrative.js`, `tao-presence.js` : quinze PNG réels et remplacement direct ;
- `environment-controller.js` : moment, saison et météo déterministes ;
- `localStorage` : stratégie de persistance déjà canonique du projet.

## API Gemini vérifiée le 13 août 2026

L’intégration emploie l’API **Interactions**, recommandée pour les nouveaux projets, et non un ancien exemple `generateContent`. Le Worker appelle `POST https://generativelanguage.googleapis.com/v1beta/interactions`, désactive la conservation serveur avec `store: false`, et impose `response_format` avec un JSON Schema. Le modèle principal est `gemini-3.6-flash`, stable ; le repli unique est `gemini-3.5-flash-lite`, stable. Les paramètres dépréciés `temperature`, `top_p` et `top_k` ne sont pas utilisés.

Références officielles :

- https://ai.google.dev/gemini-api/docs/interactions-overview
- https://ai.google.dev/api/interactions-api-v1
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/latest-model

## Contrat et minimisation

`buildTaoAIContext(mode)` produit cinq contextes : `conversation`, `daily_synthesis`, `explanation`, `yijing`, `presence`. Il transmet le prénom d’affichage, l’archétype sémantique, le Maître du Jour calculé, les faits utiles du jour, et éventuellement le tirage déjà établi. Il n’envoie pas la date de naissance, l’heure de naissance, la ville, les coordonnées ni le profil complet.

Chaque fait a un identifiant. `validateTaoAIResponse()` supprime tout `supportingFactId` absent de l’enveloppe envoyée. Le schéma limite aussi les suggestions, les intentions narratives et les propositions de mémoire.

## Mémoire et cache

- session : huit messages utiles maximum ;
- continuité : dernière visite, cinq sujets récents et un court résumé local ;
- mémoire explicite : API locale disponible, uniquement après une demande explicite ;
- synthèse quotidienne : clé profil + date locale + hash des faits + version du prompt + version fournisseur.

Gemini peut proposer des `memoryCandidates`, mais le client ne les enregistre jamais automatiquement. Aucun historique de conversation n’est conservé côté Worker.

## Présence

Les intentions sont traduites localement vers les postures existantes : neutral, accueil, observation, réflexion, Yi Jing, lecture, explication, contemplation, regard extérieur, interrogation et concentration. Le client conserve la maîtrise, ignore les intentions faibles et maintient une posture au moins huit secondes. Aucun fondu, morphing ou asset inventé n’est permis.

## Sécurité Worker

- clé uniquement dans le secret Cloudflare `GEMINI_API_KEY` ;
- origines de production limitées à `https://gprenveille4d7-ux.github.io` ;
- localhost permis uniquement lors d’un Worker local ;
- corps limité à 32 Kio, huit messages et 2 000 caractères par message ;
- modes et propriétés inconnus refusés ;
- rate limiting natif Cloudflare : 12 requêtes par minute et par clé réseau ;
- timeout 18 secondes ;
- au plus une tentative sur le modèle de repli ;
- journaux limités à requestId, date, mode, modèle, latence, statut, repli et consommation ;
- aucun texte de conversation, profil ou question Yi Jing dans les logs applicatifs.

Cloudflare recommande `wrangler.jsonc`, les secrets Wrangler et fournit un binding natif de rate limiting. Références :

- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/workers/platform/limits/

## Confidentialité

Avant la première activation, TAO explique que les informations utiles seront envoyées au service Gemini de Google. La fonction peut être désactivée depuis Profils ou depuis le panneau de conversation. Les conditions Gemini dépendent du plan et de la région ; l’interface ne prétend donc pas que Google ne traite jamais les contenus. Référence actuelle : https://ai.google.dev/gemini-api/terms

## Configuration locale

Depuis `worker/` :

```powershell
Copy-Item .dev.vars.example .dev.vars
# Remplacer la valeur factice par une clé dédiée au projet TAO.
npx wrangler dev
```

La PWA accepte un endpoint local uniquement par configuration runtime, jamais une clé :

```html
<script>window.TAO_AI_ENDPOINT = "http://127.0.0.1:8787";</script>
```

Le mock d’interface, limité à localhost, est disponible avec `?ai=mock#pavilion`. Il ne calcule aucune donnée et ne simule qu’une réponse conforme au contrat.

## Déploiement

### Production active

- Worker : `https://tao-ai.g-prenveille4d7.workers.dev`
- Healthcheck : `https://tao-ai.g-prenveille4d7.workers.dev/health`
- Endpoint : `POST https://tao-ai.g-prenveille4d7.workers.dev/v1/tao/respond`
- Modèle principal validé : `gemini-3.6-flash`
- Secret : configuré uniquement dans Cloudflare sous `GEMINI_API_KEY`
- Validation réelle : healthcheck et réponse structurée réussis le 13 août 2026

Depuis `worker/` :

```powershell
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

Vérifier ensuite :

```powershell
Invoke-RestMethod https://<worker-tao>.<account>.workers.dev/health
```

Copier l’URL publique, avec `https://`, dans `TAO_AI_PUBLIC_CONFIG.endpoint` dans `tao-ai-config.js`, puis publier la PWA. Ne jamais mettre la clé dans ce fichier, `wrangler.jsonc`, GitHub Pages, `localStorage`, IndexedDB ou le service worker.

## Debug

`?debug=semantics#today` conserve la trace sémantique et affiche dans la conversation `TAO AI DEBUG` : activation, fournisseur, modèle, mode, taille du contexte, faits envoyés et utilisés, cache, latence, repli et erreur. La clé n’est jamais disponible côté client.

## Tests

Les tests couvrent le contexte et l’absence de données natales brutes, le schéma, le filtrage des IDs, le cache quotidien, l’intégration des vues, le service worker, l’absence de clé publique, le healthcheck, CORS, payload invalide, taille maximale, quota, réponse invalide et repli unique.
