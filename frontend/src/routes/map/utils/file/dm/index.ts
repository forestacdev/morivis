/**
 * DM（数値地形図データ）→ GeoJSON 変換
 *
 * ※正確とは限らないため、実装の際には公式仕様書や実データを参照してください。
 *
 * 仕様: 国土交通省公共測量作業規程 作業規程の準則 付録7 公共測量標準図式
 *       数値地形図データファイル仕様
 *
 * 基本仕様:
 *   - 固定長 84バイト/レコード（Shift-JIS エンコーディング、改行 CR+LF）
 *   - 座標系: 平面直角座標系（X=北方向, Y=東方向）→ WGS84経緯度に変換が必要
 *   - 系番号: 1〜19（日本全国を19の系に分割、測量法施行令 第2条）
 *   - 地図情報レベル 500/1000: 座標単位mm, 2500/5000: cm, 10000: m
 *
 * レコード種別（先頭2バイトで識別）:
 *   共通: M (図郭), H (グループヘッダ)
 *   旧DM: I (インデックス), F (要素), D2 (2D座標), D3 (3D座標), L (注記)
 *   拡張DM: E1〜E7 (要素), 座標レコード(プレフィックスなし)
 *   その他: P (グリッドヘッダ), Q (TINヘッダ), A (属性), G (グリッド), T (TIN)
 *
 * 参考資料:
 *   - 公共測量 作業規程の準則 付録7「公共測量標準図式」
 *     https://psgsv2.gsi.go.jp/koukyou/jyunsoku/index.html
 *   - PLATEAU GML Common_dmCode.xml
 *     https://www.geospatial.jp/iur/codelists/3.2/Common_dmCode.xml
 *   - DMデータの仕様
 *     https://takamoto.biz/2020/06/都市計画ｇｉｓの構築２−dmデータの仕様/
 *   - 数値地形図データファイル仕様（林野庁）
 *     https://www.rinya.maff.go.jp/kanto/apply/publicsale/kanri/pdf/furoku8-1.pdf
 */

import type { FeatureCollection } from 'geojson';

// ============================================================
// 型定義
// ============================================================

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint';

export interface DMFeature {
	type: 'Feature';
	geometry: {
		type: GeometryType;
		coordinates: number[] | number[][] | number[][][];
	};
	properties: {
		classCode: string; // 分類コード (例: "2101"=真幅道路, "3001"=普通建物)
		className: string; // 分類名 (例: "建物")
		dataType: string; // データタイプ (面/線/点/注記/etc.)
		elementId: number; // 要素識別番号
		layer: string; // レイヤコード
		mapLevel: number; // 地図情報レベル
		drawingId: string; // 図郭識別番号
		[key: string]: unknown;
	};
}

export interface DMGeoJSON {
	type: 'FeatureCollection';
	features: DMFeature[];
	properties?: {
		coordinateSystem: number; // 平面直角座標系 系番号
		epsgCode: number; // EPSG コード (6668 + 系番号)
		planningOrganization: string;
		mapLevel: number;
	};
}

// ============================================================
// 分類コード → 分類名 マッピング
// 公共測量標準図式 数値地形図データ取得分類基準表より
// (PLATEAU GML Common_dmCode.xml 準拠)
//
// コード体系: 4桁 = レイヤ番号(2桁) + データ項目(2桁)
//   11xx: 境界・所属界(都府県界,郡市界,町村界,大字界)
//   21xx: 道路(真幅道路,徒歩道,庭園路)  22xx: 道路施設(道路橋,歩道,石段,トンネル)
//   23xx: 鉄道(普通鉄道,路面電車)        24xx: 鉄道施設(鉄道橋,跨線橋,停留所)
//   30xx: 建物(普通建物,堅ろう建物,無壁舎)
//   34xx-35xx: 建物付属物・記号(門,官公署,学校,病院,工場等)
//   42xx: 小物体(墓碑,鳥居,タンク,煙突,灯台,送電線等)
//   51xx: 水部(水がい線,一条河川,かれ川,用水路,湖池)
//   52xx: 水部構造物(桟橋,滝,せき,水門)
//   61xx: 人工斜面・構囲(人工斜面,土堤,かき,へい)
//   62xx: 諸地・場地(駐車場,墓地,太陽光発電設備)
//   63xx: 植生・耕地(田,畑,茶畑,果樹園,広葉樹林,竹林等)
//   65xx: 場地（拡張）     71xx: 等高線・変形地  72xx: 変形地
//   73xx: 基準点・標高点   81xx: 注記
// ============================================================

