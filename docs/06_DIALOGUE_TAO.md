# Zone de dialogue de TAO

La Phase 4 ajoute uniquement la présence visuelle de la parole de TAO. Le composant est une section sémantique unique placée dans `pavilion-stage`, immédiatement après la scène du Pavillon.

## Placement

- En smartphone portrait et tablette, la zone suit la scène dans le flux, avec un faible espacement afin de conserver la relation visuelle entre TAO et sa parole.
- En desktop et dans les formats larges, elle est superposée dans la partie basse du Pavillon, au-dessus du décor, avec une largeur maximale de 44 rem.
- Le conteneur de TAO, le bureau et les couches du Pavillon conservent leurs coordonnées et leurs dimensions canoniques.

## Typographie et dimensions

Le nom TAO utilise une petite serif dorée. Le corps emploie la police système, entre 0,96 et 1,08 rem, avec une hauteur de ligne comprise entre 1,52 et 1,58. La largeur est presque complète sur smartphone et limitée à 42–44 rem sur les écrans plus larges.

La zone s’adapte naturellement aux textes courts. Le contenu possède une hauteur maximale responsive comprise entre 4,8 et 8,5 rem. Au-delà, seul le texte défile avec une barre discrète, `overscroll-behavior: contain` et le support du tactile, de la molette, du trackpad et du clavier.

## Composant et tests

`tao-dialogue.js` expose un composant minimal qui reçoit une chaîne, la sépare en paragraphes et l’insère exclusivement avec `textContent`. Aucun HTML fourni n’est interprété.

La page normale affiche le texte court « Je t’écoute. ». Avec `?debug=poses`, le panneau de développement permet de sélectionner manuellement les textes court, moyen et long, indépendamment du sélecteur de posture. Aucun texte ne déclenche de posture et aucune donnée n’est générée.
