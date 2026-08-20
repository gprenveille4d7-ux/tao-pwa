# Constellation familiale

## Interface progressive V4.1 — inventaire canonique

La vue principale suit désormais l’ordre **Résumé → Inventaire → détail à la demande → Lecture de TAO**. Quatre vues secondaires conservent la profondeur du moteur : **Synthèse**, **Famille**, **Chronologie** et **Explorer**. Les calculs exacts sont ouverts dans une feuille mobile dédiée ; le lexique `family-constellation-lexicon.mjs` empêche les clés techniques telles que `dateDigitSum` d’atteindre l’utilisateur.

L’inventaire est construit avant toute présentation par `family-inventory-engine.mjs`. Il sépare trois niveaux : une **occurrence** est un fait élémentaire, un **motif** regroupe toutes les occurrences sémantiquement équivalentes, et une **interprétation** explique ce motif une seule fois. La couche sémantique, l’interface et le contexte Gemini consomment tous ce même inventaire.

Le graphe déterministe comprend désormais trois natures de nœuds : `PERSON`, `EVENT` et `PLACE`. Les arêtes `BORN_AT`, `OCCURRED_AT` et `PARTICIPATES_IN` restent factuelles. Aucun calcul numérique n’est fabriqué à partir du nom d’un lieu.

Les événements acceptent rencontre, mariage, PACS, naissance, décès, déménagement, union, séparation et événement libre. La date est obligatoire ; heure, lieu et note restent facultatifs et locaux.

Versions : `tao-family-number-3.1.0`, `tao-family-inventory-1.0.0`, `tao-family-pattern-2.0.0` et `tao-family-deep-3.1.0`.

### Identités canoniques et dépendances

Chaque motif possède un `canonicalPatternId` stable, par exemple `number:11`, `signature:c:d`, `date-mirror:09-11:11-09` ou `mirror:131:313`. Avant de créer une carte, le moteur vérifie si cet identifiant existe déjà. Une nouvelle occurrence enrichit alors le motif existant.

Chaque occurrence conserve aussi ses `dependencyGroupIds`. La somme d’une date, la somme d’une heure et leur total appartiennent à des arbres de dérivation explicites : le total reste visible dans le détail, mais ne devient pas une troisième preuve indépendante. Les anciennes observations de présence, génération ou convergence deviennent des `relatedFeatures` du motif au lieu de recréer des cartes.

Sur la fixture Guillaume, Lucile, Alice et Marcel, le pipeline brut produit de nombreuses observations intermédiaires. L’inventaire public les ramène actuellement à huit motifs distincts : trois majeurs et cinq notables. `number:11` apparaît une seule fois avec quatre occurrences et deux générations.

## Positionnement

La Constellation familiale de TAO est une cartographie factuelle, temporelle et symbolique des liens entre profils locaux. Ce n’est ni le moteur BaZi, ni une thérapie de constellations familiales, ni une preuve de causalité. TAO observe des structures vérifiables sans inventer de traumatisme, de secret familial, de destin ou de transmission surnaturelle.

La chaîne de traitement est :

`profils et événements → normalisation → valeurs dérivées → candidats → motifs familiaux → dépendances → rejet du bruit → hiérarchisation → graphe → sémantique française → conversation facultative`.

## Données et séparation des responsabilités

Les données brutes restent intactes dans les profils et événements : date, heure civile connue ou inconnue, lieu, participants et type d’événement. Les moteurs produisent séparément les données dérivées. La lecture numérologique appartient à une troisième couche facultative.

Le module réutilise `profile-store.js`, `family-constellation-store.js` et les lieux de naissance déjà résolus. Il ne crée pas une seconde base de profils.

Un événement local peut représenter une rencontre, un mariage, un PACS, une naissance, un déménagement, une union, une séparation ou un événement libre. Son heure et son lieu sont facultatifs. L’utilisateur l’ajoute volontairement.

## Signatures calculées

Pour chaque naissance : jour, mois, année, siècle, deux derniers chiffres de l’année, chiffres individuels, somme brute, réduction, jour + mois, différence jour/mois, produit exploratoire jour × mois, jour de semaine, jour ordinal, semaine ISO, trimestre et saison civile.

Lorsque l’heure est connue : heure, minutes, somme des chiffres, réduction, heure + minutes, différence heure/minutes, minutes depuis minuit et total date + heure. L’heure civile reste distincte de toute éventuelle correction solaire BaZi.

Pour les événements : âge exact en années, mois et jours, intervalles calendaires, durée totale en jours et liens avec les signatures déjà présentes.

Pour les lieux : identité stable du lieu, ville, région, pays, fuseau et coordonnées lorsqu’elles existent. TAO peut détecter un lieu partagé, mais ne convertit jamais les lettres d’une ville en nombres.

## Opérations autorisées

Niveau A, coût minimal : égalité directe, même jour ou mois, croisement jour/mois, date miroir, même lieu, même jour ordinal, symétrie ordinale, même somme directe, âge égal à une signature et intervalle réel.

Niveau B, une opération naturelle : somme, différence, double, triple et relation directe entre deux valeurs déjà présentes.

Niveau C, exploratoire : au maximum deux transformations simples et seulement lorsqu’elles renforcent un motif déjà établi indépendamment.

Sont interdites les chaînes construites pour atteindre un nombre choisi, par exemple `(année - heure) × mois ÷ jour`, ainsi que toute suite de réduction, inversion et soustraction opportuniste.

## Coût de complexité et indépendance