const CLASS_CODE_MAP: Record<string, string> = {
	// ---- 11xx: 境界・所属界 ----
	'1100': '境界',
	'1101': '都府県界',
	'1102': '北海道の支庁界',
	'1103': '郡市・東京都の区界',
	'1104': '町村・指定都市の区界',
	'1106': '大字・町（丁）界',
	'1110': '所属界',

	// ---- 21xx: 道路 ----
	'2100': '道路',
	'2101': '真幅道路',
	'2103': '徒歩道',
	'2106': '庭園路',
	'2109': '建設中の道路',

	// ---- 22xx: 道路施設 ----
	'2200': '道路施設',
	'2203': '道路橋',
	'2205': '徒橋',
	'2211': '横断歩道橋',
	'2213': '歩道',
	'2214': '石段',
	'2215': '地下街・地下鉄等出入口',
	'2219': '道路のトンネル',
	'2226': '分離帯',
	'2228': '道路の雪覆い等',
	'2238': '並木',

	// ---- 23xx: 鉄道 ----
	'2300': '鉄道',
	'2301': '普通鉄道',
	'2303': '路面電車',
	'2305': '特殊鉄道',
	'2306': '索道',
	'2309': '建設中の鉄道',

	// ---- 24xx: 鉄道施設 ----
	'2400': '鉄道施設',
	'2401': '鉄道橋',
	'2411': '跨線橋',
	'2419': '鉄道のトンネル',
	'2421': '停留所',
	'2424': 'プラットホーム',
	'2428': '鉄道の雪覆い等',

	// ---- 30xx: 建物 ----
	'3000': '建物（未分類）',
	'3001': '普通建物',
	'3002': '堅ろう建物',
	'3003': '普通無壁舎',
	'3004': '堅ろう無壁舎',

	// ---- 34xx: 建物付属物 ----
	'3400': '建物付属物',
	'3401': '門',
	'3402': '屋門',

	// ---- 35xx: 建物記号 ----
	'3500': '建物記号',
	'3503': '官公署',
	'3504': '裁判所',
	'3505': '検察庁',
	'3507': '税務署',
	'3509': '郵便局',
	'3510': '森林管理署',
	'3515': '交番・駐在所',
	'3516': '消防署',
	'3517': '職業安定所',
	'3519': '役場支所及び出張所',
	'3521': '神社',
	'3522': '寺院',
	'3523': 'キリスト教会',
	'3524': '学校',
	'3525': '幼稚園・保育園',
	'3526': '公会堂・公民館',
	'3530': '老人ホーム',
	'3531': '保健所',
	'3532': '病院',
	'3534': '銀行',
	'3536': '協同組合',
	'3545': '倉庫',
	'3546': '火薬庫',
	'3548': '工場',
	'3550': '変電所',
	'3556': '揚排水ポンプ場',
	'3560': 'ガソリンスタンド',

	// ---- 42xx: 小物体 ----
	'4200': '小物体',
	'4201': '墓碑',
	'4202': '記念碑',
	'4203': '立像',
	'4204': '路傍祠',
	'4205': '灯ろう',
	'4207': '鳥居',
	'4208': '自然災害伝承碑',
	'4219': '坑口',
	'4221': '独立樹（広葉樹）',
	'4222': '独立樹（針葉樹）',
	'4225': '油井・ガス井',
	'4228': '起重機',
	'4231': 'タンク',
	'4234': '煙突',
	'4235': '高塔',
	'4236': '電波塔',
	'4241': '灯台',
	'4243': '灯標',
	'4251': '水位観測所',
	'4261': '輸送管（地上）',
	'4262': '輸送管（空間）',
	'4265': '送電線',

	// ---- 51xx: 水部 ----
	'5100': '水部',
	'5101': '水がい線（河川・湖池・海岸線）',
	'5102': '一条河川',
	'5103': 'かれ川',
	'5104': '用水路',
	'5105': '湖池',

	// ---- 52xx: 水部構造物 ----
	'5200': '水部構造物',
	'5203': '桟橋（木製・浮桟橋）',
	'5221': '渡船発着所',
	'5226': '滝',
	'5227': 'せき',
	'5228': '水門',
	'5232': '透過水制',
	'5239': '敷石斜坂',
	'5241': '流水方向',
	'5299': '桟橋（鉄・コンクリート）',

	// ---- 61xx: 人工斜面・構囲 ----
	'6100': '人工斜面・構囲',
	'6101': '人工斜面',
	'6102': '土堤等',
	'6110': '被覆',
	'6130': 'かき',
	'6140': 'へい',

	// ---- 62xx: 諸地・場地 ----
	'6200': '諸地・場地',
	'6201': '区域界',
	'6212': '駐車場',
	'6214': '園庭',
	'6215': '墓地',
	'6216': '材料置場',
	'6217': '太陽光発電設備',
	'6221': '噴火口・噴気口',
	'6222': '温泉・鉱泉',

	// ---- 63xx: 植生・耕地 ----
	'6300': '植生・耕地',
	'6301': '植生界',
	'6302': '耕地界',
	'6311': '田',
	'6313': '畑',
	'6314': 'さとうきび畑',
	'6315': 'パイナップル畑',
	'6317': '桑畑',
	'6318': '茶畑',
	'6319': '果樹園',
	'6321': 'その他の樹木畑',
	'6323': '芝地',
	'6331': '広葉樹林',
	'6332': '針葉樹林',
	'6333': '竹林',
	'6334': '荒地',
	'6335': 'はい松地',
	'6336': 'しの地（笹地）',
	'6337': 'やし科樹林',
	'6338': '湿地',
	'6340': '砂れき地',

	// ---- 71xx: 等高線 ----
	'7100': '等高線',
	'7101': '等高線（計曲線）',
	'7102': '等高線（主曲線）',
	'7103': '等高線（補助曲線）',
	'7105': '凹地（計曲線）',
	'7106': '凹地（主曲線）',
	'7107': '凹地（補助曲線）',
	'7199': '凹地（矢印）',

	// ---- 72xx: 変形地 ----
	'7200': '変形地',
	'7201': '土がけ',
	'7202': '雨裂',
	'7206': '洞口',
	'7211': '岩がけ',
	'7212': '露岩',
	'7213': '散岩',
	'7214': 'さんご礁',

	// ---- 73xx: 基準点・標高点 ----
	'7300': '基準点',
	'7301': '三角点',
	'7302': '水準点',
	'7303': '多角点等',
	'7304': '公共基準点（三角点）',
	'7305': '公共基準点（水準点）',
	'7308': '電子基準点',
	'7311': '標石を有しない標高点',
	'7312': '図化機測定による標高点',

	// ---- 81xx: 注記 ----
	'8100': '注記',
	'8110': '市・東京都の区',
	'8111': '町・村・指定都市の区',
	'8112': '市町村の飛び地',
	'8113': '大区域',
	'8114': '小区域',
	'8115': '大字・町・丁目',
	'8116': '小字・丁目',
	'8117': 'その他の地名（大）',
	'8118': 'その他の地名（中）',
	'8119': 'その他の地名（小）',
	'8121': '道路の路線名',
	'8122': '道路施設・坂・峠・IC',
	'8123': '鉄道の路線名',
	'8124': '鉄道施設・駅・操車場・信号所',
	'8125': '橋',
	'8126': 'トンネル',
	'8131': '建物の名称',
	'8134': '建物の付属物',
	'8140': 'マンホール',
	'8141': '電柱',
	'8142': 'その他小物体',
	'8151': '水部',
	'8152': '水部施設',
	'8153': '地下水部',
	'8161': '法面・構囲',
	'8162': '諸地・場地',
	'8163': '植生',
	'8171': '山地',
	'8173': '標高注記',
	'8181': '説明注記',
	'8199': '指示点'
};

