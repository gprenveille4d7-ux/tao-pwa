export const YIJING_DATA_VERSION = "tao-yijing-fr-1.0.0";

export const TRIGRAMS = Object.freeze({
  qian: Object.freeze({ id: "qian", hanzi: "乾", pinyin: "Qián", french: "Ciel", symbol: "☰", lines: [1, 1, 1], image: "le ciel", direction: "Nord-Ouest", family: "Père", quality: "élan créateur" }),
  kun: Object.freeze({ id: "kun", hanzi: "坤", pinyin: "Kūn", french: "Terre", symbol: "☷", lines: [0, 0, 0], image: "la terre", direction: "Sud-Ouest", family: "Mère", quality: "accueil et fécondité" }),
  zhen: Object.freeze({ id: "zhen", hanzi: "震", pinyin: "Zhèn", french: "Tonnerre", symbol: "☳", lines: [1, 0, 0], image: "le tonnerre", direction: "Est", family: "Fils aîné", quality: "mise en mouvement" }),
  xun: Object.freeze({ id: "xun", hanzi: "巽", pinyin: "Xùn", french: "Vent", symbol: "☴", lines: [0, 1, 1], image: "le vent et le bois", direction: "Sud-Est", family: "Fille aînée", quality: "pénétration douce" }),
  kan: Object.freeze({ id: "kan", hanzi: "坎", pinyin: "Kǎn", french: "Eau", symbol: "☵", lines: [0, 1, 0], image: "l’eau", direction: "Nord", family: "Fils cadet", quality: "profondeur et risque" }),
  li: Object.freeze({ id: "li", hanzi: "離", pinyin: "Lí", french: "Feu", symbol: "☲", lines: [1, 0, 1], image: "le feu", direction: "Sud", family: "Fille cadette", quality: "clarté et attachement" }),
  gen: Object.freeze({ id: "gen", hanzi: "艮", pinyin: "Gèn", french: "Montagne", symbol: "☶", lines: [0, 0, 1], image: "la montagne", direction: "Nord-Est", family: "Fils benjamin", quality: "arrêt et stabilité" }),
  dui: Object.freeze({ id: "dui", hanzi: "兌", pinyin: "Duì", french: "Lac", symbol: "☱", lines: [1, 1, 0], image: "le lac", direction: "Ouest", family: "Fille benjamine", quality: "joie et échange" }),
});

