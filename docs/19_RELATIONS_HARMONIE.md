# Relations & harmonie

Version : `tao-relationship-1.0.0`

## Intention

Le module met en regard deux thèmes BaZi déjà calculés. Il n’attribue aucun pourcentage de compatibilité et ne prédit ni la qualité, ni la durée, ni l’avenir d’une relation. Les niveaux qualitatifs sont des repères éditoriaux de TAO, pas des mesures objectives.

## Flux

1. L’utilisateur choisit deux profils existants et distincts.
2. Il précise le contexte : couple, parent et enfant, famille, amitié, travail ou autre.
3. Il choisit un angle de lecture.
4. `relationship-engine.mjs` compare les faits déterministes.
5. `relationship-semantic.mjs` produit une lecture française accessible.
6. L’interface montre d’abord la dynamique humaine, puis les faits traditionnels dans une section facultative.

## Faits utilisés

- Maître du Jour de chaque profil ;
- relation entre leurs Éléments fondamentaux ;
- Dix Dieux calculés dans les deux directions ;
- combinaisons et oppositions croisées des Branches présentes ;
- proximité de polarité et répartition élémentaire, uniquement pour qualifier des tendances.

Le sens A vers B et le sens B vers A sont toujours conservés séparément. Une relation des Dix Dieux n’est jamais supposée réciproque.

## Couple

Le Pilier du Jour peut être signalé comme repère relationnel uniquement lorsque le contexte choisi est « Couple ». Il ne devient pas un verdict sur le conjoint et n’est jamais utilisé pour annoncer un événement.

## Conversation avec TAO

Le bouton « Parler de notre relation avec TAO » ouvre le mode `explanation` existant. Seuls des identifiants et faits relationnels minimisés sont transmis. Les dates, heures, lieux et coordonnées de naissance ne quittent pas l’appareil. Gemini explique les faits ; il ne recalcule aucun thème.

## Limites V1

Les cycles relationnels et les climats temporels ne sont pas calculés dans cette version. Le module le signale explicitement et ne produit aucune donnée temporelle fictive.

## Tests

`tests/relationship-engine.test.mjs` vérifie la direction des relations, les interactions croisées, l’absence de score, la variation selon le contexte, la minimisation des faits IA et le refus de comparer un profil avec lui-même.
