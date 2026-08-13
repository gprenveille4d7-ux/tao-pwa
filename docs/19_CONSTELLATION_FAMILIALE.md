# Constellation familiale

Version du moteur : `tao-family-number-1.0.0`

## Principe

Le module observe des correspondances calculées à partir des dates, heures, âges et événements familiaux. Il sépare strictement le calcul local, la sélection des motifs, la formulation française et l’approfondissement facultatif avec TAO. Une correspondance n’est jamais présentée comme une preuve de causalité, de destin ou d’influence surnaturelle.

## Données utilisées

- deux à six profils locaux ;
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

## IA TAO

Le mode `family_constellation` reçoit uniquement les identifiants des profils, leur prénom d’affichage, leur rôle et les observations déjà calculées. Les dates, heures et lieux de naissance bruts ne sont pas transmis. Gemini peut expliquer et relier ces observations ; il ne peut ni chercher un nouveau nombre, ni créer une nouvelle relation.

Le prompt du Worker interdit les formulations de causalité, de preuve du destin ou de lien surnaturel. Le moteur local reste la seule source des nombres.

## Vie privée et persistance

Les événements sont stockés dans `localStorage` sous `tao.familyEvents.v1`. Les préférences de sélection et de rôle utilisent `tao.familyConstellationPreferences.v1`. Les analyses ne sont pas persistées : elles sont rapides et recalculées à partir des données locales. La suppression d’un événement est immédiate après confirmation.

## Interface

Le module se trouve dans `Profils → Constellation familiale` et reste accessible depuis `Relations & harmonie`. Il propose une sélection de profils, les événements, les correspondances majeures, les calculs vérifiables, une carte limitée, une vue par paire et une vue par nombre. La lecture symbolique est facultative et visuellement séparée des observations mathématiques.

## Debug et tests

`?debug=family-constellation#profiles/family` expose profils minimisés, valeurs dérivées, candidats, rejets, clusters, scores et identifiants transmis à TAO. Aucun secret n’est affiché.

Les tests couvrent sommes, réductions, inversions, palindromes, jour de l’année, âge exact, intervalles, heures, date miroir, valeurs partagées, somme, différence, génération, clusters, score, déterminisme, persistance et faux positifs. Le fixture de référence couvre notamment `11/09 ↔ 09/11`, le passage du 11 entre générations, le trio `18–13–31`, l’écart horaire de 18 minutes et les jours de l’année 131/313.

## Limites

Cette première version ne transforme pas les lettres, adresses, téléphones ou coordonnées en nombres. Elle ne mélange pas le module avec le BaZi. Les lectures symboliques ne documentent que quelques nombres usuels et n’inventent aucune signification pour les autres valeurs.