// lower puis upper : la première ligne de chaque motif est toujours la ligne du bas.
const HEXAGRAM_ROWS = [
  [1,"乾","Qián","L’Élan créateur","qian","qian","initier avec constance","l’excès de volonté","mettre sa force au service d’une direction claire","Quelle création mérite une constance entière ?"],
  [2,"坤","Kūn","L’Accueil réceptif","kun","kun","recevoir et faire mûrir","la passivité sans discernement","soutenir ce qui cherche à prendre forme","Que peux-tu accueillir sans te perdre ?"],
  [3,"屯","Zhūn","La Difficulté initiale","zhen","kan","ordonner un commencement confus","vouloir aller trop vite","poser des repères simples avant d’avancer","Quel premier pas rendrait le chaos plus habitable ?"],
  [4,"蒙","Méng","L’Inexpérience","kan","gen","apprendre avec disponibilité","prétendre savoir trop tôt","poser une question sincère et écouter la réponse","Qu’as-tu encore besoin d’apprendre ici ?"],
  [5,"需","Xū","L’Attente","qian","kan","préparer sans forcer le moment","confondre attente et inertie","nourrir les conditions d’une action juste","Que peux-tu préparer pendant que le moment mûrit ?"],
  [6,"訟","Sòng","Le Conflit","kan","qian","clarifier un désaccord","pousser l’affrontement jusqu’à l’usure","rechercher un cadre ou un tiers équitable","Quel point essentiel doit être clarifié sans escalade ?"],
  [7,"師","Shī","L’Organisation collective","kan","kun","rassembler les forces autour d’une discipline","agir sans mandat clair","définir rôles, limites et responsabilité","Quelle discipline commune rendrait l’action plus juste ?"],
  [8,"比","Bǐ","L’Union","kun","kan","créer une alliance sincère","s’unir par peur d’être seul","vérifier la qualité du lien avant de s’engager","Avec qui l’alliance est-elle réellement réciproque ?"],
  [9,"小畜","Xiǎo Chù","L’Apprivoisement du petit","qian","xun","agir par petites inflexions","sous-estimer les détails","accumuler patiemment de modestes progrès","Quel petit ajustement aurait un effet durable ?"],
  [10,"履","Lǚ","La Marche","dui","qian","avancer avec tact sur un terrain sensible","la désinvolture","respecter les formes sans perdre sa vérité","Comment avancer avec présence et courtoisie ?"],
  [11,"泰","Tài","La Paix","qian","kun","faire circuler ce qui s’accorde","croire l’harmonie acquise","entretenir les échanges entre le haut et le bas","Que faut-il continuer à faire circuler ?"],
  [12,"否","Pǐ","La Stagnation","kun","qian","préserver l’essentiel quand les échanges se ferment","s’épuiser à convaincre","se retirer de ce qui ne répond pas et garder son axe","Où ton énergie doit-elle cesser de se disperser ?"],
  [13,"同人","Tóng Rén","La Communauté","li","qian","se relier autour d’une intention partagée","former un clan fermé","nommer clairement la cause commune","Quelle intention peut vraiment rassembler ?"],
  [14,"大有","Dà Yǒu","Le Grand Avoir","qian","li","assumer une abondance avec générosité","s’identifier à ses acquis","mettre ses ressources au service du juste","Comment partager ce que tu possèdes déjà ?"],
  [15,"謙","Qiān","L’Humilité","gen","kun","laisser la valeur agir sans ostentation","se diminuer artificiellement","rester simple, précis et disponible","Comment être pleinement présent sans te mettre au centre ?"],
  [16,"豫","Yù","L’Enthousiasme","kun","zhen","mobiliser une énergie collective","se laisser emporter par l’excitation","donner un rythme concret à l’élan","Quel rythme peut transformer l’envie en mouvement ?"],
  [17,"隨","Suí","Le Suivi","zhen","dui","s’adapter à ce qui mérite d’être suivi","imiter sans conscience","choisir lucidement le courant auquel répondre","Qu’est-ce qui mérite réellement que tu le suives ?"],
  [18,"蠱","Gǔ","Réparer ce qui est altéré","xun","gen","corriger un héritage négligé","chercher un coupable au lieu de réparer","examiner la cause puis intervenir avec soin","Que faut-il réparer à la racine ?"],
  [19,"臨","Lín","L’Approche","dui","kun","se rapprocher avec responsabilité","envahir l’espace de l’autre","offrir présence et soutien sans domination","Comment t’approcher sans prendre toute la place ?"],
  [20,"觀","Guān","La Contemplation","kun","xun","observer avant d’influencer","rester spectateur trop longtemps","élargir le regard et devenir exemplaire","Que révèle la situation lorsque tu prends de la hauteur ?"],
  [21,"噬嗑","Shì Kè","Mordre et unir","zhen","li","trancher ce qui empêche l’union","punir avec excès","nommer l’obstacle et appliquer une mesure proportionnée","Quel obstacle doit être traité clairement ?"],
  [22,"賁","Bì","La Grâce","li","gen","donner une forme juste au fond","privilégier l’apparence","embellir sans masquer l’essentiel","Quelle forme servirait le mieux la vérité du fond ?"],
  [23,"剝","Bō","L’Érosion","kun","gen","laisser tomber ce qui n’a plus d’assise","s’agripper à une structure épuisée","protéger le noyau et accepter le dépouillement","Qu’est-ce qui peut tomber sans emporter l’essentiel ?"],
  [24,"復","Fù","Le Retour","zhen","kun","revenir au mouvement juste","forcer un redémarrage spectaculaire","suivre le premier signe de renouveau","À quoi de simple et de vrai peux-tu revenir ?"],
  [25,"無妄","Wú Wàng","L’Innocence","zhen","qian","agir sans calcul artificiel","la naïveté imprudente","répondre directement à ce qui est réel","Que ferais-tu sans stratégie superflue ?"],
  [26,"大畜","Dà Chù","Le Grand Apprivoisement","qian","gen","contenir une grande force pour la cultiver","bloquer l’énergie par peur","étudier, préparer et choisir le bon moment","Quelle puissance gagnerait à être cultivée avant d’agir ?"],
  [27,"頤","Yí","Nourrir","zhen","gen","veiller à ce qui alimente le corps et l’esprit","consommer sans discernement","choisir avec soin paroles, nourritures et influences","De quoi te nourris-tu réellement dans cette situation ?"],
  [28,"大過","Dà Guò","Le Grand Excès","xun","dui","soutenir une charge exceptionnelle","laisser la structure céder","agir avec courage tout en renforçant les appuis","Quel soutien manque à ce qui porte trop de poids ?"],
  [29,"坎","Kǎn","L’Insondable","kan","kan","traverser le risque avec sincérité","se perdre dans la peur","rester fidèle à une méthode simple","Quelle pratique te garde centré dans l’incertitude ?"],
  [30,"離","Lí","La Clarté","li","li","éclairer et s’attacher à ce qui nourrit la lucidité","brûler trop vite ou dépendre du regard extérieur","entretenir une lumière régulière","À quelle source de clarté choisis-tu de t’attacher ?"],
  [31,"咸","Xián","L’Influence","gen","dui","laisser l’attraction devenir dialogue","manipuler ou séduire","écouter ce qui te touche avant de répondre","Qu’est-ce qui t’influence, et avec quel consentement ?"],
  [32,"恆","Héng","La Durée","xun","zhen","tenir une direction à travers le changement","la routine sans présence","installer un rythme souple et fidèle","Quelle constance peut survivre aux variations ?"],
  [33,"遯","Dùn","Le Retrait","gen","qian","se retirer à temps pour préserver sa liberté","fuir sans conscience","prendre de la distance avec dignité","De quoi faut-il t’éloigner pour garder ton intégrité ?"],
  [34,"大壯","Dà Zhuàng","La Grande Force","qian","zhen","employer une puissance devenue visible","confondre force et droit","retenir l’élan jusqu’à ce qu’il serve le juste","Comment utiliser ta force sans écraser ?"],
  [35,"晉","Jìn","Le Progrès","kun","li","avancer vers davantage de visibilité","chercher la reconnaissance à tout prix","mettre en lumière un travail déjà mûr","Qu’est-ce qui est prêt à être montré ?"],
  [36,"明夷","Míng Yí","L’Obscurcissement de la lumière","li","kun","protéger sa clarté dans un contexte difficile","s’exposer inutilement","garder une lumière intérieure discrète","Comment préserver ta vérité sans la livrer au conflit ?"],
  [37,"家人","Jiā Rén","La Famille","li","xun","ordonner les relations proches","figer chacun dans un rôle","clarifier les responsabilités par l’exemple","Quel rôle peux-tu habiter avec plus de justesse ?"],
  [38,"睽","Kuí","L’Opposition","dui","li","reconnaître une différence féconde","vouloir uniformiser","chercher un petit terrain d’entente sans nier l’écart","Quelle différence doit être respectée plutôt que résolue ?"],
  [39,"蹇","Jiǎn","L’Obstacle","gen","kan","changer de direction devant l’entrave","s’acharner seul","revenir vers un appui compétent","Quel détour rendrait le passage possible ?"],
  [40,"解","Xiè","La Délivrance","kan","zhen","dénouer une tension et repartir","relâcher sans apprendre","résoudre simplement puis pardonner","Qu’est-ce qui peut maintenant être dénoué ?"],
  [41,"損","Sǔn","La Diminution","dui","gen","retrancher pour renforcer l’essentiel","se priver sans sens","simplifier avec sincérité","Que peux-tu retirer pour rendre l’ensemble plus juste ?"],
  [42,"益","Yì","L’Augmentation","zhen","xun","accroître ce qui bénéficie à tous","accumuler pour soi seul","investir dans ce qui fait circuler la valeur","Quelle croissance profite aussi au lien ?"],
  [43,"夬","Guài","La Percée","qian","dui","déclarer clairement ce qui doit changer","l’affrontement brutal","dire la vérité sans violence puis agir","Quelle vérité demande une expression nette ?"],
  [44,"姤","Gòu","La Rencontre","xun","qian","reconnaître une influence soudaine","laisser une petite force envahir tout l’espace","poser tôt une limite consciente","Quelle influence nouvelle mérite une limite claire ?"],
  [45,"萃","Cuì","Le Rassemblement","kun","dui","réunir autour d’un centre vivant","rassembler sans intention commune","préparer le cadre qui permet la confiance","Quel centre commun peut accueillir les différences ?"],
  [46,"升","Shēng","La Montée","xun","kun","progresser par effort patient","chercher un raccourci","avancer humblement étape après étape","Quelle progression lente est déjà en cours ?"],
  [47,"困","Kùn","L’Oppression","kan","dui","rester vrai quand les ressources manquent","se laisser définir par l’épuisement","économiser les mots et tenir l’essentiel","Quelle conviction demeure quand les moyens se resserrent ?"],
  [48,"井","Jǐng","Le Puits","xun","kan","prendre soin d’une ressource commune","négliger l’accès ou l’entretien","réparer le moyen de puiser avant de distribuer","Quelle ressource profonde demande à être entretenue ?"],
  [49,"革","Gé","La Transformation","li","dui","changer quand le moment et la confiance sont mûrs","révolutionner par impatience","préparer la légitimité puis renouveler la forme","Qu’est-ce qui doit vraiment changer, et pourquoi maintenant ?"],
  [50,"鼎","Dǐng","Le Chaudron","xun","li","transformer les matières en culture partagée","soigner le contenant sans nourrir","réunir compétences et sens autour d’une œuvre","Que veux-tu transformer en nourriture commune ?"],
  [51,"震","Zhèn","L’Ébranlement","zhen","zhen","retrouver sa présence après le choc","réagir dans la panique","respirer, discerner puis remettre l’action en route","Qu’est-ce qui reste stable quand tout surprend ?"],
  [52,"艮","Gèn","L’Immobilisation","gen","gen","s’arrêter au bon endroit","se figer par peur","calmer le geste avant de calmer la pensée","Où un arrêt franc rendrait-il la clarté ?"],
  [53,"漸","Jiàn","Le Développement progressif","gen","xun","grandir selon un ordre naturel","brûler les étapes","stabiliser chaque palier avant le suivant","Quel palier mérite d’être pleinement habité ?"],
  [54,"歸妹","Guī Mèi","La Jeune Mariée","dui","zhen","trouver sa place dans une situation imparfaite","agir comme si l’on contrôlait tout","reconnaître les limites du rôle présent","Quelle marge d’action est réellement la tienne ?"],
  [55,"豐","Fēng","L’Abondance","li","zhen","agir au cœur d’une pleine intensité","craindre le déclin au point de manquer le présent","clarifier puis employer l’abondance disponible","Que peux-tu accomplir pendant que la lumière est pleine ?"],
  [56,"旅","Lǚ","Le Voyageur","gen","li","rester adaptable en terrain étranger","s’attacher comme si tout était permanent","avancer avec modestie et peu de bagages","Qu’est-ce qui t’aide à rester juste sans être chez toi ?"],
  [57,"巽","Xùn","La Douce Pénétration","xun","xun","influencer par répétition subtile","l’indécision diffuse","répéter calmement une intention claire","Quelle influence douce gagnerait à être constante ?"],
  [58,"兌","Duì","La Joie","dui","dui","ouvrir un échange sincère","chercher l’approbation","parler avec joie sans flatter","Quelle parole vraie pourrait remettre de la circulation ?"],
  [59,"渙","Huàn","La Dispersion","kan","xun","dissoudre ce qui sépare","se disperser soi-même","réunir autour d’un sens plus vaste","Quelle barrière intérieure peut se relâcher ?"],
  [60,"節","Jié","La Limitation","dui","kan","créer des limites qui rendent libre","imposer des règles stériles","choisir une mesure soutenable","Quelle limite protégerait la circulation plutôt que la bloquer ?"],
  [61,"中孚","Zhōng Fú","La Vérité intérieure","dui","xun","établir la confiance par cohérence","croire sans vérifier","faire correspondre parole, intention et acte","Quelle vérité peux-tu rendre crédible par tes actes ?"],
  [62,"小過","Xiǎo Guò","La Prépondérance du petit","gen","zhen","réussir par une attention modeste","viser trop haut dans un moment étroit","soigner les détails et garder un profil bas","Quel détail mérite toute ton attention maintenant ?"],
  [63,"既濟","Jì Jì","Après l’accomplissement","li","kan","préserver l’ordre obtenu","se relâcher trop tôt","surveiller les petits signes de déséquilibre","Que faut-il entretenir après la réussite ?"],
  [64,"未濟","Wèi Jì","Avant l’accomplissement","kan","li","achever une traversée avec vigilance","précipiter le dernier pas","vérifier les conditions avant de conclure","Quel dernier ajustement sépare encore de l’achèvement ?"],
];

