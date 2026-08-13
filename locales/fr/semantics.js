const entry = (value) => Object.freeze(value);

export const semanticStems = Object.freeze({
  jia: entry({ icon: "🌳", humanTitle: "Le Grand Arbre", keywords: ["croissance", "construction", "direction"], humanDescription: "Une énergie de croissance structurée, qui avance plus justement lorsqu’elle peut suivre une direction et développer quelque chose dans le temps.", technicalFrench: "Bois Yang", traditionalLabel: "Jia · 甲" }),
  yi: entry({ icon: "🌿", humanTitle: "La Plante souple", keywords: ["adaptation", "finesse", "progression"], humanDescription: "Une énergie de croissance progressive, attentive aux contours du réel et capable de trouver un passage sans forcer.", technicalFrench: "Bois Yin", traditionalLabel: "Yi · 乙" }),
  bing: entry({ icon: "☀️", humanTitle: "Le Soleil", keywords: ["rayonnement", "clarté", "expression"], humanDescription: "Une énergie visible et chaleureuse, qui éclaire, rassemble et met les choses en mouvement lorsqu’elle garde sa juste mesure.", technicalFrench: "Feu Yang", traditionalLabel: "Bing · 丙" }),
  ding: entry({ icon: "🕯️", humanTitle: "La Flamme", keywords: ["inspiration", "précision", "attention"], humanDescription: "Une lumière intérieure, précise et sensible, qui aide à discerner, approfondir et transmettre avec subtilité.", technicalFrench: "Feu Yin", traditionalLabel: "Ding · 丁" }),
  wu: entry({ icon: "⛰️", humanTitle: "La Montagne", keywords: ["stabilité", "endurance", "protection"], humanDescription: "Une énergie stable et durable, qui offre une base, protège ce qui compte et avance par continuité.", technicalFrench: "Terre Yang", traditionalLabel: "Wu · 戊" }),
  ji: entry({ icon: "🌾", humanTitle: "La Terre fertile", keywords: ["accueil", "transformation", "patience"], humanDescription: "Une énergie de maturation et de soin, capable d’accueillir, de transformer et de rendre fécond ce qui lui est confié.", technicalFrench: "Terre Yin", traditionalLabel: "Ji · 己" }),
  geng: entry({ icon: "⚙️", humanTitle: "Le Métal forgé", keywords: ["décision", "structure", "détermination"], humanDescription: "Une énergie directe qui clarifie, tranche l’accessoire et transforme la matière par l’effort et la décision.", technicalFrench: "Métal Yang", traditionalLabel: "Geng · 庚" }),
  xin: entry({ icon: "💎", humanTitle: "Le Métal précieux", keywords: ["finesse", "exigence", "discernement"], humanDescription: "Une énergie précise et raffinée, sensible à la qualité, aux nuances et à la cohérence des formes.", technicalFrench: "Métal Yin", traditionalLabel: "Xin · 辛" }),
  ren: entry({ icon: "🌊", humanTitle: "Le Grand Fleuve", keywords: ["mouvement", "exploration", "circulation"], humanDescription: "Une énergie ample et mobile, qui explore, relie les espaces et progresse en trouvant son propre courant.", technicalFrench: "Eau Yang", traditionalLabel: "Ren · 壬" }),
  gui: entry({ icon: "💧", humanTitle: "La Pluie fine", keywords: ["intuition", "observation", "imprégnation"], humanDescription: "Une énergie discrète et pénétrante, qui observe, nourrit en profondeur et laisse mûrir la compréhension.", technicalFrench: "Eau Yin", traditionalLabel: "Gui · 癸" }),
});

