# Relations & harmonie — objectifs de lecture

Version : `tao-relationship-1.1.0`

## Pipeline

Les deux thèmes BaZi sont comparés une seule fois. Le moteur produit des `stableFacts` indépendants de l’objectif choisi, puis les classe avec `rankRelationshipFacts()` selon `relationshipGoal`.

Les identifiants canoniques sont :

- `overview` — comprendre la relation dans son ensemble ;
- `differences` — mieux comprendre les différences ;
- `communication` — améliorer la communication ;
- `difficult_period` — traverser une période difficile ;
- `cooperation` — mieux fonctionner ensemble.

Les anciens identifiants `general` et `better_together` sont seulement acceptés comme alias de migration. Ils ne sont plus proposés par l’interface.

## Invariants

Changer d’objectif ne modifie jamais les Maîtres du Jour, les Dix Dieux, les relations élémentaires, les interactions de Branches ni les axes qualitatifs. Seuls le classement des faits, l’ordre des sections, l’explication et les conseils changent.

## Cache

La clé de lecture contient les deux profils, la nature de la relation, l’objectif, la version du moteur et la signature des faits stables. Deux objectifs ne peuvent donc pas partager accidentellement la même lecture.

## IA

Le contexte transmis à TAO contient un fait `RELATIONSHIP_GOAL` explicite, puis les faits prioritaires déjà calculés. Gemini ne recalcule aucun thème et reçoit une instruction différente pour chacun des cinq angles.

## Debug

`?debug=relationships#profiles/compatibility` affiche l’objectif sélectionné, l’objectif du payload, la clé de cache, l’objectif du prompt, l’objectif rendu et les faits prioritaires.
