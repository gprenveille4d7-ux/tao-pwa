# TAO — Yi Jing local

Version : `tao-yijing-engine-1.0.0` / contenu français `tao-yijing-fr-1.0.0`.

## Périmètre

Le module fonctionne entièrement dans le navigateur. Il n’utilise ni API distante, ni intelligence artificielle, ni texte récupéré au moment du tirage. Les questions et les consultations conservées restent dans `localStorage`, sous la clé `tao.yijingReadings.v1`, avec un maximum de 60 entrées.

## Méthode des trois pièces

La convention interne est explicite :

- Pile vaut 2 et représente le versant Yin ;
- Face vaut 3 et représente le versant Yang ;
- 6 : vieux Yin, ligne Yin mutante ;
- 7 : jeune Yang, ligne Yang stable ;
- 8 : jeune Yin, ligne Yin stable ;
- 9 : vieux Yang, ligne Yang mutante.

La première ligne tirée est toujours la ligne du bas. La sixième est la ligne du haut. Une ligne 6 passe de Yin à Yang ; une ligne 9 passe de Yang à Yin. Les lignes 7 et 8 restent stables. Sans ligne mutante, aucun hexagramme de transformation n’est fabriqué.

## Données

`yijing-data.mjs` contient les 8 trigrammes, les 64 hexagrammes de la séquence du roi Wen, leur motif binaire bas-vers-haut, une présentation française originale et 6 lectures de position pour chacun, soit 384 lectures locales. Les symboles Unicode suivent le bloc U+4DC0–U+4DFF. Les noms traditionnels et leur ordre ont été recoupés avec le *Chinese Text Project* et la documentation Unicode :

- https://ctext.org/book-of-changes
- https://unicode.org/versions/Unicode17.0.0/core-spec/chapter-22/
- https://www.unicode.org/charts/nameslist/n_4DC0.html

Les textes français de TAO sont des synthèses originales ; ils ne reproduisent pas une traduction éditoriale du Yi Jing.

## Responsabilités

- `yijing-data.mjs` : trigrammes, hexagrammes, signatures et 384 lectures ;
- `yijing-engine.mjs` : pièces, valeurs 6/7/8/9, ordre des lignes et transformation ;
- `yijing-guidance.mjs` : guidance structurée, traits mutants, rythme et résonance optionnelle avec le Maître du Jour ;
- `yijing-history.js` : persistance locale, filtrage par profil actif et suppression ;
- `yijing-view.js` : question, confirmation, tirage progressif ou rapide, résultat, carnet et accessibilité ;
- `locales/fr/yijing.js` : interface française contrôlée.

## Guidance

La lecture distingue : l’essentiel, ce qui est en mouvement, les appuis, les vigilances, l’action, les traits mutants, le rythme symbolique et une question ouverte. Le rapprochement avec le Maître du Jour reste optionnel et explicitement séparé du Yi Jing. Il ne crée aucune règle BaZi supplémentaire.

## Limites

La méthode à trois pièces est une convention de consultation parmi d’autres. Les 384 textes sont des lectures synthétiques propres à TAO, structurées par le sens de l’hexagramme et la position de la ligne ; ce ne sont ni les sentences classiques intégrales ni une traduction académique. Le module présente une orientation symbolique et ne produit aucune prédiction certaine.