const LINE_POSITIONS = Object.freeze([
  Object.freeze({ label: "Le commencement", focus: "les fondations et l’impulsion initiale", advice: "Commence modestement et vérifie l’assise avant d’engager davantage." }),
  Object.freeze({ label: "L’ancrage", focus: "la place juste dans le concret et la relation", advice: "Cherche l’appui simple qui permet au mouvement de devenir fiable." }),
  Object.freeze({ label: "Le seuil", focus: "le passage de l’intention à l’action", advice: "Mesure l’effort : c’est souvent ici que l’empressement crée la friction." }),
  Object.freeze({ label: "L’ouverture", focus: "l’entrée dans une sphère plus large", advice: "Observe le contexte avant d’exposer pleinement ta position." }),
  Object.freeze({ label: "La maîtrise", focus: "la responsabilité et la capacité d’influencer", advice: "Emploie ta latitude pour servir l’ensemble plutôt que pour imposer." }),
  Object.freeze({ label: "L’aboutissement", focus: "la sortie d’un cycle et son dépassement", advice: "Reconnais ce qui est accompli et évite de prolonger artificiellement le mouvement." }),
]);

function buildLineReadings(hexagram) {
  return LINE_POSITIONS.map((position, index) => Object.freeze({
    line: index + 1,
    title: position.label,
    text: `Dans « ${hexagram.french} », la ligne ${index + 1} place l’attention sur ${position.focus}. ${position.advice} La dynamique de ${hexagram.theme} reste féconde si tu évites ${hexagram.shadow}.`,
  }));
}

