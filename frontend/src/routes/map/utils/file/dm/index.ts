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
 *   - 参考実装: Orbitalnet-incs/dmprovider
 *     https://github.com/Orbitalnet-incs/dmprovider/tree/main
 */

import { getClassName } from './classCode';

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
		dataTypeCode: string; // データタイプコード (0-9)
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
// 座標単位変換: レコードから読んだ整数値 → メートル
// ============================================================

const toMeters = (rawValue: number, mapLevel: number): number => {
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
};

// ============================================================
// テキスト行パーサー群
// ============================================================

// 行を固定位置でパース (1-indexed, bytes)
const substr = (line: string, start: number, length: number): string =>
	line.substring(start - 1, start - 1 + length).trim();

const parseIntField = (line: string, start: number, length: number): number =>
	parseInt(substr(line, start, length), 10) || 0;

const normalizeAngle = (angle: number): number => {
	let normalized = angle % 360;
	if (normalized < 0) normalized += 360;
	return normalized;
};

const calculateCircleCenterAndRadius = (
	points: Array<[number, number]>
): { center: [number, number]; radius: number } | null => {
	if (points.length < 3) return null;

	const [[x1, y1], [x2, y2], [x3, y3]] = points;
	const d = 2 * ((y1 - y3) * (x1 - x2) - (y1 - y2) * (x1 - x3));
	if (Math.abs(d) < 1e-9) return null;

	const x =
		((y1 - y3) * (y1 ** 2 - y2 ** 2 + x1 ** 2 - x2 ** 2) -
			(y1 - y2) * (y1 ** 2 - y3 ** 2 + x1 ** 2 - x3 ** 2)) /
		d;
	const y =
		((x1 - x3) * (x1 ** 2 - x2 ** 2 + y1 ** 2 - y2 ** 2) -
			(x1 - x2) * (x1 ** 2 - x3 ** 2 + y1 ** 2 - y3 ** 2)) /
		-d;

	return {
		center: [x, y],
		radius: Math.hypot(x - x1, y - y1)
	};
};

const createCircleRing = (
	center: [number, number],
	radius: number,
	stepDegrees = 10
): Array<[number, number]> => {
	const ring: Array<[number, number]> = [];

	for (let degree = 0; degree <= 360; degree += stepDegrees) {
		const radians = (degree * Math.PI) / 180;
		ring.push([center[0] + radius * Math.cos(radians), center[1] + radius * Math.sin(radians)]);
	}

	if (ring.length > 0) {
		const first = ring[0];
		const last = ring[ring.length - 1];
		if (first[0] !== last[0] || first[1] !== last[1]) {
			ring.push(first);
		}
	}

	return ring;
};

const createArcPoints = (points: Array<[number, number]>): Array<[number, number]> | null => {
	const circle = calculateCircleCenterAndRadius(points);
	if (!circle) return null;

	const [start, middle, end] = points;
	const { center, radius } = circle;
	const startAngle = normalizeAngle((Math.atan2(start[1] - center[1], start[0] - center[0]) * 180) / Math.PI);
	const middleAngle = normalizeAngle(
		(Math.atan2(middle[1] - center[1], middle[0] - center[0]) * 180) / Math.PI
	);
	const endAngle = normalizeAngle((Math.atan2(end[1] - center[1], end[0] - center[0]) * 180) / Math.PI);

	const clockwiseDelta = normalizeAngle(endAngle - startAngle);
	const clockwiseMiddle = normalizeAngle(middleAngle - startAngle);
	const isClockwise = clockwiseDelta > clockwiseMiddle;
	const sweep = isClockwise ? clockwiseDelta : 360 - clockwiseDelta;
	const direction = isClockwise ? 1 : -1;
	const steps = Math.max(1, Math.ceil(sweep));
	const arcPoints: Array<[number, number]> = [];

	for (let i = 0; i < steps; i++) {
		const angle = startAngle + i * direction;
		const radians = (angle * Math.PI) / 180;
		arcPoints.push([
			center[0] + radius * Math.cos(radians),
			center[1] + radius * Math.sin(radians)
		]);
	}

	arcPoints.push(end);
	return arcPoints;
};

const isContourClassCode = (classCode: string): boolean =>
	classCode.startsWith('71') && classCode !== '7199';

const coordKey = ([x, y]: [number, number]): string => `${x},${y}`;