function getClassName(classCode: string): string {
	// 下2桁が00の場合は大分類
	return CLASS_CODE_MAP[classCode] ?? CLASS_CODE_MAP[classCode.slice(0, 2) + '00'] ?? '不明';
}

// ============================================================
// 座標単位変換: レコードから読んだ整数値 → メートル
// ============================================================

function toMeters(rawValue: number, mapLevel: number): number {
	if (mapLevel <= 1000) {
		// mm単位
		return rawValue / 1000;
	} else if (mapLevel <= 5000) {
		// cm単位
		return rawValue / 100;
	} else {
		// m単位
		return rawValue;
	}
}

// ============================================================
// テキスト行パーサー群
// ============================================================

// 行を固定位置でパース (1-indexed, bytes)
function substr(line: string, start: number, length: number): string {
	return line.substring(start - 1, start - 1 + length).trim();
}

function parseIntField(line: string, start: number, length: number): number {
	return parseInt(substr(line, start, length), 10) || 0;
}

interface IndexRecord {
	type: 'INDEX';
	coordSystem: number;
	planningOrg: string;
	drawingCount: number;
	drawingIdRecordCount: number;
	classCodeCount: number;
	version: number;
}

interface DrawingRecord {
	type: 'DRAWING';
	drawingId: string;
	drawingName: string;
	mapLevel: number;
	title: string;
	originX: number; // m
	originY: number; // m
	topRightX: number; // m (右上X座標、0の場合は未取得)
	topRightY: number; // m (右上Y座標、0の場合は未取得)
	coordUnit: number; // 座標値単位 (1=mm, 10=cm, 1000=m)
	version: number;
}

interface GroupHeaderRecord {
	type: 'GROUP_HEADER';
	classCode: string;
	elementId: number;
	hierarchyLevel: number;
	dataCount: {
		total: number;
		polygon: number;
		line: number;
		point: number;
		annotation: number;
	};
}

interface ElementRecord {
	type: 'ELEMENT';
	classCode: string;
	dataType: string; // "面" | "線" | "点" | "注記" | "円" | "円弧" | "方向"
	elementId: number;
	coordinateCount: number;
	is3D?: boolean; // 拡張DM: 座標次元が3Dかどうか
}

interface CoordRecord2D {
	type: 'COORD2D';
	coordinates: Array<[number, number]>; // [X, Y] 平面直角座標 (raw整数)
}

interface CoordRecord3D {
	type: 'COORD3D';
	coordinates: Array<[number, number, number]>;
}

interface AnnotationRecord {
	type: 'ANNOTATION';
	text: string;
	x: number;
	y: number;
	angle: number; // デシ度
	height: number; // 文字高さ (raw整数)
}

type ParsedRecord =
	| IndexRecord
	| DrawingRecord
	| GroupHeaderRecord
	| ElementRecord
	| CoordRecord2D
	| CoordRecord3D
	| AnnotationRecord
	| { type: 'UNKNOWN'; raw: string };

// ============================================================
// 各レコードのパーサー
// ============================================================

function parseIndexRecord(line: string): IndexRecord {
	// バイト位置は仕様書の図に基づく
	// [1-2] "I " 固定
	// [3-4] 座標系番号 I2
	// [5-34] 計画機関名 A30
	// [35-38] 図郭数 I4
	// [39-42] 図郭識別番号レコード数 I4
	// [43-44] 使用分類コード数 I2(or I3)
	// [45] 転位処理フラグ I1
	// [46] 間断処理フラグ I1
	// [47-50] 西暦年号 I4
	// [51-80] 作業規程名 A30
	// [81] バージョン I1
	// [82] 空き領域区分 I1
	return {
		type: 'INDEX',
		coordSystem: parseIntField(line, 3, 2),
		planningOrg: substr(line, 5, 30),
		drawingCount: parseIntField(line, 35, 4),
		drawingIdRecordCount: parseIntField(line, 39, 4),
		classCodeCount: parseIntField(line, 43, 3),
		version: parseIntField(line, 81, 1)
	};
}

function parseDrawingRecord(line: string): DrawingRecord {
	// レコード(a): "M " + 図郭識別番号(A8) + 図郭名称(A20) + 地図情報レベル(I5) + ...
	// [1-2] "M " 固定
	// [3-10] 図郭識別番号 A8
	// [11-30] 図郭名称 A20
	// [31-35] 地図情報レベル I5
	// [36-65] タイトル名 A30 (実際は省略されることも多い)
	// [66-67] 修正回数 I2
	// [68] バージョン I1
	// [69] 空き領域区分 I1
	return {
		type: 'DRAWING',
		drawingId: substr(line, 3, 8),
		drawingName: substr(line, 11, 20),
		mapLevel: parseIntField(line, 31, 5),
		title: substr(line, 36, 30),
		originX: 0,
		originY: 0,
		topRightX: 0,
		topRightY: 0,
		coordUnit: 0,
		version: parseIntField(line, 68, 1)
	};
}

// M レコード直後の図郭座標行から左下座標・右上座標・座標値単位を取得する。
// 拡張DMの付属行には旧DMの "MB" プレフィックスがないため、フィールド位置が異なる。
//
// 旧DM (MBレコード):
//   [1-2]"MB" [3-9]左下X(m) [10-16]左下Y(m) [17-19]座標値単位
//   [20-26]要素数 [27-32]レコード数 [33-39]右上X(m) [40-46]右上Y(m)
//
// 拡張DM (M直後の付属行):
//   [1-7]左下X(m) [8-14]左下Y(m) [15-21]右上X(m) [22-28]右上Y(m)
//   ... [45-47]座標値単位
//   ※拡張DMでは左下座標の直後に右上座標が続き、座標値単位は[45-47]に位置する
//
// 座標値単位と除算器(coordUnitDivisor)の対応:
//   1(mm)→1000, 10(cm)→100, 1000(m)→1
//   取得できない場合は mapLevel から推定するフォールバックが適用される

