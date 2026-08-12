# Premier profil et première rencontre

La Phase 5 recueille progressivement le prénom, le lieu, la date et l’heure locale de naissance. Elle ne contient ni compte distant, ni gestion multi-profils, ni calcul astrologique.

## Modèle `Profile`

```js
{
  schemaVersion: 1,
  id: "UUID stable et unique",
  firstName: "Élodie",
  relationship: "self",
  birthDate: "1985-09-11",
  birthTime: "14:32", // ou null
  birthTimeKnown: true, // ou false
  birthPlace: {
    id: "open-meteo:2986732",
    provider: "open-meteo",
    city: "Granville",
    region: "Normandie",
    country: "France",
    countryCode: "FR",
    latitude: 48.8379,
    longitude: -1.5971,
    timezone: "Europe/Paris"
  },
  createdAt: "date ISO",
  updatedAt: "date ISO"
}
```

Une heure inconnue est toujours représentée par `birthTimeKnown: false` et `birthTime: null`. Aucune heure conventionnelle n’est inventée. La date et l’heure représentent l’heure civile locale du lieu de naissance; aucune conversion UTC ou historique n’est effectuée pendant cette phase.

## Stockage local

Trois entrées versionnées sont utilisées dans `localStorage` :

- `tao.profiles.v1` : collection des profils complets;
- `tao.activeProfileId.v1` : identifiant du profil actif;
- `tao.onboardingDraft.v1` : réponses temporaires de la première rencontre.

Un profil incomplet ou corrompu n’est jamais accepté comme source de vérité. Si l’identifiant actif est absent mais qu’un profil principal valide existe, celui-ci devient automatiquement actif. Le brouillon permet de reprendre à la première réponse manquante après une interruption.

## Recherche du lieu

`geocoding.js` interroge exclusivement l’API de géocodage Open-Meteo avec le texte de ville recherché et la langue française. Le profil complet n’est jamais transmis. Les données de lieux proviennent de GeoNames et comprennent un identifiant stable, la région, le pays, les coordonnées WGS84 et le fuseau IANA.

Les homonymes sont présentés avec leur région et leur pays. L’utilisateur doit sélectionner explicitement une proposition. En cas d’échec réseau, aucune coordonnée n’est inventée et une action « Réessayer » reste disponible.

## Premier lancement

L’existence d’un profil principal valide détermine le parcours :

- aucun profil valide : reprise du brouillon ou démarrage de la première rencontre;
- profil valide : chargement du profil actif et arrivée directe dans le Pavillon normal.

Le mode `?debug=onboarding` ajoute uniquement un bouton de réinitialisation locale pour les tests de développement. Le mode historique `?debug=poses` reste isolé de l’onboarding.
