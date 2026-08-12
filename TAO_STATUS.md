# TAO — État réel de la version consolidée

ÉTAPE 0 — **FAITE**  
ÉTAPE 1 — **FAITE**  
ÉTAPE 2 — **FAITE**  
ÉTAPE 3 — **FAITE — 13 POSTURES CANONIQUES + 2 VARIANTES**  
ÉTAPE 4 — **FAITE**  
ÉTAPE 5 — **FAITE**  
ÉTAPE 6 — **FAITE**  
ÉTAPE 7 — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**  
ÉTAPE 8 — **TECHNIQUEMENT TERMINÉE — VALIDATION VISUELLE DES ASSETS EN COURS**  
ÉTAPE 9 — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**  
ÉTAPE 10 — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**  
EXPÉRIENCE ASTROLOGIE TAOÏSTE V1 — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**  
LOCALISATION FRANÇAISE `tao-localization-fr-1.1.0` — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
MODULE YI JING LOCAL `tao-yijing-engine-1.0.0` — **TECHNIQUEMENT TERMINÉ — VALIDATION UTILISATEUR ATTENDUE**
PHASES LUNAIRES — **REPORTÉES**

## Contrôles consolidés

- Le contrôleur narratif central couvre uniquement `IDLE`, `WELCOME`, `OBSERVING`, `THINKING` et `EXPLAINING`.
- L’extérieur conserve `object-fit: contain` et `object-position: center`.
- Le bureau modulaire validé utilise un bureau vide et sept composants autonomes ; l’ancien bureau fusionné reste conservé comme asset historique.
- 19 PNG extérieurs autonomes sont présents et enregistrés dans `sky-manifest.json`.
- Le thème natal BaZi du profil actif est calculé localement selon la convention `tao-bazi-1.0.0` ; les résultats calculés sont séparés des données du profil et mis en cache par profil.
- La lecture quotidienne locale `tao-daily-1.1.0` calcule les piliers annuel, mensuel et journalier, le terme solaire courant, une résonance documentée avec le thème natal et des tendances par domaine sans score numérique arbitraire.
- Les pages `AUJOURD’HUI`, `MON THÈME` et `PROFILS` sont de véritables espaces verticaux responsive. Plusieurs profils locaux peuvent être enregistrés et le profil actif peut changer.
- Les données visibles passent par la couche française centralisée `locales/` ; les identifiants techniques des moteurs restent inchangés. Le glossaire, les fallbacks et les contrôles DEV sont documentés dans `docs/13_LOCALISATION_FR.md`.
- Le Pavillon affiche désormais quatre paroles contextualisées par la journée (énergie, terme solaire, conseil et résonance). Pendant cette parole, TAO alterne directement sept PNG canoniques selon un rythme irrégulier, sans fondu ni morphing.
- Un écran d’ouverture immédiat masque le chargement des calques lourds ; un service worker met en cache les ressources déjà consultées pour accélérer les lancements suivants. L’ancien bureau fusionné masqué n’est plus téléchargé au démarrage.
- Le Yi Jing local comprend la question, la méthode des trois pièces, le tirage progressif ou rapide, 64 hexagrammes, 384 lectures de lignes, les mutations, la transformation, une guidance structurée et un carnet local filtré par profil.
- Aucun automatisme de ciel, météo ou Lune, aucun cycle de chance, aucune compatibilité avancée et aucune IA ne sont actifs.

## Prototypes non validés

- Étape 8 : 11 objets sont disponibles manuellement ; sept extractions sont classées C et doivent être refaites dans Photoshop avant toute réintégration.
- Étape 9 : aucune limite critique détectée ; la validation visuelle finale appartient à l’utilisateur.
- Étape 10 : le calcul solaire V1 est limité aux années 1800–2200, utilise l’heure civile IANA sans correction au temps solaire vrai et demande encore la validation fonctionnelle de l’utilisateur.
# ARBORESCENCE FONCTIONNELLE — 12 AOÛT 2026

**ÉTAT : IMPLÉMENTÉE — VALIDATION UTILISATEUR ATTENDUE**

- cinq espaces principaux conservés ;
- sous-routes et navigation secondaire mobile ajoutées ;
- Aujourd’hui, Mon thème, Pavillon, Yi Jing et Profils structurés en profondeurs de lecture ;
- Dix Dieux visibles et relations principales calculés sans modifier le moteur BaZi ;
- bibliothèque pédagogique Yi Jing et favoris locaux ajoutés ;
- Da Yun, compatibilité avancée et astronomie explicitement laissés en état « moteur en attente ».