function parseDrawingCoordRecord(line: string): {
	originX: number;
	originY: number;
	topRightX: number;
	topRightY: number;
} {
	// レコード(b): 図郭座標
	// [3-9]  左下X I7  [10-16] 左下Y I7  [17-19] 座標値単位 I3
	// [20-26] 要素数  [27-32] レコード数  [33-39] 右上X I7  [40-46] 右上Y I7
	return {
		originX: parseIntField(line, 3, 7),
		originY: parseIntField(line, 10, 7),
		topRightX: parseIntField(line, 33, 7),
		topRightY: parseIntField(line, 40, 7)
	};
}

function parseGroupHeaderRecord(line: string): GroupHeaderRecord {
	// [1-2] "H " 固定
	// [3-4] 地図分類コード A2
	// [5-8] 分類コード A4 (上2桁+下2桁)
	// [9-12] 地域分類コード A4
	// [13-16] 情報分類コード A4
	// [17-20] 要素識別番号 I4
	// [21] 階層レベル I1
	// [22-25] 総数 I4  [26-29] グループ数 I4  [30-33] 面 I4  [34-37] 線 I4
	// [38-41] 円 I4  [42-45] 円弧 I4  [46-49] 点 I4  [50-53] 方向 I4
	// [54-57] 注記 I4  [58-61] 属性 I4  [62-65] グリッド・TIN I4
	const classMap = substr(line, 3, 2);
	const classItem = substr(line, 5, 4);
	const classCode =
		classMap.replace(/\s/g, '0').padStart(2, '0') + classItem.replace(/\s/g, '0').padStart(2, '0');

	return {
		type: 'GROUP_HEADER',
		classCode,
		elementId: parseIntField(line, 17, 4),
		hierarchyLevel: parseIntField(line, 21, 1),
		dataCount: {
			total: parseIntField(line, 22, 4),
			polygon: parseIntField(line, 30, 4),
			line: parseIntField(line, 34, 4),
			point: parseIntField(line, 46, 4),
			annotation: parseIntField(line, 54, 4)
		}
	};
}

// データタイプコード → 日本語
const DATA_TYPE_MAP: Record<string, string> = {
	'0': '未定義',
	'1': '面',
	'2': '線',
	'3': '円',
	'4': '円弧',
	'5': '点',
	'6': '方向',
	'7': '注記',
	'8': '属性',
	'9': 'グリッド/TIN'
};

function parseElementRecord(line: string): ElementRecord {
	// [1-2] "F " 固定
	// [3-4] 地図分類コード A2
	// [5-8] 分類コード A4
	// [9-16] 要素識別番号 I8 (一部仕様では I4)
	// [17] データタイプ I1
	// [18] 実データ区分 I1
	// [19] 精度区分 I1
	// [20-23] 間断区分 I4
	// [24-27] 転位区分 I4
	// [28-31] 取得年月 A4
	// [32] データ取得区分 I1
	// [33-36] 座標数 I4
	const classMap = substr(line, 3, 2);
	const classItem = substr(line, 5, 4);
	const classCode =
		classMap.replace(/\s/g, '0').padStart(2, '0') + classItem.replace(/\s/g, '0').padStart(2, '0');

	const dataTypeCode = substr(line, 17, 1);

	return {
		type: 'ELEMENT',
		classCode,
		dataType: DATA_TYPE_MAP[dataTypeCode] ?? '不明',
		elementId: parseIntField(line, 9, 8),
		coordinateCount: parseIntField(line, 33, 4)
	};
}

function parseCoord2DRecord(line: string): CoordRecord2D {
	// [1-2] "D2" 固定 (または旧DMでは省略される場合も)
	// [3-12]  X1 I10  [13-22] Y1 I10
	// [23-32] X2 I10  [33-42] Y2 I10
	// [43-52] X3 I10  [53-62] Y3 I10
	// [63-72] X4 I10  [73-82] Y4 I10
	// → 1レコードに最大4点。座標数は要素レコードから取得
	const coords: Array<[number, number]> = [];
	for (let i = 0; i < 4; i++) {
		const start = 3 + i * 20;
		const xStr = line.substring(start - 1, start + 9).trim();
		const yStr = line.substring(start + 9, start + 19).trim();
		if (xStr === '' || xStr === '0000000000') break;
		const x = parseInt(xStr, 10);
		const y = parseInt(yStr, 10);
		if (!isNaN(x) && !isNaN(y)) {
			coords.push([x, y]);
		}
	}
	return { type: 'COORD2D', coordinates: coords };
}

function parseCoord3DRecord(line: string): CoordRecord3D {
	// [3-12] X I10  [13-22] Y I10  [23-32] Z I10 → 1レコードに最大2点
	const coords: Array<[number, number, number]> = [];
	for (let i = 0; i < 2; i++) {
		const start = 3 + i * 30;
		const xStr = line.substring(start - 1, start + 9).trim();
		const yStr = line.substring(start + 9, start + 19).trim();
		const zStr = line.substring(start + 19, start + 29).trim();
		if (xStr === '') break;
		const x = parseInt(xStr, 10);
		const y = parseInt(yStr, 10);
		const z = parseInt(zStr, 10);
		if (!isNaN(x) && !isNaN(y)) {
			coords.push([x, y, isNaN(z) ? 0 : z]);
		}
	}
	return { type: 'COORD3D', coordinates: coords };
}

function parseAnnotationRecord(line: string): AnnotationRecord {
	// [3-12] X I10  [13-22] Y I10  [23-26] 角度 I4 (デシ度)
	// [27-30] 文字高さ I4  [31-84] テキスト A54
	return {
		type: 'ANNOTATION',
		x: parseIntField(line, 3, 10),
		y: parseIntField(line, 13, 10),
		angle: parseIntField(line, 23, 4),
		height: parseIntField(line, 27, 4),
		text: substr(line, 31, 54)
	};
}

// ============================================================
// 拡張DM パーサー群
// ============================================================

