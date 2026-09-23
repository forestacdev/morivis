import type { FeatureCollection, LineString, Point } from 'geojson';

export type RegionalMeshLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type MeshBounds = [number, number, number, number];

// mesh-jp のズーム切替に合わせる。maxzoom は MapLibre と同じく上限を含まない。
export const REGIONAL_MESH_LEVELS = [
	{ level: 1, minzoom: 0, maxzoom: 8, step: 640 },
	{ level: 2, minzoom: 8, maxzoom: 11, step: 80 },
	{ level: 3, minzoom: 11, maxzoom: 14, step: 8 },
	{ level: 4, minzoom: 14, maxzoom: 15, step: 4 },
	{ level: 5, minzoom: 15, maxzoom: 16, step: 2 },
	{ level: 6, minzoom: 16, maxzoom: 24, step: 1 }
] as const;

// 日本周辺の表示範囲。陸域の有無にかかわらず区画を生成する。
export const REGIONAL_MESH_BOUNDS: MeshBounds = [122, 20, 154, 46];
const MAX_MESH_CELLS = 4096;
const snapGridBoundary = (value: number) => {
	const rounded = Math.round(value);
	return Math.abs(value - rounded) < 1e-9 ? rounded : value;
};

// 1/8メッシュを整数単位として計算し、境界の丸めによるコードの桁ずれを防ぐ。
// 経度原点は100度、緯度原点は0度。経度1単位=1/640度、緯度1単位=1/960度。
export const getRegionalMeshCode = (x: number, y: number, level: RegionalMeshLevel): string => {
	let code = `${Math.floor(y / 640).toString().padStart(2, '0')}${
		Math.floor(x / 640)
			.toString().padStart(2, '0')
	}`;
	if (level >= 2) code += `${Math.floor(y % 640 / 80)}${Math.floor(x % 640 / 80)}`;
	if (level >= 3) code += `${Math.floor(y % 80 / 8)}${Math.floor(x % 80 / 8)}`;
	for (let subdivision = 4; subdivision <= level; subdivision++) {
		const step = 2 ** (6 - subdivision);
		code += String((Math.floor(y / step) % 2) * 2 + Math.floor(x / step) % 2 + 1);
	}
	return code;
};

export const createRegionalMeshGrid = (
	level: RegionalMeshLevel,
	bounds: MeshBounds
): FeatureCollection<LineString | Point, { code: string; level: number; }> => {
	const result: FeatureCollection<LineString | Point, { code: string; level: number; }> = {
		type: 'FeatureCollection',
		features: []
	};
	if (!bounds.every(Number.isFinite)) throw new Error('Invalid regional mesh bounds');
	const [west, south, east, north] = [
		Math.max(bounds[0], REGIONAL_MESH_BOUNDS[0]),
		Math.max(bounds[1], REGIONAL_MESH_BOUNDS[1]),
		Math.min(bounds[2], REGIONAL_MESH_BOUNDS[2]),
		Math.min(bounds[3], REGIONAL_MESH_BOUNDS[3])
	];
	if (west >= east || south >= north) return result;
	const { step } = REGIONAL_MESH_LEVELS[level - 1];
	const startX = Math.floor(snapGridBoundary((west - 100) * 640 / step));
	const endX = Math.ceil(snapGridBoundary((east - 100) * 640 / step));
	const startY = Math.floor(snapGridBoundary(south * 960 / step));
	const endY = Math.ceil(snapGridBoundary(north * 960 / step));
	if ((endX - startX) * (endY - startY) > MAX_MESH_CELLS) {
		throw new Error('Regional mesh extent is too large for this level');
	}
	for (let row = startY; row < endY; row++) {
		for (let column = startX; column < endX; column++) {
			const x = column * step;
			const y = row * step;
			const left = 100 + x / 640;
			const right = 100 + (x + step) / 640;
			const bottom = y / 960;
			const top = (y + step) / 960;
			const properties = { code: getRegionalMeshCode(x, y, level), level };
			result.features.push(
				{
					type: 'Feature',
					properties,
					geometry: {
						type: 'LineString',
						coordinates: [[left, bottom], [right, bottom], [right, top], [left, top], [
							left,
							bottom
						]]
					}
				},
				{
					type: 'Feature',
					properties,
					geometry: {
						type: 'Point',
						coordinates: [(left + right) / 2, (bottom + top) / 2]
					}
				}
			);
		}
	}
	return result;
};
