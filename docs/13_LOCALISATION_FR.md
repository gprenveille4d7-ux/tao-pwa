# Localisation française de TAO

Version terminologique : `tao-localization-fr-1.2.0`.

La couche de traduction est désormais complétée par `tao-semantics-fr-1.0.0`. Elle place le sens humain avant l’explication et réserve la terminologie traditionnelle au troisième niveau. Voir `docs/17_COUCHE_SEMANTIQUE_FR.md`.

## Architecture

La présentation française vit dans `locales/fr/`, séparée des moteurs de calcul. `locales/index.js` expose le résolveur `getTranslation(locale, key)`, le raccourci français `t(key)`, les concepts structurés, les formats et les fallbacks. Les moteurs conservent leurs identifiants stables (`wood`, `jia`, `direct_wealth`, `li_chun`) et les vues résolvent ces identifiants avant affichage.

Les domaines sont répartis entre :

- `common.js` : application, navigation, actions et accessibilité ;
- `bazi.js` : concepts BaZi et terminologie traditionnelle ;
- `calendar.js` : 24 termes solaires, calendrier, directions et activités ;
- `guidance.js` : lecture quotidienne et paroles de TAO ;
- `profiles.js` : profils et première rencontre ;
- `yijing.js` : vocabulaire Yi Jing actuellement visible ;
- `glossary.js` : définitions transversales.

Une langue ultérieure s’ajoute comme un catalogue frère de `fr`, puis dans la table `locales`. Aucun identifiant moteur ne doit être traduit ou renommé.

## Conventions terminologiques françaises

- animaux : **Buffle** et **Chèvre** sont les formes canoniques de TAO ;
- `Day Master` : **Maître du Jour** ;
- `Hidden Stems` : **Troncs cachés** ;
- `Solar Terms` : **Termes solaires · Jie Qi 節氣** ;
- `Luck Pillars` : **Grands cycles · Da Yun 大運** ;
- `Shen Sha` : **Étoiles symboliques · Shen Sha 神煞** ;
- `Na Yin` reste **Na Yin · 納音** et reçoit une explication française ;
- `Yong Shen` devient **Énergie utile · Yong Shen 用神** uniquement lorsque ce concept est réellement calculé.

Les traductions des Dix Dieux varient selon les écoles. TAO retient des appellations principales compréhensibles et conserve le pinyin, les Hanzi et une appellation alternative. Cette convention n’est pas présentée comme universelle.

## Trois niveaux de lecture

Le premier niveau présente un archétype ou une fonction humaine, par exemple **Le Grand Arbre**. Le deuxième explique la règle utile en français. Le troisième conserve **Jia · 甲 — Bois Yang** et les données traditionnelles. Les vues utilisent des blocs repliables **Comprendre**, **Pourquoi TAO me dit ça ?** ou **Lecture traditionnelle**.

## Fallbacks et contrôle DEV

Une clé absente déclenche sur `localhost`, `127.0.0.1` ou en mode debug :

`[TAO i18n] Missing translation: fr.bazi.tenGods.direct_wealth`

L’interface reçoit toujours un fallback français contrôlé (`Information traditionnelle`) ; elle n’affiche jamais la clé brute, `undefined` ou `null`. En production, le warning est silencieux.

## Périmètre réel actuel

Les moteurs exposent actuellement les piliers, Troncs, Branches, Cinq Éléments, polarités, équilibre natal, terme solaire et guidance quotidienne. Les Dix Dieux, les Troncs cachés des douze Branches, les trente appellations Na Yin, neuf Shen Sha usuels, Da Yun, douze phases de vie, directions et activités disposent déjà d’une terminologie contrôlée, mais ne sont pas calculés par la version métier actuelle. Les catalogues Shen Sha varient selon les écoles : toute étoile supplémentaire devra être documentée avant affichage. Les fallbacks empêchent qu’une future donnée brute atteigne l’interface.

Les 24 termes solaires sont documentés comme repères du calendrier solaire traditionnel. Leur rôle astronomique et calendaire a été vérifié à partir de l’Observatoire de Hong Kong et de la fiche du patrimoine culturel immatériel de l’UNESCO.

Références : [Hong Kong Observatory — The 24 Solar Terms](https://www.hko.gov.hk/en/gts/time/24solarterms.htm) et [UNESCO — The Twenty-Four Solar Terms](https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-observation-of-the-suns-annual-motion-00647).

## Qualité

`tests/localization-fr.test.mjs` vérifie la version, les valeurs vides, les doublons d’identifiants, les couvertures cardinales, les fallbacks, les formats français et l’absence des principaux labels BaZi anglais dans les vues. Les règles mobiles réservent l’espace nécessaire aux intitulés français à 390 px et interdisent le débordement horizontal des cartes et du glossaire.