// 拡張DM データタイプ (Eレコード pos 2)
const EXT_DATA_TYPE_MAP: Record<string, string> = {
	'1': '面',
	'2': '線',
	'3': '円',
	'4': '円弧',
	'5': '点',
	'6': '方向',
	'7': '注記'
};

function parseExtElementRecord(
	line: string
): ElementRecord & { embeddedX?: number; embeddedY?: number } {
	// 拡張DM 要素レコード
	// [1]    "E" 固定
	// [2]    データタイプ (1=面,2=線,3=円,4=円弧,5=点,6=方向,7=注記)
	// [3-6]  分類コード A4
	// [7]    空白
	// [8]    実データ区分 I1
	// [9-12] 間断区分 I4
	// [13-16] 要素識別番号 I4
	// [17]   精度区分 I1
	// [18-19] 予備 I2
	// [20]   座標次元 (0=埋込, 2=2D, 3=3D, 4=注記座標)
	// [21-23] 地図情報レベルコード等
	// [24-27] フラグ等
	// [28-31] 座標数 I4
	// [32-35] 座標レコード数 I4
	// [36-42] X座標 I7 (点・注記等で座標埋込時)
	// [43-49] Y座標 I7 (点・注記等で座標埋込時)
	const dataTypeCode = line.substring(1, 2);
	const classCode = line.substring(2, 6).trim().padStart(4, '0');
	const elementId = parseInt(line.substring(12, 16).trim(), 10) || 0;
	const coordDimension = line.substring(20, 21).trim();
	const coordinateCount = parseInt(line.substring(27, 31).trim(), 10) || 0;
	const is3D = coordDimension === '3';

	// 点(5)や注記(7)など座標が埋め込まれている場合
	let embeddedX: number | undefined;
	let embeddedY: number | undefined;
	const xStr = line.substring(35, 42).trim();
	const yStr = line.substring(42, 49).trim();
	if (xStr !== '' && xStr !== '0') {
		const x = parseInt(xStr, 10);
		const y = parseInt(yStr, 10);
		if (!isNaN(x) && !isNaN(y) && (x !== 0 || y !== 0)) {
			embeddedX = x;
			embeddedY = y;
		}
	}

	return {
		type: 'ELEMENT',
		classCode,
		dataType: EXT_DATA_TYPE_MAP[dataTypeCode] ?? '不明',
		elementId,
		coordinateCount,
		is3D,
		embeddedX,
		embeddedY
	};
}

// 拡張DM 座標レコード（Eレコードの座標次元[20]に応じて2D/3Dを切り替え）
// 座標値 0 はパディング（無効値）。単位は図郭座標行の座標値単位フィールドにより決定。
//
// 2D (座標次元='2'): 7バイト×2値(X,Y)=14バイト/座標 × 最大6座標 = 84バイト/行
//   [1-7]X1 [8-14]Y1 [15-21]X2 [22-28]Y2 ... [71-77]X6 [78-84]Y6
//
// 3D (座標次元='3'): 7バイト×3値(X,Y,Z)=21バイト/座標 × 最大4座標 = 84バイト/行
//   [1-7]X1 [8-14]Y1 [15-21]Z1 [22-28]X2 ... [64-70]X4 [71-77]Y4 [78-84]Z4
//   ※等高線など標高情報を持つ要素で使用。Z値は標高。GeoJSON変換時はX,Yのみ使用。

function parseExtCoord2DRecord(line: string): CoordRecord2D {
	// 7バイト×2値(X,Y) × 最大6座標/行
	const coords: Array<[number, number]> = [];
	for (let i = 0; i < 6; i++) {
		const xStart = i * 14;
		const yStart = xStart + 7;
		const xStr = line.substring(xStart, xStart + 7).trim();
		const yStr = line.substring(yStart, yStart + 7).trim();
		if (xStr === '' || xStr === '0') break;
		const x = parseInt(xStr, 10);
		const y = parseInt(yStr, 10);
		if (!isNaN(x) && !isNaN(y) && (x !== 0 || y !== 0)) {
			coords.push([x, y]);
		} else {
			break;
		}
	}
	return { type: 'COORD2D', coordinates: coords };
}

function parseExtCoord3DRecord(line: string): CoordRecord3D {
	// 拡張DM 3D座標レコード: 7バイト×3値(X,Y,Z) = 21バイト/座標, 最大4座標/行
	const coords: Array<[number, number, number]> = [];
	for (let i = 0; i < 4; i++) {
		const offset = i * 21;
		const xStr = line.substring(offset, offset + 7).trim();
		const yStr = line.substring(offset + 7, offset + 14).trim();
		const zStr = line.substring(offset + 14, offset + 21).trim();
		if (xStr === '' || xStr === '0') break;
		const x = parseInt(xStr, 10);
		const y = parseInt(yStr, 10);
		const z = parseInt(zStr, 10);
		if (!isNaN(x) && !isNaN(y) && (x !== 0 || y !== 0)) {
			coords.push([x, y, isNaN(z) ? 0 : z]);
		} else {
			break;
		}
	}
	return { type: 'COORD3D', coordinates: coords };
}

function parseExtAnnotationDataRecord(line: string): AnnotationRecord {
	// 拡張DM 注記データレコード (E7レコードの次行)
	// 角度や文字高、テキストなどが含まれる
	// フォーマットはファイルによって異なるが、テキスト部分を抽出
	const text = line.substring(18).trim();
	return {
		type: 'ANNOTATION',
		x: 0,
		y: 0,
		angle: parseInt(line.substring(0, 7).trim(), 10) || 0,
		height: parseInt(line.substring(11, 15).trim(), 10) || 0,
		text
	};
}

