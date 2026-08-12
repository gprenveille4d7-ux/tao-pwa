# Étape 10 — Moteur natal BaZi

## Périmètre et version

Le moteur `bazi-engine.mjs` calcule un thème natal BaZi local, déterministe et indépendant de l’interface. Sa version est `tao-bazi-1.0.0`. Il ne produit ni horoscope quotidien, ni prédiction, ni Da Yun, ni compatibilité, ni calcul Yi Jing et ne fait appel à aucune API ou intelligence artificielle.

## Entrée

`calculateBazi(profile)` reçoit le profil actif créé par l’Étape 5. Les champs employés sont :

- `id` ;
- `birthDate` au format `YYYY-MM-DD` ;
- `birthTimeKnown` et `birthTime` au format `HH:mm` ou `null` ;
- `birthPlace.timezone`, identifiant IANA obligatoire ;
- `birthPlace.latitude` et `birthPlace.longitude`, conservés dans les métadonnées ;
- les informations d’affichage du profil restent lues par l’interface, sans être modifiées par le moteur.

## Sortie

Le résultat contient `profileId`, `calculationVersion`, les piliers `year`, `month`, `day` et `hour`, le `dayMaster`, la distribution `elements`, la synthèse `yinYang`, les `components` comptées, une `reading` locale déterministe, les `warnings` et les `metadata` de naissance et de convention. Un pilier non calculable porte explicitement `determined: false` et ne contient aucun signe inventé.

## Conventions calendaires V1

- Année : bascule à l’instant de **Li Chun**, longitude solaire 315°, et non au 1er janvier.
- Mois : bascules aux douze **Jie** : Li Chun, Jing Zhe, Qing Ming, Li Xia, Mang Zhong, Xiao Shu, Li Qiu, Bai Lu, Han Lu, Li Dong, Da Xue et Xiao Han.
- Jour : cycle sexagésimal du calendrier grégorien, avec changement à minuit civil au lieu de naissance. Le 7 janvier 2000 est l’ancre de contrôle Jia Zi.
- Heure : heure civile locale, répartie en douze périodes de deux heures. Zi couvre 23:00–00:59, mais la convention du jour reste le changement à 00:00.
- Temps solaire : aucune correction au temps solaire vrai n’est appliquée en V1.

Les instants des termes solaires sont résolus à partir d’une longitude solaire approchée autour de chaque date attendue, puis recherchés par dichotomie. Cette méthode convient à la V1 applicative et reste explicitement bornée à 1800–2200 ; elle ne constitue pas une éphéméride astronomique certifiée.

## Méthode des quatre piliers

### Année

L’instant local de naissance est converti en UTC uniquement pour le comparer à Li Chun. Avant Li Chun, l’année BaZi est l’année civile précédente. L’index sexagésimal est ensuite dérivé de cette année BaZi.

### Mois

Le moteur repère le dernier Jie franchi depuis Li Chun. La branche commence à Yin pour le premier mois solaire. Le tronc du premier mois est dérivé du tronc annuel, puis avancé avec l’index du mois.

### Jour

Le numéro de jour julien grégorien alimente directement le cycle de 60 jours. La formule et l’ancre sont centralisées dans le moteur et donnent un résultat reproductible.

### Heure

La branche est issue de la période civile de deux heures. Le tronc est calculé à partir du tronc du jour et de la branche horaire. Sans heure connue, le pilier reste `NON DÉTERMINÉ`.

## Fuseau horaire et heure d’été

La saisie représente l’heure locale du lieu de naissance. `Intl.DateTimeFormat` et l’identifiant IANA enregistré reconstruisent l’instant UTC en tenant compte de l’historique disponible dans le moteur JavaScript, sans règle nationale codée en dur. Une heure locale inexistante lors d’un saut DST est refusée. Lors d’une heure répétée, la première occurrence est retenue et un avertissement est produit.

## Heure inconnue