export const semanticElements = Object.freeze({
  wood: entry({ icon: "🌿", humanTitle: "Grandir et développer", humanDescription: "Le Bois décrit un mouvement de croissance, d’élan et d’ouverture. Il ne définit pas une personnalité figée.", technicalLabel: "Bois" }),
  fire: entry({ icon: "🔥", humanTitle: "Rayonner et exprimer", humanDescription: "Le Feu décrit un mouvement de visibilité, de chaleur et de mise en relation.", technicalLabel: "Feu" }),
  earth: entry({ icon: "⛰️", humanTitle: "Stabiliser et transformer", humanDescription: "La Terre décrit un mouvement d’accueil, de continuité et de concrétisation.", technicalLabel: "Terre" }),
  metal: entry({ icon: "⚙️", humanTitle: "Structurer et discerner", humanDescription: "Le Métal décrit un mouvement de tri, de précision et de décision.", technicalLabel: "Métal" }),
  water: entry({ icon: "💧", humanTitle: "Circuler et explorer", humanDescription: "L’Eau décrit un mouvement d’écoute, d’adaptation et d’approfondissement.", technicalLabel: "Eau" }),
});

export const semanticTenGodFamilies = Object.freeze({
  support: entry({ icon: "🌱", humanTitle: "Soutien", humanDescription: "Ce qui nourrit, aide à comprendre, apprend et restaure." }),
  peers: entry({ icon: "🤝", humanTitle: "Relations et affirmation", humanDescription: "Ce qui concerne les pairs, l’entourage, l’autonomie et la comparaison." }),
  expression: entry({ icon: "✨", humanTitle: "Expression et création", humanDescription: "Ce que l’on produit, transmet, formule ou développe." }),
  resources: entry({ icon: "🧺", humanTitle: "Ressources et réalisation", humanDescription: "Le rapport aux moyens concrets, aux objectifs, à la gestion et aux occasions." }),
  responsibility: entry({ icon: "🧭", humanTitle: "Cadre et responsabilité", humanDescription: "Le rapport aux règles, aux limites, à la pression, à l’autorité et au dépassement." }),
});

export const semanticTenGods = Object.freeze({
  direct_resource: entry({ family: "support", humanLabel: "Soutien structurant", humanDescription: "Une manière d’apprendre et de se restaurer grâce à des repères stables, une transmission ou un cadre protecteur.", technicalFrench: "Ressource directe", traditionalLabel: "Zheng Yin · 正印", englishLabel: "Direct Resource" }),
  indirect_resource: entry({ family: "support", humanLabel: "Inspiration et intuition", humanDescription: "Une manière plus singulière d’apprendre, de relier les idées et de suivre une compréhension intérieure.", technicalFrench: "Ressource indirecte", traditionalLabel: "Pian Yin · 偏印", englishLabel: "Indirect Resource" }),
  friend: entry({ family: "peers", humanLabel: "Alliés et pairs", humanDescription: "Le rapport à l’égalité, à l’entourage, à l’autonomie et aux personnes qui partagent une dynamique proche.", technicalFrench: "Compagnon", traditionalLabel: "Bi Jian · 比肩", englishLabel: "Friend" }),
  rob_wealth: entry({ family: "peers", humanLabel: "Affirmation et compétition", humanDescription: "Une dynamique de partage, d’émulation et de confrontation qui demande de préserver sa juste place.", technicalFrench: "Rival", traditionalLabel: "Jie Cai · 劫財", englishLabel: "Rob Wealth" }),
  eating_god: entry({ family: "expression", humanLabel: "Création naturelle", humanDescription: "Une expression féconde et régulière : produire, nourrir, transmettre et laisser une capacité prendre forme.", technicalFrench: "Expression créatrice", traditionalLabel: "Shi Shen · 食神", englishLabel: "Eating God" }),
  hurting_officer: entry({ family: "expression", humanLabel: "Expression indépendante", humanDescription: "Une expression vive qui questionne les cadres, affirme une voix propre et gagne à rester consciente de son effet.", technicalFrench: "Expression affranchie", traditionalLabel: "Shang Guan · 傷官", englishLabel: "Hurting Officer" }),
  direct_wealth: entry({ family: "resources", humanLabel: "Ressources concrètes", humanDescription: "Le rapport à la gestion, aux engagements tangibles et à ce qui se construit avec régularité.", technicalFrench: "Richesse directe", traditionalLabel: "Zheng Cai · 正財", englishLabel: "Direct Wealth" }),
  indirect_wealth: entry({ family: "resources", humanLabel: "Opportunités et mouvement", humanDescription: "Le rapport aux occasions, aux réseaux et aux ressources qui demandent réactivité et circulation.", technicalFrench: "Richesse indirecte", traditionalLabel: "Pian Cai · 偏財", englishLabel: "Indirect Wealth" }),
  direct_officer: entry({ family: "responsibility", humanLabel: "Cadre et responsabilité", humanDescription: "Une relation aux règles, à la fiabilité et aux responsabilités qui aide à donner une forme stable à l’action.", technicalFrench: "Autorité régulière", traditionalLabel: "Zheng Guan · 正官", englishLabel: "Direct Officer" }),
  seven_killings: entry({ family: "responsibility", humanLabel: "Défi et dépassement", humanDescription: "Une relation à la pression, aux défis et à l’action décisive. Son expression dépend toujours de l’ensemble du thème.", technicalFrench: "Autorité tranchante", traditionalLabel: "Qi Sha · 七殺", englishLabel: "Seven Killings" }),
});

