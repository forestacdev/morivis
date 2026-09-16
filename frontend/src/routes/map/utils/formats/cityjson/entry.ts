import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
import type { CityJsonResult } from '.';

export const createCityJsonEntry = (name: string, result: CityJsonResult) => {
	const entry = createGeoJson3DEntry(name, result.geojson, 'Polygon', result.bounds);
	entry.metaData.attribution = 'CityJSON';
	entry.metaData.description =
		'CityJSONから変換した標高付きの都市モデル面群。建物や地形などの立体形状と属性を地図上で確認するために利用できる。';
	entry.style.color = '#c8cbd0';
	entry.style.opacity = 1;
	return entry;
};
