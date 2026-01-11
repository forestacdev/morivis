/**
 * 森林情報に関するオープンデータ標準仕様書 Ver.2.0
 * 【航空レーザ森林資源解析データ編】令和7（2025）年7月版
 * https://fgis.jp/cloud
 */

// =============================================================================
// 共通コード定義
// =============================================================================

/**
 * 解析樹種ID（中樹種コード）
 * 都道府県森林資源情報（森林簿相当）の標準仕様「01~12 中樹種」に
 * 「96 針広混交林」「97 新植地」「98 伐採跡地」「99 その他」を追加
 */
export const AnalysisTreeSpeciesId = {
	/** スギ */
	SUGI: '01',
	/** ヒノキ類 */
	HINOKI: '02',
	/** マツ類 */
	MATSU: '03',
	/** カラマツ */
	KARAMATSU: '04',
	/** トドマツ */
	TODOMATSU: '05',
	/** エゾマツ */
	EZOMATSU: '06',
	/** その他N（針葉樹） - 細分の判読が困難な針葉樹のうち、針葉樹の割合が75%以上の林分 */
	OTHER_N: '07',
	/** クヌギ */
	KUNUGI: '08',
	/** ナラ類 */
	NARA: '09',
	/** ブナ */
	BUNA: '10',
	/** その他L（広葉樹） - 細分の判読が困難な広葉樹のうち、広葉樹の割合が75%以上の林分 */
	OTHER_L: '11',
	/** タケ */
	TAKE: '12',
	/** 針広混交林 - 針葉樹・広葉樹どちらも75%未満の林分 */
	MIXED: '96',
	/** 新植地 - 植林又は萌芽による更新が確認できるが、計測時点で樹種が判読できない場所 */
	NEW_PLANTATION: '97',
	/** 伐採跡地 - 主伐により樹冠占有面積割合が30%未満で、更新が確認できない場所 */
	LOGGED_AREA: '98',
	/** その他 - 林道、土場、水域等 */
	OTHER: '99'
} as const;

export type AnalysisTreeSpeciesIdType =
	(typeof AnalysisTreeSpeciesId)[keyof typeof AnalysisTreeSpeciesId];

/**
 * 解析樹種名称
 */
export const AnalysisTreeSpeciesName = {
	'01': 'スギ',
	'02': 'ヒノキ類',
	'03': 'マツ類',
	'04': 'カラマツ',
	'05': 'トドマツ',
	'06': 'エゾマツ',
	'07': 'その他Ｎ',
	'08': 'クヌギ',
	'09': 'ナラ類',
	'10': 'ブナ',
	'11': 'その他Ｌ',
	'12': 'タケ',
	'96': '針広混交林',
	'97': '新植地',
	'98': '伐採跡地',
	'99': 'その他'
} as const;

export type AnalysisTreeSpeciesNameType =
	(typeof AnalysisTreeSpeciesName)[AnalysisTreeSpeciesIdType];

/**
 * 森林計測法コード
 * 表層高（DSM）計測方法
 */
export const ForestMeasurementMethod = {
	/** 航空レーザ */
	AIRBORNE_LASER: '1',
	/** 航空写真 */
	AERIAL_PHOTO: '2',
	/** UAVレーザ */
	UAV_LASER: '3',
	/** UAV写真 */
	UAV_PHOTO: '4',
	/** 地上レーザ */
	TERRESTRIAL_LASER: '5'
} as const;

export type ForestMeasurementMethodType =
	(typeof ForestMeasurementMethod)[keyof typeof ForestMeasurementMethod];

/**
 * 森林計測法名称
 */
export const ForestMeasurementMethodName = {
	'1': '航空レーザ',
	'2': '航空写真',
	'3': 'UAVレーザ',
	'4': 'UAV写真',
	'5': '地上レーザ'
} as const;

// =============================================================================
// 樹種ポリゴン (Tree Species Polygon)
// =============================================================================

/**
 * 樹種ポリゴン属性
 *
 * リモートセンシング技術により判別可能な樹種及び土地被覆等を区分したベクタデータ
 * 同一樹種内の樹高等による区分は含まない
 *
 * ファイル形式: GeoPackage (.gpkg)
 * 提供単位: 市町村単位
 * ファイル名: tree_species_市町村コード_整備年西暦4桁.gpkg
 * 座標参照系: JGD2011/平面直角座標系
 */
export interface TreeSpeciesPolygonProperties {
	// -------------------------------------------------------------------------
	// 基本属性（●：必須）
	// -------------------------------------------------------------------------

