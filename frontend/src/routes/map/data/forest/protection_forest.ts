/**
 * 保安林の種類
 *
 * 森林法第25条に基づき、水源の涵養、土砂災害の防備、生活環境の保全・形成等、
 * 特定の公益目的を達成するために農林水産大臣又は都道府県知事によって指定される森林
 *
 * @see https://www.rinya.maff.go.jp/j/tisan/tisan/con_2.html
 */

// =============================================================================
// 保安林種別コード
// =============================================================================

/**
 * 保安林種別コード（森林法第25条の号数に対応）
 */
export const ProtectionForestCode = {
  /** 1号：水源かん養保安林 */
  WATER_SOURCE: "01",
  /** 2号：土砂流出防備保安林 */
  SEDIMENT_OUTFLOW: "02",
  /** 3号：土砂崩壊防備保安林 */
  LANDSLIDE: "03",
  /** 4号-1：飛砂防備保安林 */
  SAND_DRIFT: "04-1",
  /** 4号-2：防風保安林 */
  WINDBREAK: "04-2",
  /** 4号-3：水害防備保安林 */
  FLOOD: "04-3",
  /** 4号-4：潮害防備保安林 */
  TIDAL: "04-4",
  /** 5号-1：干害防備保安林 */
  DROUGHT: "05-1",
  /** 5号-2：防雪保安林 */
  SNOW_DRIFT: "05-2",
  /** 5号-3：防霧保安林 */
  FOG: "05-3",
  /** 6号-1：なだれ防止保安林 */
  AVALANCHE: "06-1",
  /** 6号-2：落石防止保安林 */
  ROCKFALL: "06-2",
  /** 6号-3：防火保安林 */
  FIRE: "06-3",
  /** 7号：魚つき保安林 */
  FISH_BREEDING: "07",
  /** 8号：航行目標保安林 */
  NAVIGATION: "08",
  /** 9号：保健保安林 */
  HEALTH: "09",
  /** 10号：風致保安林 */
  SCENIC: "10",
} as const;

export type ProtectionForestCodeType =
  (typeof ProtectionForestCode)[keyof typeof ProtectionForestCode];

// =============================================================================
// 保安林カテゴリ
// =============================================================================

/**
 * 保安林の機能別カテゴリ
 */
export const ProtectionForestCategory = {
  /** 水源涵養 */
  WATER_CONSERVATION: "water_conservation",
  /** 災害防備 */
  DISASTER_PREVENTION: "disaster_prevention",
  /** 生活環境保全 */
  LIVING_ENVIRONMENT: "living_environment",
  /** 保健・風致 */
  HEALTH_SCENIC: "health_scenic",
} as const;

export type ProtectionForestCategoryType =
  (typeof ProtectionForestCategory)[keyof typeof ProtectionForestCategory];

// =============================================================================
// 保安林データ型定義
// =============================================================================

/**
 * 保安林種別の詳細情報
 */
export interface ProtectionForestType {
  /** 保安林種別コード */
  code: ProtectionForestCodeType;
  /** 森林法第25条の号数 */
  articleNumber: string;
  /** 正式名称 */
  name: string;
  /** 略称 */
  shortName: string;
  /** 英語名 */
  nameEn: string;
  /** 機能カテゴリ */
  category: ProtectionForestCategoryType;
  /** 指定目的 */
  purpose: string;
  /** 詳細説明 */
  description: string;
  /** 主な保全対象 */
  protectionTargets: string[];
  /** 治山事業の対象可否（1〜7号のみ対象） */
  eligibleForErosionControl: boolean;
  /** 重要流域における農林水産大臣指定対象（1〜3号のみ） */
  ministerDesignation: boolean;
}

// =============================================================================
// 保安林辞書データ
// =============================================================================

/**
 * 保安林17種類の辞書データ
 */
export const ProtectionForestTypes: Record<
  ProtectionForestCodeType,
  ProtectionForestType
