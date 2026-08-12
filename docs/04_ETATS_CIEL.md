# Étape 9 — États du ciel et de l’extérieur

## Statut

**TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**

Le système visuel est désormais automatique en production et reste pilotable manuellement en développement. `automaticBehaviorEnabled` vaut `true` : le lieu du profil, l’heure solaire, la météo normalisée et la saison composent l’extérieur. Le fonctionnement détaillé se trouve dans `docs/16_ENVIRONNEMENT_DYNAMIQUE.md`.

## Source de vérité

Le dossier `public/assets/tao/outside/states/` contient exactement 19 PNG autonomes. Les 19 sont enregistrés dans `sky-manifest.json` avec un identifiant, un fichier, un libellé, une catégorie et leurs dimensions.

`OUTSIDE_AURORE_POLAIRE_RARE_FJORD.png` est enregistré comme état céleste manuel. Il n’est pas l’état par défaut et ne déclenche aucun automatisme.

Les planches multi-états restent des références visuelles uniquement. Elles ne sont ni rendues comme paysage runtime, ni découpées, ni modifiées.

## Contrôleurs automatique et manuel

`exterior-states.js` charge le manifeste et conserve l’API manuelle. Il utilise deux images partageant exactement le même cadrage afin de produire un fondu sans flash. `environment-controller.js` sélectionne l’état à partir de `solar-engine.mjs`, `weather-service.mjs` et `environment-engine.mjs`.

L’API `window.taoExterior` expose :

- `setState(id)` pour demander un changement ;
- `getState()` pour lire l’état actif ;
- `hasState(id)` pour vérifier un identifiant ;
- `states` pour consulter le registre runtime.

Avant de rendre le nouvel asset visible, le contrôleur vérifie son chargement. Le changement utilise un fondu de 2,2 secondes. En cas d’identifiant inconnu ou d’échec réseau, le dernier paysage valide reste visible.

Le mode `?debug=scene` affiche les 19 assets manuels. Le mode local `?debug=environment` simule les moments et météos. Ces panneaux restent des outils DEV uniquement ; la production reste en `AUTO`.

## Cadrage

Le calque extérieur conserve `object-fit: contain` et `object-position: center` :

- les sources 3:2 remplissent naturellement la scène 3:2 ;
- les sources 4:3 restent intégralement visibles ;
- leurs marges latérales sont masquées par l’architecture du Pavillon ;
- aucune distorsion n’est appliquée ; les deux calques du fondu utilisent les mêmes variables de cadrage.

## Indépendance

Changer l’extérieur ne modifie ni TAO, ni son état narratif, ni le dialogue, ni le profil, ni la navigation, ni le bureau maître, ni les objets variables.

## Phases lunaires

Les phases lunaires restent **REPORTÉES**. La planche source est conservée sans découpage et aucune phase n’est exposée dans le sélecteur.