export const semanticInteractions = Object.freeze({
  combination: entry({ humanLabel: "Énergies qui se rapprochent", humanDescription: "Deux composantes ont tendance à fonctionner ensemble. L’effet dépend de la structure complète du thème.", technicalFrench: "Combinaison", traditionalLabel: "Liu He · 六合" }),
  liu_he: entry({ humanLabel: "Énergies qui se rapprochent", humanDescription: "Deux composantes ont tendance à fonctionner ensemble. L’effet dépend de la structure complète du thème.", technicalFrench: "Six Combinaisons", traditionalLabel: "Liu He · 六合" }),
  clash: entry({ humanLabel: "Énergies en tension", humanDescription: "Deux dynamiques tirent dans des directions différentes et peuvent produire davantage de mouvement ou de changement.", technicalFrench: "Opposition", traditionalLabel: "Chong · 沖" }),
  punishment: entry({ humanLabel: "Friction récurrente", humanDescription: "Une tension qui peut se répéter ou se retourner vers l’intérieur. Elle n’a rien d’une punition morale.", technicalFrench: "Tension interne", traditionalLabel: "Xing · 刑" }),
  harm: entry({ humanLabel: "Interaction sensible", humanDescription: "Une friction plus discrète, dont l’importance dépend du reste de la structure.", technicalFrench: "Friction indirecte", traditionalLabel: "Hai · 害" }),
  destruction: entry({ humanLabel: "Lien instable", humanDescription: "Une relation qui peut fragiliser la continuité ou demander des ajustements.", technicalFrench: "Rupture", traditionalLabel: "Po · 破" }),
});

export const semanticPillars = Object.freeze({
  year: entry({ humanTitle: "Tes racines et ton contexte", humanDescription: "La tradition y observe le contexte d’origine, les racines et la dimension extérieure du thème.", technicalLabel: "Pilier de l’Année" }),
  month: entry({ humanTitle: "Ton environnement de développement", humanDescription: "La tradition y observe les dynamiques saisonnières, sociales et la manière dont le potentiel se structure.", technicalLabel: "Pilier du Mois" }),
  day: entry({ humanTitle: "Le cœur de ton thème", humanDescription: "La tradition y situe l’énergie personnelle principale et une part de la vie relationnelle.", technicalLabel: "Pilier du Jour" }),
  hour: entry({ humanTitle: "Tes aspirations intérieures", humanDescription: "La tradition y observe les projections, accomplissements et dimensions plus intérieures.", technicalLabel: "Pilier de l’Heure" }),
});

export const semantics = Object.freeze({
  version: "tao-semantics-fr-1.0.0",
  stems: semanticStems,
  elements: semanticElements,
  tenGodFamilies: semanticTenGodFamilies,
  tenGods: semanticTenGods,
  interactions: semanticInteractions,
  pillars: semanticPillars,
});
