import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
import type { PolygonFeatureCollection } from '$routes/map/types/geojson';
import type { CityGmlResult } from '.';

export const createCityGmlEntry = (name: string, result: CityGmlResult) => {
	const entry = createGeoJson3DEntry(name, result.geojson, 'Polygon', result.bounds);
	entry.metaData.attribution = 'CityGML';
	entry.metaData.description =
		'CityGMLから変換した標高付きの建物面群。建物の立体形状を地図上で確認するために利用できる。';
	entry.style.color = '#c8cbd0';
	entry.style.opacity = 1;
	return entry;
};

type Position2D = [number, number];

const projectRing = (ring: [number, number, number][]): Position2D[] =>
	ring.map(([x, y]): Position2D => [x, y]).filter((point, index, points) =>
		index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]
	);

const hasArea = (ring: Position2D[]) => {
	if (ring.length < 4) return false;
	// 原点を移して、経緯度の絶対値による桁落ちを避ける。
	const [x, y] = ring[0];
	let area = 0;
	let magnitude = 0;
	for (let index = 1; index < ring.length - 1; index++) {
		const a = (ring[index][0] - x) * (ring[index + 1][1] - y);
		const b = (ring[index + 1][0] - x) * (ring[index][1] - y);
		area += a - b;
		magnitude += Math.abs(a) + Math.abs(b);
	}
	return Math.abs(area) > Number.EPSILON * ring.length * magnitude;
};

export const createCityGml2DEntry = async (name: string, result: CityGmlResult) => {
	const geojson: PolygonFeatureCollection = {
		type: 'FeatureCollection',
		features: result.geojson.features.flatMap((feature) => {
			const coordinates = feature.geometry.coordinates.flatMap((polygon) => {
				const [exterior, ...interiors] = polygon.map(projectRing);
				return exterior && hasArea(exterior)
					? [[exterior, ...interiors.filter(hasArea)]]
					: [];
			});
			return coordinates.length
				? [{ ...feature, geometry: { type: 'MultiPolygon' as const, coordinates } }]
				: [];
		})
	};
	if (!geojson.features.length) {
		throw new Error(
			'2Dで表示できる建物の面がありません。別のLODか3Dモデルを選択してください。'
		);
	}
	const { createGeoJsonEntry } = await import('$routes/map/data/entries/vector');
	const entry = await createGeoJsonEntry(geojson, 'Polygon', name, result.bounds, undefined, {
		attribution: 'CityGML'
	});
	if (!entry) throw new Error('CityGMLの2Dレイヤーを作成できませんでした。');
	entry.metaData.description =
		'CityGMLの建物面を平面に投影したポリゴン。建物の形状や属性を地図上で確認するために利用できる。';
	return entry;
};