const mergeConnectedLineCoordinates = (
	lineStrings: Array<Array<[number, number]>>
): Array<{ coordinates: Array<[number, number]>; segmentCount: number }> => {
	// 同じ標高値・同じ等高線クラスで束ねた折れ線群を、端点一致だけで順次連結する。
	const remaining = lineStrings
		.filter((coords) => coords.length >= 2)
		.map((coords) => [...coords] as Array<[number, number]>);
	const merged: Array<{ coordinates: Array<[number, number]>; segmentCount: number }> = [];

	while (remaining.length > 0) {
		let current = remaining.shift()!;
		let segmentCount = 1;
		let didMerge = true;

		while (didMerge) {
			didMerge = false;

			for (let i = 0; i < remaining.length; i++) {
				const candidate = remaining[i];
				const currentStart = current[0];
				const currentEnd = current[current.length - 1];
				const candidateStart = candidate[0];
				const candidateEnd = candidate[candidate.length - 1];

				if (coordKey(currentEnd) === coordKey(candidateStart)) {
					current = [...current, ...candidate.slice(1)];
				} else if (coordKey(currentEnd) === coordKey(candidateEnd)) {
					current = [...current, ...[...candidate].reverse().slice(1)];
				} else if (coordKey(currentStart) === coordKey(candidateEnd)) {
					current = [...candidate.slice(0, -1), ...current];
				} else if (coordKey(currentStart) === coordKey(candidateStart)) {
					current = [...[...candidate].reverse().slice(0, -1), ...current];
				} else {
					continue;
				}

				remaining.splice(i, 1);
				segmentCount += 1;
				didMerge = true;
				break;
			}
		}

		merged.push({ coordinates: current, segmentCount });
	}

	return merged;
};

const mergeContourFeatures = (features: DMFeature[]): DMFeature[] => {
	// 等高線は1地物が複数要素レコードに分かれやすいため、ここで後処理として連結する。
	// 道路や境界まで誤結合しないように、71xx の線だけを対象にする。
	// 標高値がある場合は同じ標高値ごとに、無い場合は classCode 単位で端点完全一致マージを行う。
	const mergedFeatures: DMFeature[] = [];
	const contourGroups = new Map<string, DMFeature[]>();

	for (const feature of features) {
		if (
			feature.geometry.type !== 'LineString' ||
			feature.properties.dataType !== '線' ||
			!isContourClassCode(feature.properties.classCode) ||
			typeof feature.properties.elevation !== 'number'
		) {
			mergedFeatures.push(feature);
			continue;
		}

		const groupKey = [
			feature.properties.classCode,
			feature.properties.drawingId,
			typeof feature.properties.elevation === 'number'
				? `elevation:${String(feature.properties.elevation)}`
				: 'elevation:none'
		].join(':');

		const bucket = contourGroups.get(groupKey);
		if (bucket) {
			bucket.push(feature);
		} else {
			contourGroups.set(groupKey, [feature]);
		}
	}

	for (const group of contourGroups.values()) {
		const mergedCoordinates = mergeConnectedLineCoordinates(
			group.map((feature) => feature.geometry.coordinates as Array<[number, number]>)
		);

		for (const mergedCoordinate of mergedCoordinates) {
			mergedFeatures.push({
				...group[0],
				geometry: {
					type: 'LineString',
					coordinates: mergedCoordinate.coordinates
				},
				properties: {
					...group[0].properties,
					mergedSegmentCount: mergedCoordinate.segmentCount
				}
			});
		}
	}

	return mergedFeatures;
};

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
	dataTypeCode: string; // 元のデータタイプコード (0-9)
	elementId: number;
	coordinateCount: number;
	dataKubun: number;
	actualDataType: number;
	precisionType: number;
	kandan: number;
	teni: number;
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
	tateyoko?: number;
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

const parseIndexRecord = (line: string): IndexRecord => {
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
};

const parseDrawingRecord = (line: string): DrawingRecord => {
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
};

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

const parseDrawingCoordRecord = (
	line: string
): {
	originX: number;
	originY: number;
	topRightX: number;
	topRightY: number;
} => {
	// レコード(b): 図郭座標
	// [3-9]  左下X I7  [10-16] 左下Y I7  [17-19] 座標値単位 I3
	// [20-26] 要素数  [27-32] レコード数  [33-39] 右上X I7  [40-46] 右上Y I7
	return {
		originX: parseIntField(line, 3, 7),
		originY: parseIntField(line, 10, 7),
		topRightX: parseIntField(line, 33, 7),
		topRightY: parseIntField(line, 40, 7)
	};
};

const parseGroupHeaderRecord = (line: string): GroupHeaderRecord => {
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
};

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

