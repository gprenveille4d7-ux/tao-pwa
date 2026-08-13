# TAO — Feuille de route canonique

Cette feuille de route décrit l’état réellement présent dans la version consolidée. Une étape n’est déclarée validée qu’après implémentation et validation explicite.

- ÉTAPE 0 — Organisation / architecture / manifests — **FAITE**
- ÉTAPE 1 — Pavillon statique — **FAITE**
- ÉTAPE 2 — TAO posture neutre — **FAITE**
- ÉTAPE 3 — Bibliothèque des postures — **FAITE — 13 CANONIQUES + 2 VARIANTES**
- ÉTAPE 4 — Zone de dialogue — **FAITE**
- ÉTAPE 5 — Première rencontre / création du profil — **FAITE**
- ÉTAPE 6 — Navigation principale / menus — **FAITE**
- ÉTAPE 7 — Pilotage narratif des postures — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
- ÉTAPE 8 — Bureau modulaire — **TECHNIQUEMENT TERMINÉE — VALIDATION VISUELLE DES ASSETS EN COURS**
- ÉTAPE 9 — Ciel / extérieur — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
- ÉTAPE 10 — Mon thème taoïste / moteur natal BaZi — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
- EXPÉRIENCE ASTROLOGIE TAOÏSTE V1 — Aujourd’hui + Mon Thème + Profils — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**

## Prototypes conservés sans validation

- Le contrôleur `desk-objects.js` pilote manuellement 11 objets runtime utilisables : dix extractions auditées et un PNG individuel d’origine. Sept extractions de classe C restent conservées mais sont exclues du sélecteur ; les planches multi-objets restent documentaires.
- Le contrôleur `exterior-states.js` conserve ses 19 états manuels et fournit désormais deux calques synchronisés au moteur `tao-environment-1.0.0`. L’automatisation utilise la localisation du profil, les heures solaires locales, Open-Meteo et un cache hors ligne ; les phases lunaires et événements rares restent exclus.
- Le moteur `bazi-engine.mjs` calcule localement le thème du profil actif. `MON THÈME` affiche les quatre piliers, le Maître du Jour, la distribution simple des Cinq Éléments, l’équilibre Yin/Yang et une première lecture déterministe. La convention et les limites sont consignées dans `docs/11_BAZI_ENGINE.md`.

## Phases lunaires

**REPORTÉES** — la planche source est conservée sans découpage ni intégration runtime.

La V1 produit désormais une guidance quotidienne déterministe et approfondie, une présentation éditoriale du thème natal et une gestion locale multi-profils. Le module Yi Jing local ajoute la méthode des trois pièces, les 64 hexagrammes, les mutations, la guidance et le carnet. La compatibilité avancée, les Da Yun, les phases lunaires et l’IA restent hors périmètre.

La couche `tao-semantics-fr-1.0.0` transforme ces résultats en trois profondeurs : sens humain, explication traçable et terminologie traditionnelle. Les identifiants et calculs des moteurs restent inchangés.
