# TAO — Audit et correction complète de la navigation

Date : 25 août 2026  
Périmètre : P0 à P4, navigation, historique, interactions, accessibilité et finition mobile.

## Carte cible livrée

```text
TAO
├── Aujourd’hui
│   ├── L’essentiel
│   ├── Mon rythme
│   ├── Ma saison
│   └── Ciel & environnement
├── Mon thème
│   ├── Essentiel — énergie fondamentale et archétype
│   ├── Composition — 4 Piliers et Cinq Mouvements (Wu Xing)
│   ├── Relations internes — influences et Dix Dieux
│   └── Parcours — grandes périodes et Da Yun
├── Pavillon
│   └── TAO — scène, conversation et raccourcis du Nebula
├── Yi Jing
│   ├── Consulter
│   ├── Mes tirages
│   └── Apprendre
└── Profils
    ├── Mon profil
    ├── Mes proches
    ├── Relations & harmonie
    └── Constellation familiale
```

## Inventaire final des problèmes

| Priorité | Élément | Problème initial | Correction livrée | État |
|---|---|---|---|---|
| P0 | Constellation · inventaire | Pseudo-route inconnue renvoyant au Pavillon | Navigation locale vers la vue Explorer et l’inventaire complet | Corrigé |
| P0 | Sheets | Restent au-dessus d’une nouvelle destination ou après retour | Registre commun et fermeture sur hashchange, changement de vue et ouverture d’une autre sheet | Corrigé |
| P1 | Saison | Accès important dépendant du carrousel | Sous-route canonique et entrée directe « Ma saison » dans Aujourd’hui | Corrigé |
| P1 | Cinq Mouvements | Contenu peu découvrable | Page Composition directe, titre humain puis terme Wu Xing | Corrigé |
| P1 | Dix Dieux | Contenu enfoui sous un disclosure | Page Relations internes directe, fonctions humaines affichées avant le terme traditionnel | Corrigé |
| P1 | Conversation TAO | Route remplacée par le Pavillon | Conservation de la route d’origine ; fermeture sur changement de contexte | Corrigé |
| P1 | Routes historiques | Alias et pseudo-routes conservés dans l’URL | Table d’alias et canonicalisation par replaceState | Corrigé |
| P1 | Routes invalides | Repli silencieux vers le Pavillon | Repli vers la racine logique avec message explicite | Corrigé |
| P1 | Onboarding | Aucun retour | Retour à chaque étape, brouillon préservé | Corrigé |
| P2 | Yi Jing · historique | Un tirage ouvert pouvait rester masqué dans l’onglet Historique | Ouverture canonique dans Yi Jing → Consulter ; retour navigateur cohérent | Corrigé |
| P2 | Éditeur de profil | Panneau inline et retour incohérent | Sheet commune, focus et fermeture centralisés | Corrigé |
| P2 | Accès majeurs | Parcours longs ou dépendants de raccourcis | Accès en deux actions maximum depuis le bon onglet | Corrigé |
| P3 | Liens flottants | CTA et cibles tactiles hétérogènes | Cellule TaoNavigationRow réutilisable et cellule entière tactile | Corrigé |
| P3 | Retour | Retour de Saison vers un ancien alias | TaoBackLink vers Aujourd’hui avec parent explicite | Corrigé |
| P3 | Pavillon · Saison | Deux CTA identiques | Une cellule unique, descriptive et prévisible | Corrigé |
| P3 | Profils | Icônes et rubriques peu lisibles | Quatre cellules illustrées stables, libellés humains | Corrigé |
| P4 | Carrousels | Débordement de quelques pixels sur iPhone | Largeur bornée à 100 %, marges négatives supprimées | Corrigé |
| P4 | Points de carrousel | Cibles d’environ 7 px | Cibles réelles de 44 × 44 px, indicateur visuel conservé | Corrigé |
| P4 | Dialogue | Contrôles de 34 px | Contrôles de 44 × 44 px | Corrigé |
| P4 | Feedback | Réponse tactile hétérogène | État pressé commun 140–180 ms et mouvement réduit respecté | Corrigé |

## Routes canoniques

- `#today`, `#today/understand`, `#today/rhythm`, `#today/season`, `#today/environment`
- `#theme`, `#theme/essential`, `#theme/composition`, `#theme/structure`, `#theme/journey`
- `#pavilion`, `#pavilion/tao`
- `#yijing`, `#yijing/consult`, `#yijing/history`, `#yijing/learn`
- `#profiles`, `#profiles/me`, `#profiles/people`, `#profiles/compatibility`, `#profiles/family`

Les anciens liens restent compatibles et sont remplacés dans l’URL par leur route canonique. Les raccourcis historiques du Pavillon ouvrent leur destination réelle.

## Vérifications

- 197 tests automatisés réussis, 0 échec (189 tests préexistants + 8 nouveaux).
- Parcours onboarding avec retour et conservation du lieu saisi.
- Route profonde et refresh vérifiés.
- Alias `#theme/ten-gods` migré vers `#theme/structure`.
- Route invalide `#profiles/inconnue` corrigée vers `#profiles` avec feedback explicite.
- Sheet fermée lors du retour navigateur et du changement de contexte.
- Conversation TAO ouverte et fermée sans quitter `#today`.
- Largeurs 320, 375, 390 et 430 px : aucun débordement horizontal.
- Retour Saison : cible de 44 px et Tab Bar présente.
- Profils : quatre cellules de 62 px de hauteur aux quatre largeurs.
- PWA : manifeste, scope GitHub Pages, routes hash et précache couverts par les tests.

## Hors périmètre volontaire

Aucune fonctionnalité métier, aucun calcul BaZi/Yi Jing, aucune donnée de profil et aucun contenu éditorial de fond n’a été supprimé. L’audit n’a pas transformé l’identité graphique nocturne et dorée de TAO.
