import type { Feature, FeatureCollection, Geometry } from 'geojson';

export const getUniquePropertyValues = (
	geojson: FeatureCollection,
	propertyName: string
): any[] => {
	// Set を使用してユニークな値を格納
	const uniqueValues = new Set<any>();

	// 全ての地物（Feature）をループ
	geojson.features.forEach((feature: Feature<Geometry>) => {
		if (feature.properties && propertyName in feature.properties) {
			uniqueValues.add(feature.properties[propertyName]);
		}
	});

	// Set を配列に変換して返す
	return Array.from(uniqueValues);
};
