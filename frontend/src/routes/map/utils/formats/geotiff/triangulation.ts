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

/** 出力画像上での許容誤差（ピクセル） */
const ERROR_PIXELS = 0.5;

/** 最大分割深度 */
const MAX_SUBDIVISION = 10;

/**
 * ターゲットタイルの三角形メッシュを生成する
 *
 * @param targetExtent ターゲットタイルのWGS84範囲 [lonMin, latMin, lonMax, latMax]
 * @param projName ソースCRSのproj4定義名（例: "EPSG:32654"）。nullなら経緯度。
 * @param targetSize 出力画像の幅と高さ（ピクセル）
 */
export const buildTriangulation = (
	targetExtent: [number, number, number, number],
	projName: string | null,
	targetSize: [number, number] = [256, 256]
): TriangulationResult => {
	const [lonMin, latMin, lonMax, latMax] = targetExtent;

	// 変換関数: WGS84 → ソースCRS
	const transform = projName
		? (lon: number, lat: number): [number, number] => {
			const [x, y] = proj4('EPSG:4326', projName, [lon, lat]);
			return [x, y];
		}
		: (lon: number, lat: number): [number, number] => [lon, lat];

	// 画面上のYは緯度ではなくWebメルカトル座標に対して等間隔。
	const northY = proj4('EPSG:4326', 'EPSG:3857', [0, latMax])[1];
	const southY = proj4('EPSG:4326', 'EPSG:3857', [0, latMin])[1];
	const toGeo = (nx: number, ny: number): [number, number] => [
		lonMin + nx * (lonMax - lonMin),
		proj4('EPSG:3857', 'EPSG:4326', [0, northY + ny * (southY - northY)])[1]
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
	const addQuad = (x0: number, y0: number, x1: number, y1: number, depth: number) => {
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;

		// 4隅のソース座標
		const s00 = getSourceCoord(x0, y0);
		const s10 = getSourceCoord(x1, y0);
		const s01 = getSourceCoord(x0, y1);
		const s11 = getSourceCoord(x1, y1);

		const corners = [s00, s10, s01, s11];
		const rangeX = Math.max(
			1e-12,
			Math.max(...corners.map(p => p[0])) - Math.min(...corners.map(p => p[0]))
		);
		const rangeY = Math.max(
			1e-12,
			Math.max(...corners.map(p => p[1])) - Math.min(...corners.map(p => p[1]))
		);
		// 中心だけでは赤道をまたぐ対称な範囲の非線形性を検出できない。
		// 三角形の対角線上の1/4・1/2・3/4点で、実際の補間誤差を測る。
		let error = 0;
		for (const t of [0.25, 0.5, 0.75]) {
			const actual = getSourceCoord(x1 - t * (x1 - x0), y0 + t * (y1 - y0));
			const interpX = s10[0] + t * (s01[0] - s10[0]);
			const interpY = s10[1] + t * (s01[1] - s10[1]);
			error = Math.max(
				error,
				Math.abs(actual[0] - interpX) / rangeX * (x1 - x0) * targetSize[0],
				Math.abs(actual[1] - interpY) / rangeY * (y1 - y0) * targetSize[1]
			);
		}

		if (depth < MAX_SUBDIVISION && error > ERROR_PIXELS) {
			// 分割
			const isWide = x1 - x0 >= y1 - y0;
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