Le moteur ne substitue jamais une heure fictive. Le jour est calculé et l’heure reste indéterminée. L’année et le mois sont calculés seulement s’ils restent identiques du début à la fin de la date civile locale. Si un Jie, notamment Li Chun, tombe ce jour-là, les piliers concernés restent indéterminés et l’interface explique l’ambiguïté.

## Source unique des Troncs

| Index | Tronc | Élément | Polarité |
|---:|---|---|---|
| 0 | Jia | Bois | Yang |
| 1 | Yi | Bois | Yin |
| 2 | Bing | Feu | Yang |
| 3 | Ding | Feu | Yin |
| 4 | Wu | Terre | Yang |
| 5 | Ji | Terre | Yin |
| 6 | Geng | Métal | Yang |
| 7 | Xin | Métal | Yin |
| 8 | Ren | Eau | Yang |
| 9 | Gui | Eau | Yin |

## Source unique des Branches

| Index | Branche | Élément principal | Polarité | Animal |
|---:|---|---|---|---|
| 0 | Zi | Eau | Yang | Rat |
| 1 | Chou | Terre | Yin | Bœuf |
| 2 | Yin | Bois | Yang | Tigre |
| 3 | Mao | Bois | Yin | Lapin |
| 4 | Chen | Terre | Yang | Dragon |
| 5 | Si | Feu | Yin | Serpent |
| 6 | Wu | Feu | Yang | Cheval |
| 7 | Wei | Terre | Yin | Chèvre |
| 8 | Shen | Métal | Yang | Singe |
| 9 | You | Métal | Yin | Coq |
| 10 | Xu | Terre | Yang | Chien |
| 11 | Hai | Eau | Yin | Cochon |

## Cinq Éléments et Yin/Yang

La première distribution attribue un poids égal au tronc et à l’élément principal de la branche de chaque pilier visible : huit composantes avec l’heure, six sans elle. Les mêmes composantes alimentent le comptage Yin/Yang. Les ratios sont des repères de structure lisibles, pas une mesure scientifique, médicale ou psychologique. Les troncs cachés, forces saisonnières et pondérations avancées sont hors périmètre de cette V1.

## Maître du Jour et lecture locale

Le Maître du Jour est exactement le tronc du pilier du Jour. La première lecture est assemblée localement à partir du Maître du Jour, des éléments les plus et les moins représentés et de la dominante Yin/Yang. Elle est déterministe, prudente et non prédictive.

## Profil actif, cache et séparation des données

`bazi-theme.js` appelle `getActiveProfile()` : aucun second système de profils n’est créé. `bazi-cache.mjs` stocke séparément le résultat sous `tao.bazi.v1.<profileId>`. Son empreinte comprend la version du moteur, l’identifiant du profil, date, heure, état de connaissance de l’heure, ville, pays, coordonnées et fuseau. Toute modification invalide le résultat. Les données originales du profil ne sont jamais écrasées.

## Limites connues

- plage de calcul : 1800–2200 ;
- précision des termes solaires issue d’une formule solaire approchée, suffisante pour la V1 mais non certifiée pour des usages d’éphéméride ;
- exactitude historique des fuseaux dépendante des données IANA fournies par l’environnement JavaScript ;
- première distribution limitée aux huit ou six composantes visibles, sans troncs cachés ni pondération saisonnière ;
- convention unique du jour à minuit civil et absence assumée de correction au temps solaire vrai ; d’autres écoles peuvent retenir des conventions différentes près de certaines frontières.

## Tests de référence

`node --test tests/bazi-engine.test.mjs` couvre les profils avec et sans heure, l’indépendance entre profils, l’invalidation du cache, l’ancre Jia Zi, Li Chun, Jing Zhe, le changement de jour, l’année bissextile, les limites des heures doubles et un saut DST IANA. L’interface a été contrôlée à 390 px, 768 px et 1440 px, sans défilement horizontal et avec la navigation principale fonctionnelle.
