# Postures de TAO

La bibliothèque contient 15 PNG : 13 postures canoniques numérotées de 00 à 12 et deux variantes sans numéro canonique.

## Référence spatiale

Toutes les postures utilisent le même conteneur 3:2, le même centrage, le même ancrage et le même système responsive. `tao-character.js` remplace directement la source du même élément `<img>` via `setTaoPose()`. Aucun fondu, morphing, déplacement propre à une posture ni transition n’est utilisé.

## Bibliothèque canonique

| Identifiant | Rôle descriptif |
|---|---|
| `TAO_POSE_00_NEUTRE` | `idle` |
| `TAO_POSE_01_ACCUEIL` | `welcome` |
| `TAO_POSE_02_OBSERVATION` | `observation` |
| `TAO_POSE_03_REFLEXION` | `reflection` |
| `TAO_POSE_04_CARTE_CELESTE` | `celestial_map` |
| `TAO_POSE_05_YI_JING` | `yi_jing` |
| `TAO_POSE_06_LECTURE` | `reading` |
| `TAO_POSE_07_EXPLICATION` | `explanation` |
| `TAO_POSE_08_CONTEMPLATION` | `contemplation` |
| `TAO_POSE_09_EVENEMENT_RARE` | `rare_event` |
| `TAO_POSE_10_CLIN_OEIL` | `wink` |
| `TAO_POSE_11_REVEUSE` | `dreaming` |
| `TAO_POSE_12_REGARDE_DEHORS` | `looking_outside` |

`CONTEMPLATION`, `REVEUSE` et `REGARDE_DEHORS` restent trois postures distinctes.

## Variantes

- `TAO_POSE_ALT_01_INTERROGATION`
- `TAO_POSE_ALT_02_CONCENTRATION`

Le mode `?debug=poses` présente les 13 postures sous « POSTURES CANONIQUES » et les deux ALT sous « VARIANTES ».

## Pilotage narratif

`tao-narrative.js` est l’unique correspondance entre les états narratifs et les postures. Il réutilise `setTaoPose()` et ne duplique aucun chemin PNG.

Les seules correspondances automatiques sont : `IDLE → 00`, `WELCOME → 01`, `OBSERVING → 02`, `THINKING → 03` et `EXPLAINING → 07`. Les autres postures et les variantes restent uniquement disponibles manuellement.
