/**
 * DM（数値地形図データ）→ GeoJSON 変換ライブラリ
 *
 * 仕様: 国土交通省公共測量作業規程 作業規程の準則 付録7 公共測量標準図式
 *       数値地形図データファイル仕様
 *
 * フォーマット概要:
 *   - 固定長84バイト/レコード（Shift-JIS）
 *   - レコード先頭2バイトでレコード種別を識別
 *     I  → インデックスレコード (1)
 *     M  → 図郭レコード (2)
 *     H  → グループ/レイヤヘッダレコード (3)
 *     F  → 要素レコード (4)
 *     P  → グリッドヘッダレコード (5)
 *     Q  → TINヘッダレコード (6)
 *     D3 → 三次元座標レコード (7)
 *     D2 → 二次元座標レコード (8)
 *     L  → 注記レコード (9)
 *     A  → 属性レコード (10)
 *     G  → グリッドレコード (11)
 *     T  → TINレコード (12)
 *   - 座標系: 平面直角座標系（X=北方向, Y=東方向）→ WGS84経緯度に変換が必要
 *   - 地図情報レベル500/1000: 座標単位mm, 2500/5000: cm, 10000: m
 */

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
		classCode: string; // 分類コード (例: "0101")
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
// 分類コード → 分類名 マッピング（主要なもの）
// 公共測量標準図式 数値地形図データ取得分類基準表より
// ============================================================

const CLASS_CODE_MAP: Record<string, string> = {
	'0101': '基準点（三角点）',
	'0102': '基準点（水準点）',
	'0103': '基準点（多角点）',
	'0200': '境界',
	'0201': '都府県界・北海道支庁界',
	'0202': '郡市・東京都区界',
	'0203': '町村・指定都市区界',
	'0204': '大字・町界・丁目界',
	'0205': '小字界',
	'0300': '道路',
	'0301': '真幅道路',
	'0302': '庭園路等',
	'0303': '徒歩道',
	'0400': '鉄道',
	'0401': '普通鉄道',
	'0402': '路面電車',
	'0500': '建築物',
	'0501': '普通建物',
	'0502': '堅ろう建物',
	'0503': '高層建物',
	'0600': '地下構造物',
	'0700': '水部',
	'0701': '海岸線',
	'0702': '湖岸線・池岸線',
	'0703': '河川',
	'0704': '水路',
	'0800': '小物体',
	'0900': '土地利用',
	'0901': '田',
	'0902': '畑',
	'0903': '山地',
	'0904': '森林',
	'1000': '地形',
	'1001': '等高線',
	'1002': '標高点',
	'1100': '注記',
	'1200': '用地界'
	// 必要に応じて追加
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
		coordUnit: 0,
		version: parseIntField(line, 68, 1)
	};
}

function parseDrawingCoordRecord(line: string): { originX: number; originY: number } {
	// レコード(b): 図郭座標
	// [3-9]  左下X I7  [10-16] 左下Y I7  [17-19] 座標値単位 I3
	// [20-26] 要素数  [27-32] レコード数  [33-39] 右上X I7  [40-46] 右上Y I7
	// ※左下座標を原点として使用
	return {
		originX: parseIntField(line, 3, 7),
		originY: parseIntField(line, 10, 7)
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

function parseExtElementRecord(line: string): ElementRecord & { embeddedX?: number; embeddedY?: number } {
	// 拡張DM 要素レコード
	// [1]    "E" 固定
	// [2]    データタイプ (1=面,2=線,3=円,4=円弧,5=点,6=方向,7=注記)
	// [3-6]  分類コード A4
	// [7]    空白
	// [8]    実データ区分 I1
	// [9-12] 間断区分 I4
	// [13-16] 要素識別番号 I4
	// [17]   精度区分 I1
	// [18]   ? I1
	// [19-23] 地図情報レベルコード I5
	// [24-27] フラグ等
	// [28-31] 座標数 I4
	// [32-35] 座標レコード数 I4
	// [36-42] X座標 I7 (点・注記等で座標埋込時)
	// [43-49] Y座標 I7 (点・注記等で座標埋込時)
	const dataTypeCode = line.substring(1, 2);
	const classCode = line.substring(2, 6).trim().padStart(4, '0');
	const elementId = parseInt(line.substring(12, 16).trim(), 10) || 0;
	const coordinateCount = parseInt(line.substring(27, 31).trim(), 10) || 0;

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
		embeddedX,
		embeddedY
	};
}

function parseExtCoord2DRecord(line: string): CoordRecord2D {
	// 拡張DM 座標レコード: 7バイト×12値 = 6座標ペア (X,Y)
	// 行頭にレコードタイプ識別子なし（スペースまたは数字で始まる）
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
						// 位置が2文字分前にずれる → [1-7] 左下X, [8-14] 左下Y
						const coord = {
							originX: parseIntField(line, 1, 7),
							originY: parseIntField(line, 8, 7)
						};
						// [15-17] 座標値単位 (1=mm, 10=cm, 1000=m)
						const coordUnit = parseIntField(line, 15, 3);
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
					} else if (line.charAt(0) === ' ' || /^[0-9]/.test(line)) {
						// 座標レコードまたは注記データレコード
						if (lastWasExtAnnotation) {
							// 注記データレコード
							records.push(parseExtAnnotationDataRecord(line));
							lastWasExtAnnotation = false;
						} else {
							// 座標レコード (7バイト×6ペア)
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
// ============================================================

export interface ConvertOptions {
	/**
	 * 平面直角座標系の系番号 (1～19)
	 * 省略時はファイル内のIレコードから取得、なければデフォルト2
	 */
	zoneNumber?: number;

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
	let coordSystem = options.zoneNumber ?? (isExtended ? 2 : 9); // 拡張DMデフォルト: 2系
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
				if (isExtended && record.coordUnit > 0) {
					if (record.coordUnit >= 1000) {
						coordUnitDivisor = 1; // m単位
					} else if (record.coordUnit >= 10) {
						coordUnitDivisor = 100; // cm単位
					} else {
						coordUnitDivisor = 1000; // mm単位
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
						classCode: currentClassCode || '1100',
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

