# Environnement extérieur dynamique

Version : `tao-environment-1.0.0`  
Statut : techniquement terminé — validation visuelle utilisateur attendue

## Principe

Le paysage derrière les fenêtres suit la localisation du profil actif. L’ordre de décision est strict :

1. heure locale et position du Soleil ;
2. météo normalisée ;
3. saison ;
4. phase lunaire, lorsqu’un futur asset individuel fiable sera disponible ;
5. événement céleste, uniquement lorsqu’une source fiable l’autorise.

TAO, le bureau, les objets, le Pavillon, le cadrage et les proportions ne sont jamais modifiés par ce moteur.

## Inventaire des 19 extérieurs autonomes

- Ambiances lumineuses automatiques : jour clair, matin ensoleillé, après-midi ensoleillé, coucher de Soleil et crépuscule rose.
- Nuit automatique : nuit étoilée du fjord alpin, uniquement par ciel dégagé ou partiellement nuageux.
- Météo automatique : jour nuageux, brouillard, pluie douce, forte pluie, neige et orage.
- Assets célestes conservés mais non automatiques : pleine Lune, croissant, Voie lactée exceptionnelle et trois aurores.
- Tempête de neige : conservée ; l’état météo V1 normalise actuellement toute neige sous `SNOW` et utilise l’asset neige lisible.

La planche des huit phases de Lune n’est pas découpée. Aucune pleine Lune n’est donc inventée pendant la nuit.

## Calcul solaire local

`solar-engine.mjs` calcule lever, midi solaire et coucher à partir de la date et des coordonnées du profil. Les périodes sont relatives à ces instants :

- `DAWN` : de 60 minutes avant à 25 minutes après le lever ;
- `MORNING` : après l’aube, jusqu’à environ trois heures après le lever ;
- `DAY` : partie centrale de la journée solaire ;
- `LATE_AFTERNOON` : trois dernières heures avant la fenêtre crépusculaire ;
- `TWILIGHT` : 40 minutes avant à 45 minutes après le coucher ;
- `NIGHT` : le reste de la nuit.

Les jours et nuits polaires sont traités explicitement. Le calcul local reste disponible hors ligne. Lorsqu’Open-Meteo fournit ses heures solaires, elles remplacent les valeurs locales pour la composition courante.

## Météo

Le fournisseur V1 est l’API publique Open-Meteo : `https://open-meteo.com/en/docs`.

Lorsque ses données sont actives, un lien discret « Météo : Open-Meteo » reste visible dans la scène afin d’attribuer clairement la source.

Seules les données suivantes sont transmises : latitude, longitude et fuseau IANA du lieu du profil. La réponse est normalisée en `CLEAR`, `PARTLY_CLOUDY`, `CLOUDY`, `OVERCAST`, `FOG`, `RAIN`, `HEAVY_RAIN`, `SNOW` ou `STORM`. Aucun autre module ne dépend des codes WMO ni du fournisseur.

Le cache est frais pendant 30 minutes. Une dernière mesure âgée de moins de douze heures peut être utilisée hors ligne. Sans réseau ni cache, le moteur conserve le calcul solaire et n’invente aucune météo.

## Composition et transitions

Deux calques d’image identiques partagent exactement les mêmes variables de cadrage. Le nouvel asset est préchargé, puis un fondu d’opacité de 2,2 secondes remplace l’ancien. Les calques atmosphériques restent derrière la structure du Pavillon : lumière, ciel, météo et `celestialEventLayer` inactif.

Une nuit pluvieuse utilise l’asset pluie, assombri par la lumière nocturne ; elle n’utilise jamais l’asset étoilé. Une nuit partiellement nuageuse conserve quelques étoiles derrière un voile nuageux. Une nuit couverte, brumeuse, neigeuse ou orageuse n’affiche aucune étoile.

## Hors ligne

Le service worker précharge les six ambiances lumineuses essentielles. Les assets météo sont mis en cache lors de leur première utilisation. Si un asset demandé est indisponible, le contrôleur conserve l’ambiance déjà chargée sans flash ni image cassée.

## Debug

Le panneau est disponible uniquement sur `localhost` ou `127.0.0.1` :

`?debug=environment#pavilion`

Il permet de simuler 06:00, 09:00, 12:00, 17:00, lever, coucher, crépuscule, 22:00 et 02:00 ; de forcer les six moments ; et de forcer dégagé, nuageux, couvert, brouillard, pluie, forte pluie, neige ou orage. Les valeurs ne sont ni enregistrées ni disponibles en production. `AUTO` reste toujours le comportement normal.
