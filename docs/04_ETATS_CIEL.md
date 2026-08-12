# Étape 9 — États du ciel et de l’extérieur

## Statut

**TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**

Le système est exclusivement visuel et manuel. `automaticBehaviorEnabled` reste à `false` et aucune donnée de date, heure, météo, saison, profil, astrologie, Yi Jing, dialogue ou IA ne pilote l’extérieur.

## Source de vérité

Le dossier `public/assets/tao/outside/states/` contient exactement 19 PNG autonomes. Les 19 sont enregistrés dans `sky-manifest.json` avec un identifiant, un fichier, un libellé, une catégorie et leurs dimensions.

`OUTSIDE_AURORE_POLAIRE_RARE_FJORD.png` est enregistré comme état céleste manuel. Il n’est pas l’état par défaut et ne déclenche aucun automatisme.

Les planches multi-états restent des références visuelles uniquement. Elles ne sont ni rendues comme paysage runtime, ni découpées, ni modifiées.

## Contrôleur manuel

`exterior-states.js` charge le manifeste sans précharger les 19 grandes images. Le PNG par défaut est demandé directement par le document ; chaque autre état n’est chargé qu’au moment de sa sélection.

L’API `window.taoExterior` expose :

- `setState(id)` pour demander un changement ;
- `getState()` pour lire l’état actif ;
- `hasState(id)` pour vérifier un identifiant ;
- `states` pour consulter le registre runtime.

Le changement est direct et sans transition. Avant de remplacer l’image visible, le contrôleur vérifie que le nouveau PNG charge correctement. En cas d’identifiant inconnu ou d’échec réseau, il conserve le dernier paysage valide et journalise l’erreur.

Le mode `?debug=scene` affiche « DÉCOR EXTÉRIEUR (19) », les 19 libellés et l’état actif. Ce panneau reste un outil DEV uniquement.

## Cadrage

Le calque extérieur conserve `object-fit: contain` et `object-position: center` :

- les sources 3:2 remplissent naturellement la scène 3:2 ;
- les sources 4:3 restent intégralement visibles ;
- leurs marges latérales sont masquées par l’architecture du Pavillon ;
- aucune distorsion ni transition n’est appliquée.

## Indépendance

Changer l’extérieur ne modifie ni TAO, ni son état narratif, ni le dialogue, ni le profil, ni la navigation, ni le bureau maître, ni les objets variables.

## Phases lunaires

Les phases lunaires restent **REPORTÉES**. La planche source est conservée sans découpage et aucune phase n’est exposée dans le sélecteur.
