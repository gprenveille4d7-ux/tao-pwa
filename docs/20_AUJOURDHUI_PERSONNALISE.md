# Aujourd’hui — signature personnelle déterministe

Version : `tao-daily-personal-1.0.0`.

La page **Aujourd’hui** croise désormais le pilier du jour avec le thème natal actif avant de produire sa priorité éditoriale. `daily-personal-signature.mjs` ne modifie aucun calcul BaZi : il consomme uniquement les piliers déjà calculés.

## Faits utilisés

- relation des Cinq Éléments entre le Tronc du Jour et le Maître du Jour ;
- relation des Dix Dieux du Tronc du Jour, calculée par `tenGodFor()` ;
- répétitions, Six Combinaisons et oppositions directes entre la Branche du Jour et les Branches natales ;
- présence relative des Cinq Éléments dans le thème natal ;
- polarité du jour.

Chaque phrase principale expose une liste de `facts` versionnés. « Pourquoi TAO me dit ça ? » affiche ces faits et transmet seulement ces identifiants à la conversation IA. La date et l’heure de naissance brutes ne sont pas incluses.

## Priorités et limites

Une opposition de Branche devient prioritaire sur une relation élémentaire générique. Une combinaison peut soutenir les échanges. En l’absence d’interaction forte, TAO décrit la relation élémentaire et le Dix Dieu sans inventer d’événement. Les tendances restent qualitatives : favorable, équilibré, sensible, prudence, utile ou prioritaire. Aucun score arbitraire n’est présenté.

La lecture locale et son explication restent disponibles hors ligne. Gemini peut reformuler les faits transmis mais ne recalcule ni le thème natal ni la journée.
