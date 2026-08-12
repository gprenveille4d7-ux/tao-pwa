# Décor du Pavillon

La scène canonique utilise `PAVILLON_BASE_FENETRES_TRANSPARENTES.png` comme architecture principale et `BUREAU_BASE_CARTE_CELESTE.png` comme bureau maître fixe. La variante panoramique du Pavillon reste disponible mais n’est pas chargée.

La composition modulaire validée le 12 août 2026 remplace le bureau maître historique dans la scène normale. Elle utilise `modular/BUREAU_BASE_VIDE.png` et sept composants autonomes : tapis, plante, deux lanternes, bol et deux groupes de livres. Chaque composant conserve ses propres X, Y, échelle, largeur, z-index et opacité. `BUREAU_BASE_CARTE_CELESTE.png` reste conservé comme asset historique, mais n’est plus rendu dans la composition active.

Les décalages X/Y du calibrateur sont exprimés dans le repère de référence 1080 × 720, puis convertis au rendu en unités relatives à la largeur de la scène. Le bureau, TAO et tous leurs composants grandissent ou rétrécissent donc ensemble sans dérive lorsque la fenêtre change de taille.

La scène conserve le ratio canonique 3:2 et reste entièrement visible. Elle est centrée avec des marges sombres lorsque le viewport ne partage pas son ratio. Le bureau maître conserve son ratio et reste ancré au centre (`left: 50%`, `bottom: -18%`, `width: 88%`) afin que son plateau recouvre réellement la partie basse de TAO. Son alpha natif est utilisé avec une composition CSS normale, sans filtre ni modification du PNG.

L’extérieur est une couche indépendante placée derrière le Pavillon. Les PNG conservent `object-fit: contain` et leur ratio natif. Le cadrage validé par l’utilisateur est `X 8 %`, `Y -19 %`, `scale(0.53)`. Les fenêtres donnent ainsi accès à davantage de lac, de village et de profondeur sans étirement ni modification des sources ; la structure du Pavillon masque les marges hors des ouvertures.

La baie vide située à gauche de TAO est occupée par le calque fixe `ETAGERE_FENETRE_GAUCHE.png`. L’étagère est placée entre l’extérieur et l’architecture (`z-index: 5`) : le cadre canonique du Pavillon masque donc naturellement ses marges transparentes et conserve la perspective de l’ouverture.

Le mode `?debug=outside#pavilion` donne accès à trois réglages temporaires de cadrage : déplacement horizontal, déplacement vertical et échelle (de `0.50` à `1.10`). Le bouton de réinitialisation restaure désormais le cadrage validé `8 / -19 / 0.53`. Les essais ultérieurs ne sont pas enregistrés silencieusement.

L’ordre des couches de la scène est : arrière-plan de sécurité (-10), extérieur (0), mobilier architectural fixe (5), architecture du Pavillon (10), TAO (20), bureau maître (30), objets variables (40+). Le dialogue, la navigation et les panneaux de debug utilisent les niveaux 100 et supérieurs.

Le bureau maître et les objets variables sont deux systèmes distincts. Le bureau est rendu par l’élément `.pavilion-scene__desk` et reste toujours visible. Le registre des objets variables ne gère que les enfants de `.pavilion-scene__desk-objects` ; « Tout masquer » n’affecte donc jamais le bureau maître.
