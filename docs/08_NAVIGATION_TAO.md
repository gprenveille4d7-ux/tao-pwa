# Navigation principale de TAO

## Périmètre de la Phase 6

La navigation principale comprend exactement cinq destinations, dans cet ordre :

1. Aujourd’hui (`#today`)
2. Mon thème (`#theme`)
3. Le Pavillon (`#pavilion`)
4. Yi Jing (`#yijing`)
5. Profils (`#profiles`)

Le Pavillon est la destination initiale d’un utilisateur disposant d’un profil valide. La barre reste masquée pendant la première rencontre afin de ne pas interrompre l’onboarding.

## Routage et conservation d’état

Le routage repose sur le fragment d’URL et ne nécessite aucune bibliothèque. Chaque destination correspond à une section structurelle de `index.html`. Le changement de destination utilise l’attribut HTML `hidden` : la section du Pavillon n’est ni détruite ni reconstruite. L’image active de TAO, le dialogue et l’état de la scène restent donc présents en mémoire entre deux visites.

Une route inconnue revient prudemment vers `#pavilion`. Le titre du document et l’attribut accessible `aria-current="page"` suivent la destination visible.

## Profil actif

`app-navigation.js` récupère le profil par `getActiveProfile()`. La vue Profils expose uniquement les données déjà enregistrées : prénom, date, lieu et heure de naissance, ou « Heure inconnue ». L’action « + AJOUTER UNE PERSONNE » est visible mais désactivée ; aucune gestion multi-profils n’est implémentée ici.

À la création du premier profil, l’onboarding émet l’événement local `tao:profile-created`. La navigation apparaît sans rechargement et ouvre le Pavillon. Aux lancements suivants, l’existence d’un profil valide permet d’afficher directement la navigation et le Pavillon.

## Présentation et accessibilité

La barre fixe adopte les couleurs bleu nuit et dorées du Pavillon. Ses cinq pictogrammes sont dessinés en CSS, sans emoji ni ressource iconographique externe. Les liens conservent une zone tactile généreuse, un focus visible, une destination textuelle et un état actif qui ne dépend pas uniquement de la couleur.

Les marges de la barre et des contenus prennent en compte `safe-area-inset-bottom`. Les vues structurelles défilent verticalement lorsque leur hauteur dépasse l’écran, sans scroll horizontal.

## Limites volontaires

Les espaces Aujourd’hui, Mon thème et Yi Jing sont des structures visuelles sans calcul ni contenu fictif. Aucun moteur astrologique, calcul quotidien, tirage, IA conversationnelle ou automatisation des postures de TAO n’est ajouté par cette phase.