const parseElementRecord = (line: string): ElementRecord => {
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
		dataTypeCode,
		elementId: parseIntField(line, 9, 8),
		coordinateCount: parseIntField(line, 33, 4),
		dataKubun: parseIntField(line, 32, 1),
		actualDataType: parseIntField(line, 18, 1),
		precisionType: parseIntField(line, 19, 1),
		kandan: parseIntField(line, 20, 4),
		teni: parseIntField(line, 24, 4)
	};
};

const parseCoord2DRecord = (line: string): CoordRecord2D => {
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
};

const parseCoord3DRecord = (line: string): CoordRecord3D => {
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
};

const parseAnnotationRecord = (line: string): AnnotationRecord => {
	// [3-12] X I10  [13-22] Y I10  [23-26] 角度 I4 (デシ度)
	// [27-30] 文字高さ I4  [31-84] テキスト A54
	return {
		type: 'ANNOTATION',
		x: parseIntField(line, 3, 10),
		y: parseIntField(line, 13, 10),
		angle: parseIntField(line, 23, 4),
		height: parseIntField(line, 27, 4),
		text: substr(line, 31, 54),
		tateyoko: 0
	};
};

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

const parseExtElementRecord = (
	line: string
): ElementRecord & { embeddedX?: number; embeddedY?: number } => {
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
		dataTypeCode,
		elementId,
		coordinateCount,
		dataKubun: parseInt(line.substring(7, 8).trim(), 10) || 0,
		actualDataType: parseInt(line.substring(7, 8).trim(), 10) || 0,
		precisionType: parseInt(line.substring(16, 17).trim(), 10) || 0,
		kandan: parseInt(line.substring(8, 12).trim(), 10) || 0,
		teni: 0,
		is3D,
		embeddedX,
		embeddedY
	};
};

// 拡張DM 座標レコード（Eレコードの座標次元[20]に応じて2D/3Dを切り替え）
// 座標値 0 はパディング（無効値）。単位は図郭座標行の座標値単位フィールドにより決定。
//
// 2D (座標次元='2'): 7バイト×2値(X,Y)=14バイト/座標 × 最大6座標 = 84バイト/行
//   [1-7]X1 [8-14]Y1 [15-21]X2 [22-28]Y2 ... [71-77]X6 [78-84]Y6
//
// 3D (座標次元='3'): 7バイト×3値(X,Y,Z)=21バイト/座標 × 最大4座標 = 84バイト/行
//   [1-7]X1 [8-14]Y1 [15-21]Z1 [22-28]X2 ... [64-70]X4 [71-77]Y4 [78-84]Z4
//   ※等高線など標高情報を持つ要素で使用。Z値は標高。GeoJSON変換時はX,Yのみ使用。

const parseExtCoord2DRecord = (line: string): CoordRecord2D => {
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
};

const parseExtCoord3DRecord = (line: string): CoordRecord3D => {
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
};

const parseExtAnnotationDataRecord = (line: string): AnnotationRecord => {
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
		text,
		tateyoko: parseInt(line.substring(7, 8).trim(), 10) || 0
	};
};

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

const isExtendedDM = (text: string): boolean => {
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
};

// ============================================================
// メインパーサー: DM テキスト → ParsedRecord[]
// ============================================================

interface ParseResult {
	records: ParsedRecord[];
	isExtended: boolean;
}

