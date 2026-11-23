import { decodeTile, GEOMETRY_TYPE } from '@maplibre/mlt';
import vtpbf from 'vt-pbf';

const geometryTypes = {
	[GEOMETRY_TYPE.POINT]: 1,
	[GEOMETRY_TYPE.MULTIPOINT]: 1,
	[GEOMETRY_TYPE.LINESTRING]: 2,
	[GEOMETRY_TYPE.MULTILINESTRING]: 2,
	[GEOMETRY_TYPE.POLYGON]: 3,
	[GEOMETRY_TYPE.MULTIPOLYGON]: 3
};

/** ml2drenderが読むMVTへ変換する。座標・レイヤー名・extentは元タイルを保つ。 */
export const thumbnailMltToMvt = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
	const layers = Object.fromEntries(
		decodeTile(bytes).map(table => {
			const features = table.getFeatures();
			return [table.name, {
				name: table.name,
				version: 2,
				extent: table.extent,
				length: features.length,
				feature: (index: number) => {
					const feature = features[index];
					return {
						id: typeof feature.id === 'bigint' ? Number(feature.id) : feature.id,
						type: geometryTypes[feature.geometry.type],
						properties: Object.fromEntries(
							Object.entries(feature.properties).map((
								[key, value]
							) => [key, typeof value === 'bigint' ? Number(value) : value])
						),
						loadGeometry: () => feature.geometry.coordinates
					};
				}
			}];
		})
	);
	// vt-pbfの型定義はvector-tile互換オブジェクトを表現していない。
	return new Uint8Array(vtpbf.fromVectorTileJs(
		{ layers } as unknown as Parameters<typeof vtpbf.fromVectorTileJs>[0]
	));
};
