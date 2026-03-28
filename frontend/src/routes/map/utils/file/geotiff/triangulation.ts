/**
 * 適応的三角形分割によるリプロジェクション
 *
 * OpenLayers の ol/reproj/Triangulation.js を参考にした実装。
 * ターゲットタイル（WebMercator）の矩形をソースCRS空間に射影し、
 * 誤差に基づいて適応的に分割して三角形メッシュを生成する。
 */
import proj4 from 'proj4';

export interface Triangle {
	/** ターゲット（タイル内正規化座標 0-1） */
	target: [number, number][];
	/** ソース（ソースCRSの座標、テクスチャUV計算用） */
	source: [number, number][];
}

export interface TriangulationResult {
	triangles: Triangle[];
	/** ソース空間（ネイティブCRS）の包含矩形 */
	sourceExtent: [number, number, number, number];
}

/** 誤差閾値（タイル正規化座標空間、約0.5ピクセル / 256 ≈ 0.002） */
const ERROR_THRESHOLD = 0.002;

/** 最大分割深度 */
const MAX_SUBDIVISION = 10;

/**
 * ターゲットタイルの三角形メッシュを生成する
 *
 * @param targetExtent ターゲットタイルのWGS84範囲 [lonMin, latMin, lonMax, latMax]
 * @param projName ソースCRSのproj4定義名（例: "EPSG:32654"）。nullなら変換不要。
 */
export const buildTriangulation = (
	targetExtent: [number, number, number, number],
	projName: string | null
): TriangulationResult => {
	const [lonMin, latMin, lonMax, latMax] = targetExtent;

	// 変換関数: WGS84 → ソースCRS
	const transform = projName
		? (lon: number, lat: number): [number, number] => {
				const [x, y] = proj4('EPSG:4326', projName, [lon, lat]);
				return [x, y];
			}
		: (lon: number, lat: number): [number, number] => [lon, lat];

	// 正規化座標 (0-1) → 経緯度
	const toGeo = (nx: number, ny: number): [number, number] => [
		lonMin + nx * (lonMax - lonMin),
		latMax - ny * (latMax - latMin) // Y軸は上が0
	];

	// ソース座標を取得（キャッシュ付き）
	const cache = new Map<string, [number, number]>();
	const getSourceCoord = (nx: number, ny: number): [number, number] => {
		const key = `${nx},${ny}`;
		let coord = cache.get(key);
		if (!coord) {
			const [lon, lat] = toGeo(nx, ny);
			coord = transform(lon, lat);
			cache.set(key, coord);
		}
		return coord;
	};

	const triangles: Triangle[] = [];

	// 四角形を適応的に分割
	const addQuad = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		depth: number
	) => {
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;

		// 4隅のソース座標
		const s00 = getSourceCoord(x0, y0);
		const s10 = getSourceCoord(x1, y0);
		const s01 = getSourceCoord(x0, y1);
		const s11 = getSourceCoord(x1, y1);

		// 中心のソース座標（実際の変換結果）
		const sCenter = getSourceCoord(cx, cy);

		// 線形補間による中心の推定値
		const interpX = (s00[0] + s10[0] + s01[0] + s11[0]) / 4;
		const interpY = (s00[1] + s10[1] + s01[1] + s11[1]) / 4;

		// ソース空間での誤差（正規化座標空間に変換して判定）
		// ソース空間の範囲に対する相対誤差をターゲット空間に換算
		const quadSize = Math.max(x1 - x0, y1 - y0);
		const sourceRange = Math.max(
			Math.abs(s10[0] - s00[0]),
			Math.abs(s01[1] - s00[1]),
			1 // ゼロ除算防止
		);
		const errX = Math.abs(sCenter[0] - interpX) / sourceRange * quadSize;
		const errY = Math.abs(sCenter[1] - interpY) / sourceRange * quadSize;
		const error = Math.max(errX, errY);

		if (depth < MAX_SUBDIVISION && error > ERROR_THRESHOLD) {
			// 分割
			const isWide = (x1 - x0) >= (y1 - y0);
			if (isWide) {
				addQuad(x0, y0, cx, y1, depth + 1);
				addQuad(cx, y0, x1, y1, depth + 1);
			} else {
				addQuad(x0, y0, x1, cy, depth + 1);
				addQuad(x0, cy, x1, y1, depth + 1);
			}
			return;
		}

		// 分割不要 → 2つの三角形に分解
		const sMid = getSourceCoord(cx, cy);

		// 左上三角形
		triangles.push({
			target: [
				[x0, y0],
				[x1, y0],
				[x0, y1]
			],
			source: [s00, s10, s01]
		});

		// 右下三角形
		triangles.push({
			target: [
				[x1, y0],
				[x1, y1],
				[x0, y1]
			],
			source: [s10, s11, s01]
		});
	};

	// タイル全体 (0,0)-(1,1) から開始
	addQuad(0, 0, 1, 1, 0);

	// ソース空間の包含矩形を計算
	let sMinX = Infinity,
		sMinY = Infinity,
		sMaxX = -Infinity,
		sMaxY = -Infinity;
	for (const [, coord] of cache) {
		if (coord[0] < sMinX) sMinX = coord[0];
		if (coord[1] < sMinY) sMinY = coord[1];
		if (coord[0] > sMaxX) sMaxX = coord[0];
		if (coord[1] > sMaxY) sMaxY = coord[1];
	}

	return {
		triangles,
		sourceExtent: [sMinX, sMinY, sMaxX, sMaxY]
	};
};