const parseRecords = (text: string): ParseResult => {
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
};

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
export const convertDMtoGeoJSON = (dmText: string, options: ConvertOptions = {}): DMGeoJSON => {
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

	const toAbsoluteElevation = (z: number): number => {
		if (isExtended) {
			return z / coordUnitDivisor;
		}
		return toMeters(z, mapLevel);
	};

	const roundCoord = (v: number) => Math.round(v * precision) / precision;

	// バッファを GeoJSON フィーチャに変換してフラッシュ
	const flushFeature = () => {
		if (!currentElementRecord) return;
		if (coordBuffer.length === 0 && coord3DBuffer.length === 0) return;

		const { classCode, dataType, dataTypeCode, elementId } = currentElementRecord;
		const className = getClassName(classCode);
		const baseProps: DMFeature['properties'] = {
			classCode,
			className,
			dataType,
			dataTypeCode,
			elementId,
			layer: currentClassCode,
			mapLevel,
			drawingId: currentDrawingId,
			dataKubun: currentElementRecord.dataKubun,
			actualDataType: currentElementRecord.actualDataType,
			precisionType: currentElementRecord.precisionType,
			kandan: currentElementRecord.kandan,
			teni: currentElementRecord.teni
		};

		let geometry: DMFeature['geometry'] | null = null;

		const rawCoords = is3D
			? coord3DBuffer.map(([x, y]) => toAbsoluteMeters(x, y))
			: coordBuffer.map(([x, y]) => toAbsoluteMeters(x, y));

		const coords = rawCoords.map(([e, n]) => [roundCoord(e), roundCoord(n)]);
		if (is3D && coord3DBuffer.length > 0) {
			// 3D座標のZ値は等高線などの標高情報として使う。単一標高なら elevation に正規化する。
			const elevations = coord3DBuffer.map(([, , z]) => roundCoord(toAbsoluteElevation(z)));
			const uniqueElevations = [...new Set(elevations)];
			if (uniqueElevations.length === 1) {
				baseProps.elevation = uniqueElevations[0];
			} else {
				baseProps.elevations = uniqueElevations;
			}
		}

		if (dataType === '点') {
			if (coords.length === 1) {
				geometry = { type: 'Point', coordinates: coords[0] };
			} else if (coords.length > 1) {
				geometry = { type: 'MultiPoint', coordinates: coords };
			}
		} else if (dataType === '方向') {
			if (coords.length >= 1) {
				geometry = { type: 'Point', coordinates: coords[0] };
				if (coords.length >= 2) {
					baseProps.angle =
						normalizeAngle(
							(Math.atan2(coords[1][1] - coords[0][1], coords[1][0] - coords[0][0]) * 180) /
								Math.PI
						);
				}
			}
		} else if (dataType === '線') {
			if (coords.length >= 2) {
				geometry = { type: 'LineString', coordinates: coords };
			}
		} else if (dataType === '円弧') {
			if (coords.length >= 3) {
				const arcPoints = createArcPoints(coords as Array<[number, number]>);
				geometry = {
					type: 'LineString',
					coordinates: (arcPoints ?? coords).map(([e, n]) => [roundCoord(e), roundCoord(n)])
				};
			} else if (coords.length >= 2) {
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
			if (coords.length >= 3) {
				const circle = calculateCircleCenterAndRadius(coords as Array<[number, number]>);
				if (circle) {
					baseProps.center = [roundCoord(circle.center[0]), roundCoord(circle.center[1])];
					baseProps.radius = circle.radius;
					geometry = {
						type: 'Polygon',
						coordinates: [
							createCircleRing(circle.center, circle.radius).map(([e, n]) => [
								roundCoord(e),
								roundCoord(n)
							])
						]
					};
				}
			} else if (coords.length >= 1) {
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
						dataTypeCode: '7',
						elementId: 0,
						layer: currentClassCode,
						mapLevel,
						drawingId: currentDrawingId,
						text: record.text,
						angle: record.angle / 10, // デシ度 → 度
						height: record.height,
						tateyoko: record.tateyoko ?? 0,
						kandan: currentElementRecord?.kandan ?? 0,
						teni: currentElementRecord?.teni ?? 0
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
	// FeatureCollectionとして返す前に、分割された等高線だけを地物寄りの形へまとめ直す。
	const normalizedFeatures = mergeContourFeatures(features);

	// 系番号が未確定の場合のフォールバック
	if (coordSystem === 0) {
		coordSystem = isExtended ? 2 : 9;
	}

	return {
		type: 'FeatureCollection',
		features: normalizedFeatures,
		properties: {
			coordinateSystem: coordSystem,
			epsgCode: 6668 + coordSystem,
			planningOrganization: planningOrg,
			mapLevel
		}
	};
};

// ============================================================
// ブラウザ / Node.js 両対応の文字コード変換ヘルパー
// ============================================================

/**
 * ArrayBuffer (Shift-JIS) → DM テキスト文字列に変換
 * ブラウザ標準 TextDecoder を使用
 */
export const decodeShiftJIS = (buffer: ArrayBuffer): string => {
	try {
		return new TextDecoder('shift-jis').decode(buffer);
	} catch {
		// 一部環境で "shift-jis" が通らない場合の fallback
		return new TextDecoder('sjis').decode(buffer);
	}
};

/**
 * ファイルから直接変換（ブラウザのFile API対応）
 */
export const convertDMFileToGeoJSON = async (
	file: File,
	options?: ConvertOptions
): Promise<DMGeoJSON> => {
	const buffer = await file.arrayBuffer();
	const text = decodeShiftJIS(buffer);
	return convertDMtoGeoJSON(text, options);
};

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
export const getDMInfo = async (file: File): Promise<DMInfo> => {
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
};