> = {
  // ---------------------------------------------------------------------------
  // 1号：水源かん養保安林
  // ---------------------------------------------------------------------------
  "01": {
    code: "01",
    articleNumber: "1号",
    name: "水源かん養保安林",
    shortName: "水源",
    nameEn: "Water Source Conservation Forest",
    category: "water_conservation",
    purpose: "水源の涵養",
    description:
      "流域保全上重要な地域にある森林の河川への流量調節機能を高度に保ち、洪水を緩和したり、各種用水を確保したりする。別名「緑のダム」とも呼ばれ、降った雨を地中に蓄えゆっくりと川に流すことで、安定した水の確保と洪水・渇水の防止に効果を発揮する。",
    protectionTargets: ["河川流域", "水道水源", "農業用水", "工業用水"],
    eligibleForErosionControl: true,
    ministerDesignation: true,
  },

  // ---------------------------------------------------------------------------
  // 2号：土砂流出防備保安林
  // ---------------------------------------------------------------------------
  "02": {
    code: "02",
    articleNumber: "2号",
    name: "土砂流出防備保安林",
    shortName: "土流",
    nameEn: "Sediment Outflow Prevention Forest",
    category: "disaster_prevention",
    purpose: "土砂の流出の防備",
    description:
      "下流に重要な保全対象がある地域で土砂流出の著しい地域や崩壊・流出のおそれがある区域において、林木及び地表植生その他の地被物の直接間接の作用によって、林地の表面侵食及び崩壊による土砂の流出を防止する。",
    protectionTargets: ["下流集落", "農地", "道路", "河川"],
    eligibleForErosionControl: true,
    ministerDesignation: true,
  },

  // ---------------------------------------------------------------------------
  // 3号：土砂崩壊防備保安林
  // ---------------------------------------------------------------------------
  "03": {
    code: "03",
    articleNumber: "3号",
    name: "土砂崩壊防備保安林",
    shortName: "土崩",
    nameEn: "Landslide Prevention Forest",
    category: "disaster_prevention",
    purpose: "土砂の崩壊の防備",
    description:
      "崩落土砂による被害を受けやすい道路、鉄道その他の公共施設等の上方において、主として林木の根系の緊縛その他の物理的作用によって林地の崩壊の発生を防止する。樹木の根が山地をしっかりと固定し、山崩れから住宅や道路、鉄道などを守る。",
    protectionTargets: ["住宅", "道路", "鉄道", "公共施設"],
    eligibleForErosionControl: true,
    ministerDesignation: true,
  },

  // ---------------------------------------------------------------------------
  // 4号-1：飛砂防備保安林
  // ---------------------------------------------------------------------------
  "04-1": {
    code: "04-1",
    articleNumber: "4号",
    name: "飛砂防備保安林",
    shortName: "飛砂",
    nameEn: "Sand Drift Prevention Forest",
    category: "disaster_prevention",
    purpose: "飛砂の防備",
    description:
      "海岸の砂地を森林で被覆することにより飛砂の発生を防止し、飛砂が海岸から内陸に進入するのを遮断防止することにより、内陸部における土地の高度利用、住民の生活環境の保護を図る。",
    protectionTargets: ["海岸集落", "農地", "住宅地"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 4号-2：防風保安林
  // ---------------------------------------------------------------------------
  "04-2": {
    code: "04-2",
    articleNumber: "4号",
    name: "防風保安林",
    shortName: "防風",
    nameEn: "Windbreak Forest",
    category: "disaster_prevention",
    purpose: "風害の防備",
    description:
      "森林が壁の役割を果たし、強風による農作物、建物等への被害を防止する。風の強い地域で田畑や住宅を守る防風林として機能する。",
    protectionTargets: ["農地", "住宅", "果樹園", "畜産施設"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 4号-3：水害防備保安林
  // ---------------------------------------------------------------------------
  "04-3": {
    code: "04-3",
    articleNumber: "4号",
    name: "水害防備保安林",
    shortName: "水害",
    nameEn: "Flood Prevention Forest",
    category: "disaster_prevention",
    purpose: "水害の防備",
    description:
      "洪水時に氾濫する水流の勢いを弱め、漂流物による被害を防ぐ。また、樹木の根の働きにより河岸の浸食を防止する。",
    protectionTargets: ["河川沿い集落", "農地", "堤防"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 4号-4：潮害防備保安林
  // ---------------------------------------------------------------------------
  "04-4": {
    code: "04-4",
    articleNumber: "4号",
    name: "潮害防備保安林",
    shortName: "潮害",
    nameEn: "Tidal Damage Prevention Forest",
    category: "disaster_prevention",
    purpose: "潮害の防備",
    description:
      "津波や高潮の勢いを弱め、住宅などへの被害を防ぐ。また、海岸からの塩分を含んだ風を弱め、田畑への塩害などを防止する。",
    protectionTargets: ["海岸集落", "農地", "住宅"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 5号-1：干害防備保安林
  // ---------------------------------------------------------------------------
  "05-1": {
    code: "05-1",
    articleNumber: "5号",
    name: "干害防備保安林",
    shortName: "干害",
    nameEn: "Drought Prevention Forest",
    category: "water_conservation",
    purpose: "干害の防備",
    description:
      "洪水を緩和し、又は各種用水を確保する森林の水源涵養機能により、局所的な用水源を保護する。簡易水道など特定の水源を保全し、水が涸れるのを防ぎ、良質な水源を確保する。",
    protectionTargets: ["簡易水道", "農業用水", "生活用水"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 5号-2：防雪保安林
  // ---------------------------------------------------------------------------
  "05-2": {
    code: "05-2",
    articleNumber: "5号",
    name: "防雪保安林",
    shortName: "防雪",
    nameEn: "Snow Drift Prevention Forest",
    category: "disaster_prevention",
    purpose: "雪害の防備",
    description:
      "飛砂防備保安林や防風保安林と同様の機能によって吹雪（気象用語では「飛雪」）を防止する。森林が壁の役割を果たし、吹雪から道路や鉄道を守る。",
    protectionTargets: ["道路", "鉄道", "集落"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 5号-3：防霧保安林
  // ---------------------------------------------------------------------------
  "05-3": {
    code: "05-3",
    articleNumber: "5号",
    name: "防霧保安林",
    shortName: "防霧",
    nameEn: "Fog Prevention Forest",
    category: "living_environment",
    purpose: "霧害の防備",
    description:
      "森林によって空気の乱流を発生させて霧の移動を阻止したり、霧粒を捕捉したりすることで霧の害を防止する。農作物の被害を抑え、見通しをよくすることにより交通事故の発生を防ぐ。",
    protectionTargets: ["農地", "道路", "空港"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 6号-1：なだれ防止保安林
  // ---------------------------------------------------------------------------
  "06-1": {
    code: "06-1",
    articleNumber: "6号",
    name: "なだれ防止保安林",
    shortName: "なだれ",
    nameEn: "Avalanche Prevention Forest",
    category: "disaster_prevention",
    purpose: "なだれの危険の防止",
    description:
      "森林によって雪庇の発生や雪が滑り出すのを防いだり、雪の滑りの勢いを弱めたり、方向を変えたりすること等により雪崩を防止する。",
    protectionTargets: ["山間集落", "道路", "鉄道", "スキー場"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 6号-2：落石防止保安林
  // ---------------------------------------------------------------------------
  "06-2": {
    code: "06-2",
    articleNumber: "6号",
    name: "落石防止保安林",
    shortName: "落石",
    nameEn: "Rockfall Prevention Forest",
    category: "disaster_prevention",
    purpose: "落石の危険の防止",
    description:
      "林木の根系によって岩石を緊結固定して崩壊、転落を防止したり、転落する石塊を山腹で阻止したりすることで、落石による危険を防止する。",
    protectionTargets: ["道路", "鉄道", "住宅", "集落"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 6号-3：防火保安林
  // ---------------------------------------------------------------------------
  "06-3": {
    code: "06-3",
    articleNumber: "6号",
    name: "防火保安林",
    shortName: "防火",
    nameEn: "Fire Prevention Forest",
    category: "disaster_prevention",
    purpose: "火災の防備",
    description:
      "耐火樹又は防火樹からなる防火樹帯により火炎に対して障壁を作り、火災の延焼を防止する。燃えにくい種類の木を配置して火災から集落を守る。",
    protectionTargets: ["住宅地", "集落", "工場"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 7号：魚つき保安林
  // ---------------------------------------------------------------------------
  "07": {
    code: "07",
    articleNumber: "7号",
    name: "魚つき保安林",
    shortName: "魚つき",
    nameEn: "Fish Breeding Forest",
    category: "living_environment",
    purpose: "魚類の繁殖保護",
    description:
      "水面に対する森林の陰影の投影、魚類等に対する養分の供給、水質汚濁の防止等の作用により魚類の生息と繁殖を助ける。海や湖などに流れ込む水の汚濁を防ぎ、養分の豊かな水を供給する。",
    protectionTargets: ["漁場", "河川", "湖沼", "沿岸海域"],
    eligibleForErosionControl: true,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 8号：航行目標保安林
  // ---------------------------------------------------------------------------
  "08": {
    code: "08",
    articleNumber: "8号",
    name: "航行目標保安林",
    shortName: "航行",
    nameEn: "Navigation Landmark Forest",
    category: "living_environment",
    purpose: "航行の目標の保存",
    description:
      "海岸又は湖岸の付近にある森林で地理的目標に好適なものを、主として付近を航行する漁船等の目標とすることで、航行の安全を図る。",
    protectionTargets: ["漁船", "船舶"],
    eligibleForErosionControl: false,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 9号：保健保安林
  // ---------------------------------------------------------------------------
  "09": {
    code: "09",
    articleNumber: "9号",
    name: "保健保安林",
    shortName: "保健",
    nameEn: "Health and Recreation Forest",
    category: "health_scenic",
    purpose: "公衆の保健",
    description:
      "森林の持つレクリエーション等の保健、休養の場としての機能や、局所的な気象条件の緩和機能、じん埃、ばい煙等のろ過機能を発揮することにより、公衆の保健、衛生に貢献する。森林浴やハイキングなど森林レクリエーション活動の場として、生活にゆとりを提供する。",
    protectionTargets: ["都市近郊", "レクリエーション施設", "住宅地"],
    eligibleForErosionControl: false,
    ministerDesignation: false,
  },

  // ---------------------------------------------------------------------------
  // 10号：風致保安林
  // ---------------------------------------------------------------------------
  "10": {
    code: "10",
    articleNumber: "10号",
    name: "風致保安林",
    shortName: "風致",
    nameEn: "Scenic Forest",
    category: "health_scenic",
    purpose: "名所又は旧跡の風致の保存",
    description:
      "名所や旧跡等の趣のある景色が森林によって価値づけられている場合に、これを保存する。歴史的・文化的に重要な景観を守る。",
    protectionTargets: ["名所", "旧跡", "景勝地", "文化財周辺"],
    eligibleForErosionControl: false,
    ministerDesignation: false,
  },
};

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 保安林コードから詳細情報を取得
 */
export function getProtectionForestType(
  code: ProtectionForestCodeType
): ProtectionForestType {
  return ProtectionForestTypes[code];
}

/**
 * 保安林名称からコードを検索
 */
export function findProtectionForestByName(
  name: string
): ProtectionForestType | undefined {
  return Object.values(ProtectionForestTypes).find(
    (type) =>
      type.name === name ||
      type.shortName === name ||
      type.name.includes(name) ||
      name.includes(type.shortName)
  );
}

/**
 * カテゴリ別に保安林を取得
 */
export function getProtectionForestsByCategory(
  category: ProtectionForestCategoryType
): ProtectionForestType[] {
  return Object.values(ProtectionForestTypes).filter(
    (type) => type.category === category
  );
}

/**
 * 治山事業対象の保安林を取得（1〜7号）
 */
export function getErosionControlEligibleForests(): ProtectionForestType[] {
  return Object.values(ProtectionForestTypes).filter(
    (type) => type.eligibleForErosionControl
  );
}

/**
 * 農林水産大臣指定対象の保安林を取得（重要流域の1〜3号）
 */
export function getMinisterDesignationForests(): ProtectionForestType[] {
  return Object.values(ProtectionForestTypes).filter(
    (type) => type.ministerDesignation
  );
}

/**
 * 全保安林種別の一覧を取得
 */
export function getAllProtectionForestTypes(): ProtectionForestType[] {
  return Object.values(ProtectionForestTypes);
}

/**
 * 保安林種別名の配列を取得
 */
export function getProtectionForestNames(): string[] {
  return Object.values(ProtectionForestTypes).map((type) => type.name);
}

// =============================================================================
// カテゴリ名称
// =============================================================================

/**
 * カテゴリの日本語名称
 */
export const ProtectionForestCategoryNames: Record<
  ProtectionForestCategoryType,
  string
> = {
  water_conservation: "水源涵養",
  disaster_prevention: "災害防備",
  living_environment: "生活環境保全",
  health_scenic: "保健・風致",
};

// =============================================================================
// 統計情報（参考：令和4年3月31日現在の全国面積）
// =============================================================================

/**
 * 保安林種別ごとの全国指定面積（参考値、単位：ha）
 * ※ 実際のデータ利用時は最新の統計を参照してください
 */
export const ProtectionForestAreaReference: Partial<
  Record<ProtectionForestCodeType, number>
> = {
  "01": 6521931, // 水源かん養（全保安林の約67%）
  "02": 2140651, // 土砂流出防備（約22%）
  "03": 53117, // 土砂崩壊防備（約0.5%）
  "04-1": 15986, // 飛砂防備
  "04-2": 55499, // 防風
  "04-3": 683, // 水害防備
  "04-4": 13511, // 潮害防備
  "05-1": 87120, // 干害防備
  "05-2": 20, // 防雪
  "05-3": 59115, // 防霧
};
