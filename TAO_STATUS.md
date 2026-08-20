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
LOCALISATION FRANÇAISE `tao-localization-fr-1.5.0` — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
MODULE YI JING LOCAL `tao-yijing-engine-1.0.0` — **TECHNIQUEMENT TERMINÉ — VALIDATION UTILISATEUR ATTENDUE**
RELATIONS & HARMONIE `tao-relationship-1.0.0` — **TECHNIQUEMENT TERMINÉ — VALIDATION UTILISATEUR ATTENDUE**
CONSTELLATION FAMILIALE V4.1 `tao-family-number-3.1.0` + inventaire canonique dédupliqué — **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**
PHASES LUNAIRES — **REPORTÉES**

CERVEAU IA TAO `tao-brain-v1` — **IMPLÉMENTÉ — SECRET GEMINI ET DÉPLOIEMENT CLOUDFLARE ATTENDUS**

La couche conversationnelle réutilise les moteurs BaZi, quotidien, Yi Jing et la couche sémantique. Le client minimise le contexte, conserve mémoire et cache localement, valide les faits cités et garde un fallback déterministe complet. Le Worker est déployé sur `https://tao-ai.g-prenveille4d7.workers.dev`, avec Gemini Interactions API, CORS strict, limites, rate limiting et schéma de sortie ; le healthcheck et une conversation réelle avec `gemini-3.6-flash` ont été validés le 13 août 2026. Aucune clé n’est présente dans le dépôt.

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
- Le ciel et la météo sont automatisés par `tao-environment-1.0.0` à partir du lieu du profil. Les phases lunaires, événements célestes rares et cycles de chance restent inactifs.
- Le module « Relations & harmonie » compare deux profils dans les deux sens à partir de faits BaZi déterministes. Il affiche des repères qualitatifs sans score, adapte la guidance au type de relation et peut transmettre à TAO des faits minimisés pour approfondissement.
- Le module « Constellation familiale » construit un graphe numérique universel pour deux profils ou davantage, découvre les convergences propres à chaque famille sans nombre cible, regroupe les chemins dépendants et estime la fréquence aléatoire des motifs par Monte-Carlo seedé dans un Web Worker. Les dates et heures brutes ne sont pas transmises à Gemini.

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

## ENVIRONNEMENT EXTÉRIEUR DYNAMIQUE — 12 AOÛT 2026

**ÉTAT : TECHNIQUEMENT TERMINÉ — VALIDATION VISUELLE UTILISATEUR ATTENDUE**

- localisation prioritaire : lieu du profil actif ;
- lever et coucher calculés localement, puis affinés par Open-Meteo lorsqu’il répond ;
- météo normalisée et mise en cache ;
- composition temps + météo + saison avec fondu de 2,2 secondes ;
- panneau local `?debug=environment#pavilion` ;
- aucune Lune ni aurore automatique sans donnée fiable.

## REFONTE SÉMANTIQUE FRANÇAISE — 13 AOÛT 2026

**ÉTAT : TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**

- lexique local `tao-semantics-fr-1.0.0` : sens humain, explication, lecture traditionnelle ;
- dix archétypes, cinq mouvements, cinq familles et dix relations BaZi couverts ;
- Aujourd’hui commence par le conseil et propose « Pourquoi TAO me dit ça ? » ;
- Mon thème commence par l’archétype et les quatre facettes ;
- la guidance Yi Jing précède désormais les signes traditionnels ;
- aucune modification des moteurs BaZi ou Yi Jing, des profils, du décor ou des assets.