	/**
	 * 解析樹種ID
	 * 標準仕様書で定める樹種コード番号（2桁）
	 * @example "01" (スギ), "02" (ヒノキ類)
	 */
	解析樹種ID: AnalysisTreeSpeciesIdType;

	/**
	 * 解析樹種
	 * 標準仕様書で定める樹種名称
	 * @maxLength 50
	 */
	解析樹種: AnalysisTreeSpeciesNameType;

	/**
	 * 樹種ID
	 * 各ユーザが任意に設定する樹種区分コード（5桁以内）
	 * 使用しない場合は空欄
	 * @maxLength 5
	 */
	樹種ID: string;

	/**
	 * 樹種
	 * 各ユーザが任意に設定する樹種区分名称
	 * 県が任意で設定した樹種名称が記載される
	 * @maxLength 50
	 */
	樹種: string;

	/**
	 * 面積（ヘクタール）
	 * 区画面積
	 * @precision 小数点以下4桁
	 */
	面積_ha: number;

	/**
	 * 森林計測年
	 * 表層高（DSM）データの計測年
	 * YYYY-MM-DD形式。計測月日が不明な場合は計測年の1月1日
	 * @example "2020-01-01"
	 */
	森林計測年: string;

	/**
	 * 森林計測法
	 * 表層高（DSM）計測方法コード（1桁）
	 */
	森林計測法: ForestMeasurementMethodType;

	/**
	 * 都道府県コード（2桁）
	 * @example "21" (岐阜県)
	 */
	県code: string;

	/**
	 * 市町村コード（5桁）
	 * @example "21201" (岐阜市)
	 */
	市町村code: string;
}

/**
 * 樹種ポリゴン GeoJSON Feature
 */
export interface TreeSpeciesPolygonFeature {
	type: 'Feature';
	geometry: {
		type: 'Polygon' | 'MultiPolygon';
		coordinates: number[][][] | number[][][][];
	};
	properties: TreeSpeciesPolygonProperties;
}

/**
 * 樹種ポリゴン GeoJSON FeatureCollection
 */
export interface TreeSpeciesPolygonCollection {
	type: 'FeatureCollection';
	features: TreeSpeciesPolygonFeature[];
}

// =============================================================================
// 森林資源量集計メッシュ (Forest Resource Mesh 20m)
// =============================================================================

/**
 * 森林資源量集計メッシュ属性
 *
 * 20mメッシュ単位で森林資源量を集計したベクタデータ
 * メッシュは平面直角座標系の各原点から20m正方格子で作成
 * 20mメッシュポリゴンはそれ以上細かく分割してはならない
 *
 * ファイル形式: GeoPackage (.gpkg)
 * 提供単位: 国土基本図図郭（地図情報レベル50000の図郭を4分割）
 * ファイル名: fr_mesh20m_国土基本図図郭分割番号_整備年西暦4桁.gpkg
 * 座標参照系: JGD2011/平面直角座標系
 */
export interface ForestResourceMesh20mProperties {
	// -------------------------------------------------------------------------
	// 基本属性（●：必須）
	// -------------------------------------------------------------------------

	/**
	 * Japan Forest 20mメッシュID
	 * 国土基本図図郭をベースとしたID
	 * 形式: 平面直角座標系(2桁) + 50000レベル図郭(2文字) + 5000レベル図郭(2桁) + 20mメッシュ位置(6桁)
	 * @example "09LD35149199"
	 */
	JF20mID: string;

	/**
	 * 解析樹種ID
	 * メッシュ内の最大面積を占める樹種を採用
	 */
	解析樹種ID: AnalysisTreeSpeciesIdType;

	/**
	 * 解析樹種
	 */
	解析樹種: AnalysisTreeSpeciesNameType;

	/**
	 * 樹種ID（任意設定）
	 * @maxLength 5
	 */
	樹種ID: string;

	/**
	 * 樹種（任意設定）
	 * @maxLength 50
	 */
	樹種: string;

	/**
	 * 面積（ヘクタール）
	 * @precision 小数点以下4桁
	 */
	面積_ha: number;

	/**
	 * 立木本数（本）
	 * メッシュ内に含まれる単木ポイント数
	 * 異なる樹種が混交した場合も全ての立木を同一樹種として計上
	 */
	立木本数: number;

	/**
	 * 立木密度（本/ha）
	 */
	立木密度: number;

	/**
	 * 平均樹高（m）
	 * @precision 小数点以下1桁
	 */
	平均樹高: number;