Chaque observation conserve `complexityCost`, `independenceGroups`, `sourceCategories`, `independentPathCount` et des identifiants de preuve. Plus une opération est longue, plus elle est dévalorisée. Une observation exigeant plus de deux transformations est rejetée.

Les dépendances sont explicites. Si deux enfants partagent une somme de date égale à 18 et une somme d’heure égale à 13, le total 31 est bien affiché, mais n’est pas compté comme une troisième confirmation indépendante puisqu’il dépend de `18 + 13`.

Une convergence entre date, heure, événement, âge, lieu ou intervalle est favorisée par rapport à plusieurs variations du même calcul.

## Graphe familial et graphe de preuves

`FamilyGraph` contient les nœuds `PERSON` et `EVENT`. Les arêtes structurelles couvrent `PARTNER`, `PARENT_CHILD`, `SIBLING`, `GRANDPARENT_DESCENDANT` et `PARTICIPATES_IN`.

`EvidenceGraph` ajoute les nœuds de motif et les arêtes `SUPPORTS`. Il permet de remonter d’une phrase affichée aux personnes, événements et preuves qui la justifient.

Le graphe numérique conserve parallèlement les valeurs dérivées et les relations `DIFFERENCE`, `SUM`, `MIRROR` et `INTERVAL` avec leurs groupes de dépendance.

## Passes d’analyse

Le moteur examine successivement le couple parental, chaque parent avec chaque enfant, la fratrie, les combinaisons parents → enfants, les générations, les événements, les intervalles, les lieux et les convergences entre motifs.

Les hyper-motifs actuellement explicités comprennent notamment :

- `CROSS_GENERATION_TRANSFER` ;
- `SIBLING_MULTI_DOMAIN_ECHO` ;
- `MULTI_EVENT_AGE_ECHO` ;
- `PARENT_PAIR_CHILD_SUM` ;
- `ORDINAL_MIRROR` ;
- `SHARED_BIRTH_PLACE` ;
- `EVENT_INTERVAL_ECHO` ;
- `CONVERGENT_NUMBER`.

## Hiérarchisation et anti-cherry-picking

Le score interne sert uniquement au tri éditorial. L’utilisateur voit `Direct`, `Fort`, `Notable`, `Secondaire` ou `Exploratoire`. Ce classement n’est jamais une probabilité.

Le moteur calcule largement puis filtre sévèrement : déduplication, regroupement des observations dépendantes, pénalité de complexité, exigence de diversité pour les convergences et sélection de quatre motifs majeurs au maximum. Une famille pauvre en structures reçoit une lecture sobre ; TAO ne force jamais un axe familial.

La simulation statistique V2 reste du code expérimental historique mais n’est plus lancée ni affichée dans l’expérience publique V3. La nouvelle règle produit ne présente aucune « probabilité de hasard ».

## Numérologie facultative

Convention `TAO_NUMEROLOGY_V1` : réduction décimale répétée, avec conservation facultative de 11, 22 et 33 dans la couche symbolique. Cette convention ne modifie jamais les valeurs arithmétiques. Une valeur sans définition documentée n’acquiert aucune personnalité inventée.

## Gemini

Le mode `family_constellation` intervient après tous les calculs. Il reçoit des profils minimisés et uniquement les motifs canoniques dédupliqués, avec leur importance, leurs occurrences minimisées, leurs particularités liées et leurs `evidenceIds`. Les dates, heures, coordonnées et lieux bruts ne sont pas transmis.

Le Worker interdit à Gemini de créer un nombre, une relation ou un événement. Il lui demande de privilégier les motifs directs, de distinguer les totaux dépendants et d’être sceptique envers les observations secondaires.

## Golden regression test

La fixture de référence est exclusivement un jeu de test. L’algorithme de production ne contient aucun nom ni nombre propre à cette famille.

Le moteur retrouve automatiquement :

1. le 11 comme jour chez les deux parents et mois chez les deux enfants ;
2. le miroir `11/09 ↔ 09/11` ;
3. la somme de date 18 chez Alice et Marcel ;
4. la somme d’heure 13 chez Alice et Marcel ;
5. le total dépendant 31, sans le compter comme troisième preuve ;
6. `22 - 9 = 13` et `22 + 9 = 31` comme renforcements de niveau B ;
7. les âges 34 et 32 des parents à la naissance d’Alice, chacun égal à sa propre somme de date ;
8. la symétrie ordinale `131 ↔ 313` ;
9. le lieu de naissance partagé à Caen ;
10. le double parental `11 + 11 = 22` lorsqu’il rejoint directement le jour d’un enfant.

Un test de sensibilité change `02:38` en `02:39` et vérifie que le motif horaire de fratrie disparaît. Des centaines de familles générées vérifient l’absence de crash, de `NaN` et de règle dépendant des valeurs de démonstration.

## Vie privée et debug

Profils, événements et préférences restent locaux. `?debug=family#profiles/family` ou `?debug=family-constellation#profiles/family` affiche données brutes minimisées, valeurs dérivées, candidats, rejets, complexité, dépendances, graphes, forces, preuves et identifiants transmis à TAO. Aucun secret n’y apparaît.

## Limites

Une structure numérique peut être exacte tout en restant une coïncidence. Le moteur mesure la simplicité et la convergence, pas la signification. Les relations familiales sont celles déclarées par l’utilisateur. Une heure inconnue n’est jamais inventée. Les distances géographiques ne sont exploitables que lorsque les coordonnées sont fiables.
