# Constellation familiale

Versions : `tao-family-number-2.0.0`, `tao-family-pattern-2.0.0` et `tao-family-rarity-2.0.0`

## Principe

Le module observe des correspondances calculées à partir des dates, heures, âges et événements familiaux. Il sépare strictement le calcul local, la sélection des motifs, la formulation française et l’approfondissement facultatif avec TAO. Une correspondance n’est jamais présentée comme une preuve de causalité, de destin ou d’influence surnaturelle.

## Données utilisées

- deux profils locaux ou davantage ;
- date de naissance ;
- heure de naissance lorsqu’elle est connue ;
- rôle familial choisi pour la lecture ;
- événements familiaux facultatifs, conservés localement.

L’absence d’heure n’empêche pas l’analyse. Le moteur ignore simplement les signatures horaires impossibles à calculer.

## Valeurs dérivées

Pour chaque profil, le moteur conserve le jour, le mois, l’année, la somme brute des chiffres de la date, sa réduction, le jour de l’année et le jour de la semaine. Lorsque l’heure est connue, il conserve aussi l’heure, les minutes, la somme brute des chiffres de l’heure et la somme date + heure. Les valeurs brutes ne sont jamais remplacées par leur réduction.

Les intervalles calendaires utilisent une arithmétique exacte en années, mois et jours. Les âges tiennent compte du passage effectif de l’anniversaire. Un mois n’est jamais assimilé arbitrairement à trente jours.

## Opérations autorisées

Niveau direct : égalité, date miroir jour/mois, inversion de nombres, palindrome, répétition, intervalle réel et correspondance événement/âge.

Niveau relation simple : somme, différence, double, triple et réduction numérique déjà dérivée.

Niveau curiosité : multiplication simple et jour de semaine. Ces motifs reçoivent un poids inférieur. Le moteur n’enchaîne jamais des opérations telles que `(A × B) - C + D` et limite les transformations à deux.

## Sélection, score et clusters

`interestScore` est un score purement technique destiné à l’interface. Il favorise les égalités indépendantes, dates miroirs, motifs partagés par plusieurs profils, passages intergénérationnels et événements indépendants. Il pénalise les transformations et opérations moins directes.

L’utilisateur ne voit jamais ce score. L’interface emploie seulement « Correspondance très nette », « Correspondance intéressante » ou « Curiosité numérique ».

Les observations liées partagent une clé de cluster. Elles sont regroupées pour éviter de transformer un même motif en une série de cartes redondantes. L’écran principal montre au maximum trois motifs majeurs et la carte de constellation seulement cinq liens.

## Graphe numérique universel

La V2 construit des nœuds numériques pour les valeurs directes et dérivées de chaque profil, puis des arêtes pour les relations autorisées. Aucune valeur de démonstration n’est recherchée. Les index sont construits à partir des nombres réellement présents dans le jeu de données.

Chaque chemin conserve ses sources, sa profondeur de transformation et ses `dependencyGroups`. Deux résultats issus du même arbre de dérivation ne deviennent donc pas deux chemins indépendants. Les motifs profonds couvrent notamment les valeurs dérivées partagées, différences ou sommes répétées, convergences, transferts intergénérationnels, chaînes miroir et motifs multi-personnes.

`sourceDiversity` distingue les catégories date, heure, intervalle, événement et génération. Une convergence issue de plusieurs catégories est favorisée par le score d’intérêt, tandis qu’une série de variations sur une seule somme n’est pas artificiellement amplifiée.

## Estimation statistique

`interestScore` reste une priorité éditoriale interne. `rarityEstimate` est une mesure distincte : elle estime la fréquence à laquelle le même moteur complet trouve un motif de force comparable ou supérieure dans des ensembles aléatoires de même structure.

Le modèle public par défaut est `FAMILY_CONDITIONAL` : il conserve les années de naissance, les rôles, la présence ou l’absence d’heure et la structure des événements, puis randomise des jours, mois et heures calendaires valides. Le modèle `SIMPLE_CALENDAR` est disponible pour les tests méthodologiques.

La simulation rejoue exactement toutes les règles sur chaque famille synthétique. Elle corrige donc le *look-elsewhere effect* : la fréquence tient compte du fait que TAO cherche simultanément égalités, miroirs, sommes, différences, intervalles et autres motifs autorisés. Pour une date miroir entre deux années connues, une fréquence combinatoire exacte est également calculée par énumération du calendrier valide.

L’analyse rapide utilise 2 000 simulations. L’analyse approfondie en utilise 20 000. Les calculs s’exécutent dans `family-rarity-worker.js`, avec une progression, sans bloquer l’interface. Le générateur pseudo-aléatoire est seedé à partir du dataset, de la version du moteur, du modèle et du nombre de simulations. Le même jeu de données produit donc la même estimation.

Les catégories « Fréquente », « Assez courante », « Peu fréquente », « Rare dans la simulation » et « Très rare dans la simulation » sont des seuils UX documentés, pas une échelle scientifique canonique. Une fréquence faible n’est jamais transformée en probabilité de causalité, de destin ou de signification.

## IA TAO

Le mode `family_constellation` reçoit uniquement les identifiants des profils, leur prénom d’affichage, leur rôle, les observations déjà calculées et, lorsqu’elle existe, l’estimation statistique normalisée. Les dates, heures et lieux de naissance bruts ne sont pas transmis. Gemini peut expliquer et relier ces observations ; il ne peut ni chercher un nouveau nombre, ni créer une nouvelle relation.

Le prompt du Worker interdit les formulations de causalité, de preuve du destin ou de lien surnaturel. Le moteur local reste la seule source des nombres.

## Vie privée et persistance

Les événements sont stockés dans `localStorage` sous `tao.familyEvents.v1`. Les préférences de sélection et de rôle utilisent `tao.familyConstellationPreferences.v1`. Les résultats mathématiques sont recalculés localement. Les simulations sont mises en cache sous `tao.familyRarity.v2.*` avec le hash du dataset, la version des moteurs, le modèle et le nombre de simulations. La suppression d’un événement est immédiate après confirmation.

## Interface

Le module se trouve dans `Profils → Constellation familiale` et reste accessible depuis `Relations & harmonie`. Il propose une sélection de profils, les événements, les correspondances majeures, les calculs vérifiables, une carte limitée, une vue par paire et une vue par nombre. La lecture symbolique est facultative et visuellement séparée des observations mathématiques.

## Debug et tests

`?debug=family-constellation#profiles/family` expose profils minimisés, valeurs dérivées, nœuds, arêtes, groupes de dépendance, candidats, rejets, clusters, motifs profonds, densité, scores et identifiants transmis à TAO. Aucun secret n’est affiché.

Les tests couvrent sommes, réductions, inversions, palindromes, jour de l’année, âge exact, intervalles, heures, date miroir, valeurs partagées, génération, clusters, dépendances, convergences, score, déterminisme, cache et faux positifs. Des tests génératifs analysent des centaines de familles aléatoires, des familles de plus de six membres et une fixture dont le motif principal est un nombre absent des exemples historiques. Une vérification anti-surapprentissage interdit les comparaisons de production avec les nombres des fixtures.

## Limites

Le modèle conditionnel ne reproduit pas la distribution réelle des naissances humaines : saisons, jours de semaine, pratiques médicales et habitudes horaires restent des biais connus. La fréquence affichée est donc une estimation sous un modèle aléatoire, jamais une fréquence absolue dans la population.

Le module ne transforme pas les lettres, adresses, téléphones ou coordonnées en nombres. Il ne se mélange pas au BaZi. Les lectures symboliques restent séparées et n’inventent aucune signification pour une valeur non documentée.