// ============================================================
// フォーマット自動判定
//
// 旧DM vs 拡張DM の主な違い:
//   旧DM:   I レコード(座標系番号), F 要素レコード(pos17にデータタイプ),
//           D2/D3 座標レコード(10バイトフィールド×最大4ペア/行),
//           座標単位は mapLevel に依存, 変換: 生値→toMeters()→絶対座標
//   拡張DM: I レコードなし, E1〜E7 要素レコード(データタイプ1桁),
//           座標レコード(プレフィックスなし, 7バイト×最大6ペア(2D)/4組(3D)/行),
//           座標単位は図郭座標行の座標値単位フィールドに依存,
//           変換: 図郭原点(m) + 座標値/coordUnitDivisor→絶対座標
//
// 判定: E1〜E7 で始まるレコードがあれば拡張DM、F / I レコードがあれば旧DM
// ============================================================

function isExtendedDM(text: string): boolean {
	const lines = text.split(/\r?\n/);
	for (const line of lines) {
		if (line.length < 2) continue;
		const trimmed = line.trimEnd();
		if (trimmed === '') continue;
		// 拡張DMの特徴: Eレコード（E1～E7）が存在する
		if (/^E[1-7]/.test(trimmed)) return true;
		// 旧DMの特徴: F レコードが存在する
		if (trimmed.startsWith('F ')) return false;
		// I レコードが存在すれば旧DM
		if (trimmed.startsWith('I ')) return false;
	}
	return false;
}

// ============================================================
// メインパーサー: DM テキスト → ParsedRecord[]
// ============================================================

interface ParseResult {
	records: ParsedRecord[];
	isExtended: boolean;
}

function parseRecords(text: string): ParseResult {
	const extended = isExtendedDM(text);
	const lines = text.split(/\r?\n/);
	const records: ParsedRecord[] = [];

	// 拡張DM用: 直前のEレコードが注記(E7)だったかを追跡
	let lastWasExtAnnotation = false;
	// 拡張DM用: 直前のEレコードが3D座標かを追跡
	let lastElementIs3D = false;
	// 拡張DM用: M レコード直後の行（図郭座標行）を追跡
	let afterMRecord = 0; // 0=通常, 1=M直後(図郭座標行), 2=図郭座標行直後(メタ行)

	for (const rawLine of lines) {
		// 84バイト固定長（短い行は空白で補完）
		const line = rawLine.padEnd(84, ' ');
		if (line.trim() === '') continue;

		const recordType = line.substring(0, 2);

		try {
			if (extended) {
				// ---- 拡張DM ----
				if (recordType === 'M ') {
					const drawing = parseDrawingRecord(line);
					records.push(drawing);
					lastWasExtAnnotation = false;
					afterMRecord = 1;
				} else if (afterMRecord > 0) {
					// M レコード直後の付属行（図郭座標・メタ情報等）をスキップ
					if (afterMRecord === 1) {
						// 図郭座標行: 左下座標を図郭原点として取得
						// 拡張DMの付属行は先頭に "MB" プレフィックスがないため
						// [1-7] 左下X, [8-14] 左下Y, [15-21] 右上X, [22-28] 右上Y,
						// ... [45-47] 座標値単位
						const coord = {
							originX: parseIntField(line, 1, 7),
							originY: parseIntField(line, 8, 7),
							topRightX: parseIntField(line, 15, 7),
							topRightY: parseIntField(line, 22, 7)
						};
						const coordUnit = parseIntField(line, 45, 3);
						records.push({
							type: 'DRAWING',
							...coord,
							drawingId: '',
							drawingName: '',
							mapLevel: 0,
							coordUnit,
							title: '',
							version: 0
						});
					}
					// H や E で始まる行が来たら付属行は終了
					if (recordType === 'H ' || (line.charAt(0) === 'E' && /^E[1-7]/.test(line))) {
						afterMRecord = 0;
						// 再帰的に処理せずフォールスルーさせるため、ここでは何もしない
					} else {
						afterMRecord++;
						continue;
					}
				}

				if (afterMRecord === 0) {
					if (recordType === 'H ') {
						records.push(parseGroupHeaderRecord(line));
						lastWasExtAnnotation = false;
					} else if (line.charAt(0) === 'E' && /^E[1-7]/.test(line)) {
						const extElem = parseExtElementRecord(line);
						records.push(extElem);
						// 埋め込み座標がある場合は座標レコードも追加
						if (extElem.embeddedX !== undefined && extElem.embeddedY !== undefined) {
							records.push({
								type: 'COORD2D',
								coordinates: [[extElem.embeddedX, extElem.embeddedY]]
							});
						}
						lastWasExtAnnotation = extElem.dataType === '注記';
						lastElementIs3D = extElem.is3D === true;
					} else if (line.charAt(0) === ' ' || /^[0-9]/.test(line)) {
						// 座標レコードまたは注記データレコード
						if (lastWasExtAnnotation) {
							// 注記データレコード
							records.push(parseExtAnnotationDataRecord(line));
							lastWasExtAnnotation = false;
						} else if (lastElementIs3D) {
							// 3D座標レコード (7バイト×3値(X,Y,Z) × 4座標/行)
							records.push(parseExtCoord3DRecord(line));
						} else {
							// 2D座標レコード (7バイト×2値(X,Y) × 6座標/行)
							records.push(parseExtCoord2DRecord(line));
						}
					} else {
						records.push({ type: 'UNKNOWN', raw: line });
						lastWasExtAnnotation = false;
					}
				}
			} else {
				// ---- 旧DM ----
				if (recordType === 'I ') {
					records.push(parseIndexRecord(line));
				} else if (recordType === 'M ') {
					records.push(parseDrawingRecord(line));
				} else if (recordType === 'MB') {
					const coord = parseDrawingCoordRecord(line);
					records.push({
						type: 'DRAWING',
						...coord,
						drawingId: '',
						drawingName: '',
						mapLevel: 0,
						coordUnit: 0,
						title: '',
						version: 0
					});
				} else if (recordType === 'H ') {
					records.push(parseGroupHeaderRecord(line));
				} else if (recordType === 'F ') {
					records.push(parseElementRecord(line));
				} else if (recordType === 'D2' || recordType === 'D ') {
					records.push(parseCoord2DRecord(line));
				} else if (recordType === 'D3') {
					records.push(parseCoord3DRecord(line));
				} else if (recordType === 'L ') {
					records.push(parseAnnotationRecord(line));
				} else {
					records.push({ type: 'UNKNOWN', raw: line });
				}
			}
		} catch (e) {
			records.push({ type: 'UNKNOWN', raw: line });
			lastWasExtAnnotation = false;
		}
	}

	return { records, isExtended: extended };
}