export const HEXAGRAMS = Object.freeze(HEXAGRAM_ROWS.map(([number, hanzi, pinyin, french, lower, upper, theme, shadow, posture, reflection]) => {
  const base = {
    number, hanzi, pinyin, french, lower, upper,
    unicode: String.fromCodePoint(0x4dc0 + number - 1),
    lines: Object.freeze([...TRIGRAMS[lower].lines, ...TRIGRAMS[upper].lines]),
    theme, shadow, posture, reflection,
    keywords: Object.freeze([TRIGRAMS[lower].quality, TRIGRAMS[upper].quality, theme]),
    image: `${TRIGRAMS[upper].image} au-dessus de ${TRIGRAMS[lower].image}`,
    summary: `Ce signe parle de ${theme}. Il invite à ${posture}.`,
    dynamics: `La rencontre entre ${TRIGRAMS[lower].french.toLowerCase()} et ${TRIGRAMS[upper].french.toLowerCase()} met en mouvement ${theme}.`,
    strengths: Object.freeze([posture, TRIGRAMS[lower].quality, TRIGRAMS[upper].quality]),
    risks: Object.freeze([shadow, "confondre le symbole avec une certitude", "agir sans relire la situation concrète"]),
  };
  return Object.freeze({ ...base, lineReadings: Object.freeze(buildLineReadings(base)) });
}));

export const HEXAGRAM_BY_NUMBER = new Map(HEXAGRAMS.map((hexagram) => [hexagram.number, hexagram]));
export const HEXAGRAM_BY_SIGNATURE = new Map(HEXAGRAMS.map((hexagram) => [hexagram.lines.join(""), hexagram]));

export function getHexagramByLines(lines) {
  return HEXAGRAM_BY_SIGNATURE.get(lines.map(Number).join("")) ?? null;
}

