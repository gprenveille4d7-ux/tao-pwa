# Étape 7 — Pilotage narratif des postures

Le contrôleur central `tao-narrative.js` traduit un état sémantique en identifiant de posture, puis délègue l’affichage à `setTaoPose()`.

| État narratif | Posture canonique |
|---|---|
| `IDLE` | `TAO_POSE_00_NEUTRE` |
| `WELCOME` | `TAO_POSE_01_ACCUEIL` |
| `OBSERVING` | `TAO_POSE_02_OBSERVATION` |
| `THINKING` | `TAO_POSE_03_REFLEXION` |
| `EXPLAINING` | `TAO_POSE_07_EXPLICATION` |

L’onboarding utilise ce contrôleur sans modifier ses textes, son ordre, son géocodage ou son stockage. Le changement de PNG est direct et sans transition.

Le mode `?debug=poses` propose un sélecteur des cinq états. Les autres postures canoniques et les deux variantes restent testables manuellement, sans déclencheur narratif automatique.