// ============================================================
// GeoJSON 変換
//
// 座標変換の流れ:
//   旧DM:   生の座標値 → toMeters(value, mapLevel) → [Easting(m), Northing(m)]
//   拡張DM: 生の座標値 → 図郭原点(m) + 座標値/coordUnitDivisor → [Easting(m), Northing(m)]
// ※WGS84経緯度への変換は呼び出し側(transformGeoJSONParallel)で行う
// ============================================================

export interface ConvertOptions {
	/**
	 * 注記をフィーチャとして含めるか (default: true)
	 */
	includeAnnotations?: boolean;

	/**
	 * 座標精度を小数点以下何桁に丸めるか (default: 8)
	 */
	coordinatePrecision?: number;
}

/**
 * DM テキストデータを GeoJSON FeatureCollection に変換する
 *
 * @param dmText - Shift-JISデコード済みのDMテキスト
 * @param options - 変換オプション
 * @returns GeoJSON FeatureCollection
 *
 * @example
 * // ブラウザでの使用例
 * const response = await fetch('sample.dm');
 * const buffer = await response.arrayBuffer();
 * const text = new TextDecoder('shift-jis').decode(buffer);
 * const geojson = convertDMtoGeoJSON(text);
 *
 * // Node.jsでの使用例 (iconv-lite等でデコード)
 * import iconv from 'iconv-lite';
 * const buffer = fs.readFileSync('sample.dm');
 * const text = iconv.decode(buffer, 'shift-jis');
 * const geojson = convertDMtoGeoJSON(text);
 */
export function convertDMtoGeoJSON(dmText: string, options: ConvertOptions = {}): DMGeoJSON {
	const { includeAnnotations = true, coordinatePrecision = 8 } = options;

	const precision = Math.pow(10, coordinatePrecision);

	const { records, isExtended } = parseRecords(dmText);
	const features: DMFeature[] = [];

	// パース状態
	let coordSystem = 0; // 0 = 未確定（後で推定または旧DMデフォルト適用）
	let mapLevel = 2500;
	let currentDrawingId = '';
	let currentClassCode = '';
	let currentElementRecord: ElementRecord | null = null;
	let coordBuffer: Array<[number, number]> = [];
	let coord3DBuffer: Array<[number, number, number]> = [];
	let coordsExpected = 0;
	let is3D = false;
	let planningOrg = '';

	// 拡張DM: 図郭原点（メートル単位）
	let figureOriginX = 0;
	let figureOriginY = 0;
	// 拡張DM: 座標値単位 (1=mm, 10=cm, 1000=m), デフォルト1(mm)
	let coordUnitDivisor = 1000; // mm→m

	// 座標をメートル単位の平面直角座標に変換（WGS84変換は呼び出し側で行う）
	const toAbsoluteMeters = (x: number, y: number): [number, number] => {
		if (isExtended) {
			// 拡張DM: 座標値単位に基づいて図郭原点からの相対値をメートルに変換
			return [figureOriginY + y / coordUnitDivisor, figureOriginX + x / coordUnitDivisor];
		}
		// 旧DM: mapLevelに応じた単位変換
		return [toMeters(y, mapLevel), toMeters(x, mapLevel)];
	};

	const roundCoord = (v: number) => Math.round(v * precision) / precision;

	// バッファを GeoJSON フィーチャに変換してフラッシュ
	const flushFeature = () => {
		if (!currentElementRecord) return;
		if (coordBuffer.length === 0 && coord3DBuffer.length === 0) return;

		const { classCode, dataType, elementId } = currentElementRecord;
		const className = getClassName(classCode);
		const baseProps = {
			classCode,
			className,
			dataType,
			elementId,
			layer: currentClassCode,
			mapLevel,
			drawingId: currentDrawingId
		};

		let geometry: DMFeature['geometry'] | null = null;

		const rawCoords = is3D
			? coord3DBuffer.map(([x, y]) => toAbsoluteMeters(x, y))
			: coordBuffer.map(([x, y]) => toAbsoluteMeters(x, y));

		const coords = rawCoords.map(([e, n]) => [roundCoord(e), roundCoord(n)]);

		if (dataType === '点' || dataType === '方向') {
			if (coords.length === 1) {
				geometry = { type: 'Point', coordinates: coords[0] };
			} else if (coords.length > 1) {
				geometry = { type: 'MultiPoint', coordinates: coords };
			}
		} else if (dataType === '線' || dataType === '円弧') {
			if (coords.length >= 2) {
				geometry = { type: 'LineString', coordinates: coords };
			}
		} else if (dataType === '面') {
			if (coords.length >= 3) {
				// 閉じていない場合は閉じる
				const ring = [...coords];
				const first = ring[0],
					last = ring[ring.length - 1];
				if (first[0] !== last[0] || first[1] !== last[1]) {
					ring.push(ring[0]);
				}
				geometry = { type: 'Polygon', coordinates: [ring] };
			}
		} else if (dataType === '円') {
			// 円は中心点として扱う（半径情報は別途 properties に格納）
			if (coords.length >= 1) {
				geometry = { type: 'Point', coordinates: coords[0] };
			}
		}

		if (geometry) {
			features.push({
				type: 'Feature',
				geometry,
				properties: baseProps
			});
		}

		coordBuffer = [];
		coord3DBuffer = [];
		coordsExpected = 0;
		is3D = false;
	};

	// レコードを順番に処理
	for (const record of records) {
		switch (record.type) {
			case 'INDEX': {
				coordSystem = record.coordSystem || 9;
				planningOrg = record.planningOrg;
				break;
			}

			case 'DRAWING': {
				if (record.drawingId) {
					// フラッシュ前の要素を確定
					flushFeature();
					currentElementRecord = null;
					currentDrawingId = record.drawingId;
					mapLevel = record.mapLevel || mapLevel;
				}
				// 図郭座標レコード (originX/originY) から図郭原点を取得
				if (isExtended && (record.originX !== 0 || record.originY !== 0)) {
					figureOriginX = record.originX;
					figureOriginY = record.originY;
				}
				// 座標値単位から除算器を決定 (1=mm→/1000, 10=cm→/100, 1000=m→/1)
				if (isExtended) {
					if (record.coordUnit > 0) {
						if (record.coordUnit >= 1000) {
							coordUnitDivisor = 1; // m単位
						} else if (record.coordUnit >= 10) {
							coordUnitDivisor = 100; // cm単位
						} else {
							coordUnitDivisor = 1000; // mm単位
						}
					} else if (mapLevel > 0) {
						// coordUnit が取得できない場合は mapLevel から推定
						if (mapLevel <= 1000) {
							coordUnitDivisor = 1000; // mm単位
						} else if (mapLevel <= 5000) {
							coordUnitDivisor = 100; // cm単位
						} else {
							coordUnitDivisor = 1; // m単位
						}
					}
				}
				break;
			}

			case 'GROUP_HEADER': {
				flushFeature();
				currentElementRecord = null;
				currentClassCode = record.classCode;
				break;
			}

			case 'ELEMENT': {
				// 前の要素をフラッシュ
				flushFeature();
				currentElementRecord = record;
				coordsExpected = record.coordinateCount;
				coordBuffer = [];
				coord3DBuffer = [];
				is3D = false;
				break;
			}

			case 'COORD2D': {
				if (currentElementRecord) {
					coordBuffer.push(...record.coordinates);
				}
				break;
			}

			case 'COORD3D': {
				if (currentElementRecord) {
					is3D = true;
					coord3DBuffer.push(...record.coordinates);
				}
				break;
			}

			case 'ANNOTATION': {
				if (!includeAnnotations) break;
				const [e, n] = toAbsoluteMeters(record.x, record.y);
				features.push({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [roundCoord(e), roundCoord(n)]
					},
					properties: {
						classCode: currentClassCode || '8100',
						className: '注記',
						dataType: '注記',
						elementId: 0,
						layer: currentClassCode,
						mapLevel,
						drawingId: currentDrawingId,
						text: record.text,
						angle: record.angle / 10, // デシ度 → 度
						height: record.height
					}
				});
				// 注記後はバッファをリセット
				currentElementRecord = null;
				coordBuffer = [];
				break;
			}

			default:
				break;
		}
	}

	// 最後の要素をフラッシュ
	flushFeature();

	// 系番号が未確定の場合のフォールバック
	if (coordSystem === 0) {
		coordSystem = isExtended ? 2 : 9;
	}

	return {
		type: 'FeatureCollection',
		features,
		properties: {
			coordinateSystem: coordSystem,
			epsgCode: 6668 + coordSystem,
			planningOrganization: planningOrg,
			mapLevel
		}
	};
}