	/**
	 * 平均直径（cm）
	 * 胸高直径の平均
	 * @precision 小数点以下1桁
	 */
	平均直径: number;

	/**
	 * 合計材積（m³）
	 * @precision 小数点以下3桁
	 */
	合計材積: number;

	/**
	 * ha材積（m³/ha）
	 * ヘクタールあたり材積
	 */
	ha材積: number;

	/**
	 * 収量比数
	 * 間伐の指標。林分の混み具合を示す
	 * @precision 小数点以下2桁
	 */
	収量比数: number;

	/**
	 * 相対幹距比（%）
	 * 間伐の指標。立木密度と樹高から算出
	 * @precision 小数点以下1桁
	 */
	相対幹距比: number;

	/**
	 * 森林計測年
	 * 使用した表層高データの計測年
	 */
	森林計測年: string;

	/**
	 * 森林計測法
	 */
	森林計測法: ForestMeasurementMethodType;

	/**
	 * 都道府県コード（2桁）
	 * メッシュ中心点に基づいて機械的に付番
	 */
	県code: string;

	/**
	 * 市町村コード（5桁）
	 * メッシュ中心点に基づいて機械的に付番
	 */
	市町村code: string;

	// -------------------------------------------------------------------------
	// 推奨属性（○：推奨）
	// -------------------------------------------------------------------------

	/**
	 * 形状比
	 * 樹高÷胸高直径 の比率。立木の安定性指標
	 * @precision 小数点以下1桁
	 */
	形状比?: number;

	/**
	 * 樹冠長率（%）
	 * 間伐の指標。樹高に対する樹冠長の割合
	 * (レーザ点群から推定した樹冠長÷樹高×100)
	 */
	樹冠長率?: number;

	/**
	 * 平均傾斜（度）
	 * メッシュ内の平均傾斜角
	 */
	平均傾斜?: number;

	/**
	 * 最大傾斜（度）
	 */
	最大傾斜?: number;

	/**
	 * 最小傾斜（度）
	 */
	最小傾斜?: number;

	/**
	 * 最頻傾斜（度）
	 * メッシュ内で最も頻度が高い傾斜角
	 */
	最頻傾斜?: number;
}

/**
 * 森林資源量集計メッシュ GeoJSON Feature
 */
export interface ForestResourceMesh20mFeature {
	type: 'Feature';
	geometry: {
		type: 'Polygon';
		/** 20m × 20m の正方形メッシュ */
		coordinates: number[][][];
	};
	properties: ForestResourceMesh20mProperties;
}

/**
 * 森林資源量集計メッシュ GeoJSON FeatureCollection
 */
export interface ForestResourceMesh20mCollection {
	type: 'FeatureCollection';
	features: ForestResourceMesh20mFeature[];
}

// =============================================================================
// ベクトルタイル用型定義
// =============================================================================

/**
 * 樹種ポリゴン ベクトルタイル設定
 * ズームレベル: 8～18
 * 座標参照系: EPSG:3857 (Web メルカトル)
 * URL形式: tree_species_都道府県コード2桁_整備年西暦4桁/{z}/{x}/{y}.pbf
 */
export interface TreeSpeciesVectorTileConfig {
	/** ベクトルタイルURL */
	url: string;
	/** 最小ズームレベル */
	minZoom: 8;
	/** 最大ズームレベル */
	maxZoom: 18;
	/** ソースレイヤー名 */
	sourceLayer: string;
}

/**
 * 森林資源量集計メッシュ ベクトルタイル設定
 * ズームレベル: 13～16
 * 座標参照系: EPSG:3857 (Web メルカトル)
 * URL形式: fr_mesh20m_都道府県コード2桁_整備年西暦4桁/{z}/{x}/{y}.pbf
 */
export interface ForestResourceMeshVectorTileConfig {
	/** ベクトルタイルURL */
	url: string;
	/** 最小ズームレベル */
	minZoom: 13;
	/** 最大ズームレベル */
	maxZoom: 16;
	/** ソースレイヤー名 */
	sourceLayer: string;
}

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * 樹種IDから樹種名を取得
 */
export function getTreeSpeciesName(id: AnalysisTreeSpeciesIdType): AnalysisTreeSpeciesNameType {
	return AnalysisTreeSpeciesName[id];
}

/**
 * 計測法IDから計測法名を取得
 */
export function getMeasurementMethodName(code: ForestMeasurementMethodType): string {
	return ForestMeasurementMethodName[code];
}
