# TAO — Expérience Astrologie Taoïste V1

Statut : **TECHNIQUEMENT TERMINÉE — VALIDATION UTILISATEUR ATTENDUE**

## Aujourd’hui

`daily-tao-engine.mjs` réutilise les conventions calendaires de `bazi-engine.mjs`. Pour une date locale et un fuseau donnés, il calcule les piliers annuel, mensuel et journalier, le terme solaire actif parmi les 24 Jie Qi, la contribution des deux composantes du jour aux cinq éléments et une résonance avec le Maître du Jour natal.

La résonance est un indicateur symbolique interne, non scientifique et non prédictif. Elle part d’une valeur neutre, puis tient compte des relations d’identité, d’engendrement ou de contrôle entre l’élément du Tronc du Jour et celui du Maître du Jour, ainsi que de la complémentarité de polarité. La guidance est produite par des règles locales déterministes.

Version : `tao-daily-1.0.1`. Le cache est séparé par profil, date locale, fuseau, version quotidienne, version natale et date de mise à jour du profil.

## Mon Thème

Les calculs de `bazi-engine.mjs` ne sont pas modifiés. La vue présente d’abord le Maître du Jour, puis les quatre piliers, les cinq éléments, Yin/Yang, une lecture courte et un approfondissement repliable sur le cycle d’engendrement.

Si l’heure est inconnue, le pilier Heure reste visible et explicitement non déterminé.

## Profils

Le stockage local accepte un profil principal et des profils liés (`family`, `friend`, `partner`, `child`, `parent`, `other`). Chaque profil possède un identifiant stable. `activeProfileId` détermine la personne utilisée immédiatement par Aujourd’hui et Mon Thème.

La modification d’un profil invalide son cache BaZi et son cache quotidien. L’ajout et la modification réutilisent la résolution géographique Open-Meteo et conservent ville, région, pays, coordonnées et fuseau IANA.

## Responsive

Les trois pages utilisent un flux vertical, une largeur éditoriale plafonnée et un padding inférieur supérieur à la hauteur de la navigation. Les contrôles ont été vérifiés à 390 × 844, 768 × 1024 et 1440 × 900 sans scroll horizontal.

## Limites volontaires

Pas de moteur Yi Jing complet, de compatibilité avancée, de Da Yun, de phase lunaire, d’IA, d’automatisation météorologique ou d’automatisation des objets du bureau dans cette V1.
