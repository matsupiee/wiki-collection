import type { Rarity } from "../enums";

// ストーリー確認用のサンプルデータ。要約は本アプリ用に書いた短い説明で、Wikipedia の本文ではない。
// 本番のカードは Wikipedia から取り込み、要約は CC BY-SA 4.0 として扱う

export const genres = [
  { slug: "space", name: "宇宙", sourceCategory: "天文学", colorHex: "#6366f1" },
  { slug: "history", name: "歴史", sourceCategory: "日本の歴史", colorHex: "#b45309" },
  { slug: "science", name: "科学", sourceCategory: "自然科学", colorHex: "#059669" },
  { slug: "sports", name: "スポーツ", sourceCategory: "スポーツ", colorHex: "#dc2626" },
  { slug: "culture", name: "文化", sourceCategory: "日本の文化", colorHex: "#db2777" },
  { slug: "geography", name: "地理", sourceCategory: "日本の地理", colorHex: "#0284c7" },
] as const;

type GenreSlug = (typeof genres)[number]["slug"];

// [ジャンル, タイトル, 月間閲覧数, 要約]
export const cards: [GenreSlug, string, number, string][] = [
  ["space", "太陽", 98000, "太陽系の中心にある恒星。地球に光と熱を届けている。"],
  ["space", "月", 120000, "地球のただ一つの衛星。満ち欠けを繰り返し、潮の満ち引きを起こす。"],
  [
    "space",
    "ブラックホール",
    210000,
    "重力が強すぎて光さえ抜け出せない天体。一般相対性理論が存在を予言した。",
  ],
  ["space", "火星", 64000, "赤く見える地球の外側の惑星。探査車が地表を調べ続けている。"],
  ["space", "土星", 41000, "大きな環を持つガス惑星。太陽系で2番目に大きい。"],
  [
    "space",
    "天の川銀河",
    23000,
    "太陽系を含む渦巻銀河。夜空に見える天の川はその円盤を内側から見た姿。",
  ],
  [
    "space",
    "国際宇宙ステーション",
    52000,
    "地球を周回する有人の実験施設。各国が共同で運用している。",
  ],
  ["space", "はやぶさ2", 18000, "小惑星リュウグウから試料を持ち帰った日本の探査機。"],
  ["space", "冥王星", 15000, "かつて第9惑星とされた準惑星。2006年に分類が変わった。"],
  ["space", "ビッグバン", 30000, "宇宙が高温高密度の状態から膨張して始まったとする理論。"],
  ["history", "織田信長", 260000, "戦国時代の武将。天下統一を進めたが本能寺の変で倒れた。"],
  ["history", "徳川家康", 190000, "江戸幕府を開いた武将。約260年続く江戸時代の基礎を築いた。"],
  ["history", "坂本龍馬", 110000, "幕末の志士。薩長同盟の仲立ちをしたと伝えられる。"],
  ["history", "関ヶ原の戦い", 72000, "1600年に東軍と西軍が争った合戦。徳川家の覇権を決定づけた。"],
  ["history", "聖徳太子", 58000, "飛鳥時代の政治家。冠位十二階や十七条憲法を定めたとされる。"],
  ["history", "明治維新", 47000, "江戸幕府が倒れ、近代国家へと移った一連の変革。"],
  ["history", "平安京", 21000, "794年に定められた都。現在の京都市の中心部にあたる。"],
  ["history", "卑弥呼", 39000, "邪馬台国を治めたと中国の史書に記された女王。"],
  ["history", "鎌倉幕府", 26000, "源頼朝が開いた武家政権。日本で最初の本格的な幕府。"],
  ["history", "縄文時代", 19000, "土器に縄目の模様をつけた時代。狩猟と採集を中心に暮らした。"],
  ["science", "DNA", 54000, "遺伝情報を運ぶ二重らせんの分子。"],
  [
    "science",
    "相対性理論",
    46000,
    "時間と空間が観測者によって変わることを示したアインシュタインの理論。",
  ],
  ["science", "周期表", 33000, "元素を原子番号順に並べ、性質の似たものを縦にそろえた表。"],
  ["science", "光合成", 28000, "植物が光のエネルギーで二酸化炭素と水から糖を作る反応。"],
  ["science", "量子力学", 37000, "原子より小さな世界のふるまいを説明する物理学の理論。"],
  ["science", "進化論", 22000, "生物は長い時間をかけて変化してきたとする考え。"],
  ["science", "電気", 12000, "電荷の移動や蓄積によって起こる現象の総称。"],
  ["science", "水", 16000, "水素と酸素からなる化合物。生命に欠かせない。"],
  ["science", "ワクチン", 44000, "病気への免疫をあらかじめ作るための医薬品。"],
  ["science", "人工知能", 150000, "人間の知的なふるまいを計算機で実現しようとする技術。"],
  [
    "sports",
    "サッカー",
    88000,
    "11人ずつの2チームが手を使わずにボールを相手のゴールへ入れ合う競技。",
  ],
  ["sports", "野球", 76000, "投手の投げた球を打ち、塁を回って得点を競う競技。"],
  ["sports", "大谷翔平", 320000, "投手と打者の両方で活躍する野球選手。"],
  ["sports", "オリンピック", 69000, "4年に1度開かれる国際的な総合競技大会。"],
  ["sports", "相撲", 35000, "土俵の上で2人の力士が組み合う日本の伝統的な競技。"],
  ["sports", "マラソン", 17000, "42.195km を走る陸上競技。"],
  ["sports", "柔道", 14000, "嘉納治五郎が創始した武道。投げ技と固め技で競う。"],
  ["sports", "テニス", 20000, "ネットをはさんでラケットでボールを打ち合う競技。"],
  ["sports", "ラグビー", 24000, "楕円形のボールを持って走り、パスは後ろにしか出せない競技。"],
  ["sports", "箱根駅伝", 29000, "毎年1月2日と3日に行われる大学の駅伝競走。"],
  ["culture", "寿司", 40000, "酢飯に魚介などを合わせた日本の料理。"],
  ["culture", "歌舞伎", 25000, "江戸時代に生まれた日本の伝統的な演劇。"],
  [
    "culture",
    "アニメ",
    95000,
    "絵を連続して映し、動いて見せる映像表現。日本の作品は世界で人気がある。",
  ],
  ["culture", "茶道", 11000, "湯を沸かし茶をたてて客をもてなす日本の伝統文化。"],
  ["culture", "俳句", 13000, "五・七・五の十七音で季節を詠む短い詩。"],
  ["culture", "浮世絵", 16000, "江戸時代に広まった木版画などの絵画。"],
  ["culture", "ラーメン", 34000, "中華麺をスープに入れた料理。地域ごとに味が違う。"],
  ["culture", "将棋", 31000, "9×9 の盤で駒を動かし、相手の玉を詰ませるボードゲーム。"],
  ["culture", "折り紙", 9000, "1枚の紙を折って形を作る遊び。"],
  ["culture", "和食", 12500, "日本の伝統的な食文化。ユネスコ無形文化遺産に登録された。"],
  ["geography", "富士山", 85000, "日本一高い山。標高3776m。世界文化遺産に登録されている。"],
  ["geography", "東京都", 140000, "日本の首都。人口が最も多い都道府県。"],
  ["geography", "琵琶湖", 18000, "滋賀県にある日本最大の湖。"],
  ["geography", "北海道", 66000, "日本の最も北にある島と、同名の都道府県。"],
  ["geography", "沖縄県", 48000, "日本の最も南西にある県。多くの島からなる。"],
  ["geography", "京都市", 42000, "千年以上都が置かれた都市。多くの寺社が残る。"],
  ["geography", "屋久島", 10000, "樹齢数千年の屋久杉が育つ鹿児島県の島。"],
  ["geography", "瀬戸内海", 9500, "本州・四国・九州に囲まれた内海。"],
  ["geography", "信濃川", 8000, "日本で最も長い川。長野県と新潟県を流れる。"],
  ["geography", "大阪市", 51000, "西日本の経済の中心都市。食い倒れの街とも呼ばれる。"],
];

