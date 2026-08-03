// 知识边界 · 领域分类体系（v2，经领域覆盖审查修订）
// weight = 该领域题目数；subdomains 各 qty 之和 = weight；总题数 596
window.KNOWLEDGE_DOMAINS = [
  {
    id: "math", name: "数学与逻辑", nameEn: "Mathematics & Logic",
    icon: "fa-solid fa-calculator", color: "#5b8cff", weight: 30,
    description: "从小学算术到微积分、数论、逻辑与悖论，数学是衡量理性思维能力的标尺。",
    subdomains: [
      { id: "math-elem", name: "初等数学", qty: 8 },
      { id: "math-higher", name: "高等数学", qty: 8 },
      { id: "math-number", name: "数论与组合", qty: 7 },
      { id: "math-logic", name: "逻辑与悖论", qty: 7 }
    ]
  },
  {
    id: "natural", name: "自然科学", nameEn: "Natural Sciences",
    icon: "fa-solid fa-atom", color: "#22c55e", weight: 74,
    description: "物理、化学、天文、地球科学、生物与农学——理解宇宙、生命与食物的最基础学科。",
    subdomains: [
      { id: "nat-physics", name: "物理学", qty: 18 },
      { id: "nat-chem", name: "化学", qty: 14 },
      { id: "nat-astro", name: "天文学", qty: 14 },
      { id: "nat-earth", name: "地球科学", qty: 12 },
      { id: "nat-bio", name: "生物学", qty: 12 },
      { id: "nat-agri", name: "农学与食物系统", qty: 4 }
    ]
  },
  {
    id: "tech", name: "技术工程", nameEn: "Technology & Engineering",
    icon: "fa-solid fa-microchip", color: "#8b5cf6", weight: 50,
    description: "计算机科学、人工智能、电子信息、机械材料、能源交通与航空航天建筑。",
    subdomains: [
      { id: "tech-cs", name: "计算机科学基础", qty: 12 },
      { id: "tech-ai", name: "人工智能", qty: 12 },
      { id: "tech-elec", name: "电子信息", qty: 7 },
      { id: "tech-mech", name: "机械与材料", qty: 7 },
      { id: "tech-energy", name: "能源与交通", qty: 6 },
      { id: "tech-aero", name: "航空航天与建筑", qty: 6 }
    ]
  },
  {
    id: "medicine", name: "医学与健康", nameEn: "Medicine & Health",
    icon: "fa-solid fa-stethoscope", color: "#f43f5e", weight: 34,
    description: "人体结构、疾病与治疗、营养与公共卫生、中医传统医学、医学史与前沿。",
    subdomains: [
      { id: "med-anatomy", name: "解剖与生理", qty: 8 },
      { id: "med-disease", name: "常见疾病与治疗", qty: 8 },
      { id: "med-public", name: "营养与公共卫生", qty: 6 },
      { id: "med-tcm", name: "中医与传统医学", qty: 6 },
      { id: "med-history", name: "医学史与前沿", qty: 6 }
    ]
  },
  {
    id: "history", name: "历史", nameEn: "History",
    icon: "fa-solid fa-landmark", color: "#f59e0b", weight: 40,
    description: "中国古代史、世界古代中世纪、近现代史与历史人物考古。",
    subdomains: [
      { id: "his-china", name: "中国古代史", qty: 12 },
      { id: "his-ancient", name: "世界古代与中世纪史", qty: 8 },
      { id: "his-modern", name: "近现代史", qty: 12 },
      { id: "his-figure", name: "历史人物与考古", qty: 8 }
    ]
  },
  {
    id: "geocult", name: "地理与世界文化", nameEn: "Geography & World Cultures",
    icon: "fa-solid fa-globe", color: "#facc15", weight: 35,
    description: "中国地理、世界地理、国家与城市、文化与民俗。",
    subdomains: [
      { id: "geo-cn", name: "中国地理", qty: 9 },
      { id: "geo-world", name: "世界地理", qty: 9 },
      { id: "geo-city", name: "国家与城市", qty: 8 },
      { id: "geo-culture", name: "文化与民俗", qty: 9 }
    ]
  },
  {
    id: "polilaw", name: "政治与法律", nameEn: "Politics & Law",
    icon: "fa-solid fa-scale-balanced", color: "#ef4444", weight: 35,
    description: "中国政治与行政、国际政治、法学基础、法治与司法。",
    subdomains: [
      { id: "pol-cn", name: "中国政治与行政", qty: 10 },
      { id: "pol-intl", name: "国际政治", qty: 10 },
      { id: "law-base", name: "法学基础", qty: 9 },
      { id: "law-justice", name: "法治与司法", qty: 6 }
    ]
  },
  {
    id: "military", name: "军事与国防", nameEn: "Military & Defense",
    icon: "fa-solid fa-medal", color: "#7c8a9e", weight: 15,
    description: "军事历史、军种军衔、现代国防与装备。",
    subdomains: [
      { id: "mil-history", name: "军事历史", qty: 5 },
      { id: "mil-ranks", name: "军种与军衔", qty: 5 },
      { id: "mil-modern", name: "现代国防与装备", qty: 5 }
    ]
  },
  {
    id: "econ", name: "经济与金融", nameEn: "Economics & Finance",
    icon: "fa-solid fa-line-chart", color: "#10b981", weight: 33,
    description: "微观与宏观经济、金融投资、商业公司、会计财税、经济思想史。",
    subdomains: [
      { id: "eco-macro", name: "微观与宏观", qty: 10 },
      { id: "eco-finance", name: "金融与投资", qty: 10 },
      { id: "eco-business", name: "商业与公司", qty: 5 },
      { id: "eco-accounting", name: "会计与财税", qty: 3 },
      { id: "eco-thought", name: "经济思想史", qty: 5 }
    ]
  },
  {
    id: "education", name: "教育", nameEn: "Education",
    icon: "fa-solid fa-user-graduate", color: "#fb923c", weight: 15,
    description: "中外教育思想与人物、学制体系、科举与现代教育。",
    subdomains: [
      { id: "edu-thought", name: "中外教育思想与人物", qty: 5 },
      { id: "edu-system", name: "学制与体系", qty: 5 },
      { id: "edu-keju", name: "科举与现代教育", qty: 5 }
    ]
  },
  {
    id: "psychsoc", name: "心理学与社会学", nameEn: "Psychology & Sociology",
    icon: "fa-solid fa-puzzle-piece", color: "#38bdf8", weight: 25,
    description: "心理学基础、认知与行为、社会学经典理论与结构。",
    subdomains: [
      { id: "psy-base", name: "心理学基础", qty: 9 },
      { id: "psy-cognition", name: "认知与行为", qty: 8 },
      { id: "psy-society", name: "社会学", qty: 8 }
    ]
  },
  {
    id: "philrel", name: "哲学与宗教", nameEn: "Philosophy & Religion",
    icon: "fa-solid fa-brain", color: "#a855f7", weight: 25,
    description: "中国哲学、西方哲学、宗教、伦理与认识论。",
    subdomains: [
      { id: "phil-china", name: "中国哲学", qty: 7 },
      { id: "phil-west", name: "西方哲学", qty: 7 },
      { id: "phil-religion", name: "宗教", qty: 6 },
      { id: "phil-ethics", name: "伦理与逻辑哲学", qty: 5 }
    ]
  },
  {
    id: "langlit", name: "语言与文学", nameEn: "Language & Literature",
    icon: "fa-solid fa-book", color: "#ec4899", weight: 30,
    description: "汉语与汉字、中国文学、外国文学、世界语言。",
    subdomains: [
      { id: "lang-cn", name: "汉语与汉字", qty: 8 },
      { id: "lang-cnlit", name: "中国文学", qty: 8 },
      { id: "lang-foreign", name: "外国文学", qty: 8 },
      { id: "lang-world", name: "世界语言", qty: 6 }
    ]
  },
  {
    id: "art", name: "艺术", nameEn: "Arts",
    icon: "fa-solid fa-palette", color: "#e879f9", weight: 35,
    description: "美术、音乐、电影、戏剧表演、建筑与设计。",
    subdomains: [
      { id: "art-visual", name: "美术", qty: 9 },
      { id: "art-music", name: "音乐", qty: 9 },
      { id: "art-film", name: "电影", qty: 9 },
      { id: "art-theater", name: "戏剧与表演", qty: 4 },
      { id: "art-arch", name: "建筑与设计", qty: 4 }
    ]
  },
  {
    id: "popcult", name: "流行文化", nameEn: "Pop Culture",
    icon: "fa-solid fa-star", color: "#06b6d4", weight: 35,
    description: "动漫与漫画、游戏与电竞、影视流行文化、网络与迷因。",
    subdomains: [
      { id: "pop-anime", name: "动漫与漫画", qty: 12 },
      { id: "pop-game", name: "游戏与电竞", qty: 8 },
      { id: "pop-film", name: "影视流行文化", qty: 8 },
      { id: "pop-internet", name: "网络与迷因", qty: 7 }
    ]
  },
  {
    id: "sports", name: "体育", nameEn: "Sports",
    icon: "fa-solid fa-trophy", color: "#14b8a6", weight: 35,
    description: "足球、篮球、其他球类、田径奥运、运动常识、武术格斗、棋牌智力运动、赛车极限运动。",
    subdomains: [
      { id: "spt-football", name: "足球", qty: 8 },
      { id: "spt-basket", name: "篮球", qty: 6 },
      { id: "spt-racket", name: "其他球类", qty: 6 },
      { id: "spt-olympic", name: "田径与奥运", qty: 6 },
      { id: "spt-common", name: "运动常识", qty: 4 },
      { id: "spt-martial", name: "武术与格斗", qty: 2 },
      { id: "spt-board", name: "棋牌智力运动", qty: 2 },
      { id: "spt-racing", name: "赛车与极限运动", qty: 1 }
    ]
  },
  {
    id: "lifestyle", name: "生活方式", nameEn: "Lifestyle",
    icon: "fa-solid fa-cake-candles", color: "#a3e635", weight: 35,
    description: "烹饪烘焙、茶酒咖啡、时尚美容、健身户外、宠物园艺、育儿家庭、家居收纳。",
    subdomains: [
      { id: "life-cook", name: "烹饪与烘焙", qty: 8 },
      { id: "life-drink", name: "茶酒与咖啡", qty: 5 },
      { id: "life-fashion", name: "时尚与美容", qty: 5 },
      { id: "life-fitness", name: "健身与户外", qty: 4 },
      { id: "life-pet", name: "宠物与园艺", qty: 5 },
      { id: "life-family", name: "育儿与家庭", qty: 4 },
      { id: "life-home", name: "家居与收纳", qty: 4 }
    ]
  },
  {
    id: "media", name: "媒体与当代全球议题", nameEn: "Media & Global Issues",
    icon: "fa-solid fa-newspaper", color: "#64748b", weight: 15,
    description: "新闻媒体素养与稳定的当代全球性问题（气候、人口、能源、公共卫生等）。",
    subdomains: [
      { id: "med-news", name: "新闻与媒体", qty: 6 },
      { id: "med-global", name: "当代全球议题", qty: 9 }
    ]
  }
];

// 便捷工具：按 id 取领域
window.getDomain = function (id) {
  return window.KNOWLEDGE_DOMAINS.find(function (d) { return d.id === id; });
};

// 总题数
window.TOTAL_WEIGHT = window.KNOWLEDGE_DOMAINS.reduce(function (s, d) { return s + d.weight; }, 0);
