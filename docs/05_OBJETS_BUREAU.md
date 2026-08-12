# Étape 8 — Objets du bureau

## Statut officiel

**TECHNIQUEMENT TERMINÉE — VALIDATION VISUELLE DES ASSETS EN COURS**

Le système réutilise le prototype existant : un manifeste central, un contrôleur, un conteneur de scène et un panneau de debug. Il reste exclusivement manuel et ne possède aucune sélection aléatoire ou automatique.

## Inventaire

- un bureau maître permanent : `BUREAU_BASE_CARTE_CELESTE.png` ;
- un PNG individuel d’origine : `OBJET_CELESTE_ASTROLABE.png` ;
- six planches multi-objets documentaires ;
- 17 extractions dans `runtime/` ;
- 11 objets runtime utilisables au total : dix extractions et le PNG individuel d’origine ;
- sept extractions rejetées, conservées sans modification.

## Classement des 17 extractions

### A — utilisables telles quelles

- `OBJET_CRISTAL_LUNAIRE.png`
- `OBJET_FOSSILES_MYSTIQUES.png`
- `OBJET_LIVRE_CELESTE_FERME.png`
- `OBJET_MEDAILLON_PLEINE_LUNE.png`
- `OBJET_PIERRES_MYSTIQUES.png`
- `OBJET_PLUME_CELESTE.png`
- `OBJET_SPHERE_EQUILIBRE_CELESTE.png`
- `OBJET_TASSE_CELESTE.png`
- `OBJET_YI_JING_PIECES.png`

### B — utilisables mais à valider visuellement

- `OBJET_CARTE_CELESTE_PARCHEMIN.png` : le rouleau rejoint le bord droit du canevas.

Cet asset demeure disponible dans la bibliothèque générale, mais le calibrateur modulaire utilise désormais `pavilion/desk/modular/OBJET_BUREAU_TAPIS_CELESTE.png`, conçu comme composant distinct du nouveau `BUREAU_BASE_VIDE.png`.

## Bureau modulaire canonique

Le registre `pavilion/desk/modular/modular-desk-manifest.json` décrit un bureau vide et sept composants transparents indépendants. La composition et les positions communiquées par l’utilisateur ont été officialisées le 12 août 2026 : elles sont désormais rendues dans la scène normale. Le mode `?calibration=1` reste disponible pour de futurs ajustements temporaires sans remplacer silencieusement les valeurs canoniques.

Le PNG individuel d’origine `OBJET_CELESTE_ASTROLABE.png` est également classé B : son objet est propre, mais son grand canevas transparent et son positionnement final demandent une validation utilisateur.

### C — non utilisables, extraction à refaire

- `OBJET_ASTROLABE_VARIANTE_ETOILE.png` : éléments coupés à gauche et à droite ;
- `OBJET_ASTROLABE_VARIANTE_LUNAIRE.png` : éléments coupés à gauche et à droite ;
- `OBJET_LIVRE_CELESTE_OUVERT.png` : fragments d’ombre parasites en haut ;
- `OBJET_LIVRES_CELESTES_EMPILES.png` : fragment d’ombre parasite en haut ;
- `OBJET_MEDAILLON_CROISSANT.png` : fragment d’un voisin sous l’objet ;
- `OBJET_MEDAILLON_SOLAIRE.png` : cordon et anneau tronqués en haut ;
- `OBJET_PARCHEMIN_CELESTE_ROULE.png` : fragments d’ombre parasites en haut.

### D — doublons ou variantes à statuer

Aucun doublon binaire ou objet de classe D détecté.

## Runtime

`desk-objects-manifest.json` est la source de vérité. Seules les entrées ayant `runtimeReady: true` sont créées dans `[data-desk-objects]` et proposées dans le panneau `?debug=scene`.

L’API publique est `window.taoDeskObjects` :

- `setVisible(id, visible)` ;
- `setDeskObjectVisible(id, visible)` ;
- `setAllVisible(visible)` ;
- `getState()` ;
- `hasObject(id)` ;
- `objects`.

Les PNG restent masqués et sans `src` tant qu’ils ne sont pas demandés. Un échec de chargement laisse l’objet masqué, journalise l’erreur et ne touche ni au bureau maître ni au reste de la scène.

## Couches et coordonnées

Ordre de scène : extérieur 0, Pavillon 10, TAO 20, bureau maître 30, conteneur des objets 40, dialogue et interface au-dessus. Les objets conservent leurs layers 40 à 57 dans leur propre contexte de superposition.

Leurs positions sont exprimées en pourcentages de la scène canonique 3:2. Elles ne dépendent pas du viewport, ce qui préserve leur ancrage pendant le redimensionnement.

## Règles conservées

- Le bureau maître n’est jamais un objet variable et « Tout masquer » ne peut pas le masquer.
- Aucun PNG n’a été retouché, recadré, recoloré ou régénéré.
- Les planches sources ne sont jamais chargées par le runtime.
- Aucun objet n’est lié à TAO, au texte, à un profil, à la navigation, à l’extérieur, à la météo, à une saison, au Yi Jing ou à l’astrologie.
- L’usage futur normal vise environ zéro à trois objets simultanés ; le panneau de test peut afficher les 11 objets utilisables.
- Les collisions éventuelles avec les mains ou le corps de TAO doivent être résolues dans une phase ultérieure, sans modifier les postures ici.