// 月間閲覧数の順位でレアリティを決める。上位 1% がレジェンド、5% までがダブルレア、20% までがレア、50% までがアンコモン。
// カードが少ないときでも各レアリティに最低1枚は入るよう、枚数は1以上に切り上げる
export function rarityByRank(rankFromTop: number, total: number): Rarity {
  const limits: [Rarity, number][] = [
    ["legendary", 0.01],
    ["double_rare", 0.05],
    ["rare", 0.2],
    ["uncommon", 0.5],
  ];
  let count = 0;
  for (const [rarity, ratio] of limits) {
    count = Math.max(count + 1, Math.round(total * ratio));
    if (rankFromTop < count) return rarity;
  }
  return "common";
}

const commonOnly = { common: 10000, uncommon: 0, rare: 0, double_rare: 0, legendary: 0 };
export const slotRates: Record<"basic" | "genre", Record<Rarity, number>[]> = {
  basic: [
    commonOnly,
    commonOnly,
    commonOnly,
    { common: 0, uncommon: 8900, rare: 900, double_rare: 160, legendary: 40 },
    { common: 0, uncommon: 6000, rare: 3000, double_rare: 800, legendary: 200 },
  ],
  genre: [
    commonOnly,
    commonOnly,
    commonOnly,
    { common: 0, uncommon: 7000, rare: 2200, double_rare: 600, legendary: 200 },
    { common: 0, uncommon: 0, rare: 7000, double_rare: 2400, legendary: 600 },
  ],
};

export const packs = [
  {
    slug: "basic",
    name: "基本パック",
    description: "すべてのジャンルのカードが出る無料パック。",
    type: "free_basic" as const,
    genreSlug: null,
    priceCoins: null,
    colorHex: "#7c3aed",
    rates: "basic" as const,
    featured: [] as string[],
  },
  {
    slug: "space",
    name: "宇宙パック",
    description: "宇宙のカードだけが出る。ブラックホールと月が出やすい。",
    type: "premium" as const,
    genreSlug: "space",
    priceCoins: 150,
    colorHex: "#4f46e5",
    rates: "genre" as const,
    featured: ["ブラックホール", "月"],
  },
  {
    slug: "history",
    name: "歴史パック",
    description: "歴史のカードだけが出る。織田信長が出やすい。",
    type: "premium" as const,
    genreSlug: "history",
    priceCoins: 150,
    colorHex: "#b45309",
    rates: "genre" as const,
    featured: ["織田信長"],
  },
  {
    slug: "science",
    name: "科学パック",
    description: "科学のカードだけが出る。人工知能が出やすい。",
    type: "premium" as const,
    genreSlug: "science",
    priceCoins: 150,
    colorHex: "#047857",
    rates: "genre" as const,
    featured: ["人工知能"],
  },
];

export const coinProducts = [
  { sku: "coins_500", name: "500pt", priceAmount: 500, currency: "USD", coins: 500, sortOrder: 1 },
  {
    sku: "coins_1000",
    name: "1,000pt",
    priceAmount: 1000,
    currency: "USD",
    coins: 1000,
    sortOrder: 2,
  },
  {
    sku: "coins_5000",
    name: "5,000pt",
    priceAmount: 5000,
    currency: "USD",
    coins: 5000,
    sortOrder: 3,
  },
];