// ============================================================
// ブラウザ / Node.js 両対応の文字コード変換ヘルパー
// ============================================================

/**
 * ArrayBuffer (Shift-JIS) → DM テキスト文字列に変換
 * ブラウザ標準 TextDecoder を使用
 */
export function decodeShiftJIS(buffer: ArrayBuffer): string {
	try {
		return new TextDecoder('shift-jis').decode(buffer);
	} catch {
		// 一部環境で "shift-jis" が通らない場合の fallback
		return new TextDecoder('sjis').decode(buffer);
	}
}

/**
 * ファイルから直接変換（ブラウザのFile API対応）
 */
export async function convertDMFileToGeoJSON(
	file: File,
	options?: ConvertOptions
): Promise<DMGeoJSON> {
	const buffer = await file.arrayBuffer();
	const text = decodeShiftJIS(buffer);
	return convertDMtoGeoJSON(text, options);
}

/** 系番号の情報 */
export interface DMInfo {
	/** INDEXレコードの系番号（存在する場合） */
	indexZone: number | null;
	/** 図郭名称 */
	drawingName: string;
	/** 図郭の平面直角座標bbox [originX, originY, topRightX, topRightY] */
	bbox: [number, number, number, number] | null;
}

/**
 * DMファイルから座標系情報を取得する（軽量パース）。
 * UIでユーザーに確認を求める前に呼び出す。
 */
export async function getDMInfo(file: File): Promise<DMInfo> {
	const buffer = await file.arrayBuffer();
	const text = decodeShiftJIS(buffer);
	const { records, isExtended } = parseRecords(text);

	let indexZone: number | null = null;
	let drawingName = '';
	let bbox: [number, number, number, number] | null = null;

	for (const record of records) {
		if (record.type === 'INDEX') {
			indexZone = record.coordSystem || null;
		}
		if (record.type === 'DRAWING' && record.drawingName && !drawingName) {
			drawingName = record.drawingName;
		}
		if (record.type === 'DRAWING' && record.originX !== 0 && record.topRightX !== 0 && !bbox) {
			bbox = [record.originX, record.originY, record.topRightX, record.topRightY];
		}
	}

	return { indexZone, drawingName, bbox };
}

/** 平面直角座標系の系番号と主な地域の対応 */
export const ZONE_REGIONS: Record<number, string> = {
	1: '長崎・鹿児島西部',
	2: '福岡・佐賀・大分・熊本・鹿児島東部',
	3: '山口・島根・広島',
	4: '香川・愛媛・徳島・高知',
	5: '兵庫・鳥取・岡山',
	6: '京都・大阪・福井・滋賀・三重・奈良・和歌山',
	7: '石川・富山・岐阜・愛知',
	8: '新潟・長野・山梨・静岡',
	9: '東京・福島・栃木・茨城・埼玉・千葉・群馬・神奈川',
	10: '青森・秋田・山形・岩手・宮城',
	11: '北海道（西部）',
	12: '北海道（中部）',
	13: '北海道（東部）',
	14: '小笠原諸島',
	15: '沖縄',
	16: '先島諸島',
	17: '大東諸島',
	18: '沖ノ鳥島',
	19: '南鳥島'
};
