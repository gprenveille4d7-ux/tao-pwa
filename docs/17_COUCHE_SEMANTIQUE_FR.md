# Couche sémantique française

Version : `tao-semantics-fr-1.0.0`  
Localisation : `tao-localization-fr-1.2.0`

## Principe

Le moteur calcule avec ses identifiants stables. `semantic-layer.mjs` transforme ensuite les faits disponibles en trois profondeurs :

1. sens humain immédiatement compréhensible ;
2. explication de la règle et de son contexte ;
3. terme technique et appellation traditionnelle.

Les moteurs BaZi, quotidien et Yi Jing ne sont pas modifiés. La couche ne crée aucun fait astrologique. Une observation quotidienne référence ses `sourceFacts`, ses `interpretationRules` et un niveau de confiance symbolique. Le mode local `?debug=semantics` rend cette trace visible dans « Pourquoi TAO me dit ça ? ».

## Lexique canonique

`locales/fr/semantics.js` centralise :

- les dix archétypes des Troncs célestes ;
- les cinq mouvements humains des éléments ;
- les cinq familles des relations traditionnellement nommées Dix Dieux ;
- les dix nuances de ces relations ;
- les interactions entre Branches avec une formulation non alarmiste ;
- les quatre facettes correspondant aux Quatre Piliers.

Chaque entrée distingue au minimum `humanTitle` ou `humanLabel`, `humanDescription`, `technicalFrench` et `traditionalLabel`. Les termes anglais sont conservés uniquement comme références documentaires dans le troisième niveau.

## Hiérarchie des vues

- **Aujourd’hui** : conseil et points d’attention, puis « Pourquoi TAO me dit ça ? », puis données traditionnelles.
- **Mon thème** : archétype humain, portrait et mouvements, puis Quatre Piliers et données techniques repliées.
- **Grandes dynamiques** : familles humaines avant les appellations traditionnelles des Dix Dieux.
- **Yi Jing** : guidance avant le diagramme, les traits et les hexagrammes traditionnels.
- **Profils** : archétype de l’énergie fondamentale, jamais simple pinyin ou identifiant technique.

## Fallback

Une notion absente affiche « Une dynamique à observer » et une explication neutre. En développement, un avertissement indique la clé manquante. Une clé brute, `undefined` ou `translation_missing` ne doit jamais atteindre l’utilisateur.

## Prudence éditoriale

Les textes emploient « dans la lecture BaZi », « la tradition associe » et « peut ». Les interprétations ne sont ni scientifiques, ni prédictives, ni déterministes. Les variations d’école sont signalées lorsque la structure complète du thème est nécessaire.
