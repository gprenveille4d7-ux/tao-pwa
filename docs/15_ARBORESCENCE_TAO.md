# Arborescence fonctionnelle de TAO

Version : `tao-tree-1.0.0`  
Date : 12 août 2026

## Principe

La navigation conserve cinq espaces : **Aujourd’hui**, **Mon thème**, **Le Pavillon**, **Yi Jing** et **Profils**. Chaque espace possède une navigation secondaire horizontale, adaptée au pouce, et des ancres partageables. Les pages restent verticales : résumé, lecture principale, explication, approfondissement.

## Routes

- `#today/guidance`, `energies`, `personal`, `cycles`, `nature`
- `#theme/overview`, `pillars`, `elements`, `structure`, `ten-gods`, `cycles`, `life`
- `#pavilion/tao`, `sky`, `desk`, `library`, `almanac`
- `#yijing/consult`, `history`, `learn`
- `#profiles/me`, `people`, `compatibility`

Une route inconnue revient à `#pavilion/tao`. Les cinq liens principaux restent compatibles avec les anciens signets (`#today`, `#theme`, etc.) et ouvrent la première section de l’espace.

## Données et interprétation

Les identifiants des moteurs restent inchangés. `bazi-insights.mjs` calcule uniquement des relations déterministes à partir du résultat BaZi existant : Dix Dieux des Troncs visibles, Six Combinaisons et oppositions des Branches. `knowledge-base.mjs` normalise la documentation locale existante sans dupliquer les calculs.

Les données non disponibles sont signalées par **Moteur en attente** : Da Yun, punitions/dommages/ruptures détaillés, compatibilité qualitative complète, phase lunaire et événements astronomiques. Aucune valeur de remplissage n’est produite.

## Expérience des cinq espaces

- **Aujourd’hui** : guidance immédiate, énergie du jour, résonance personnelle, cycles calculables, distinction entre terme solaire BaZi et astronomie.
- **Mon thème** : vue d’ensemble, Quatre Piliers, éléments, Troncs cachés, interactions visibles, Dix Dieux, état des cycles et premières portes de lecture.
- **Le Pavillon** : le décor n’est pas modifié ; sous la scène mobile, cinq accès relient TAO, le ciel, le bureau, la bibliothèque et l’almanach aux contenus réels.
- **Yi Jing** : consultation existante, historique avec favoris et bibliothèque pédagogique des 8 trigrammes et 64 hexagrammes.
- **Profils** : profil actif, proches, ajout/modification/suppression des proches et état explicite de la future comparaison.

## Mobile et accessibilité

À 390 px, la navigation secondaire défile horizontalement sans imposer de scroll à la page. Les grilles deviennent monocolonnes, les cibles tactiles mesurent au moins 2,6 rem, les sections ont des titres et des ancres, et aucun contenu ne dépasse la largeur de l’écran. Le Pavillon conserve son cadrage et son système de calques.

## Ajouter une profondeur

1. Ajouter l’identifiant dans `SECTION_ROUTES` de `navigation-routes.mjs`.
2. Ajouter le libellé au tableau de sections de la vue.
3. Marquer le conteneur avec `markProductSection`.
4. Connecter uniquement une donnée déterministe ou afficher un état d’attente explicite.
5. Ajouter un test de route et un test métier lorsque la section contient un calcul.
