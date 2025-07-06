import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import * as shapefile from 'shapefile';
import { isWgs84Prj, transformGeoJSONParallel } from '$routes/map/utils/proj';
import { showNotification } from '$routes/stores/notification';

const loadBinaryFile = (file: File): Promise<ArrayBuffer> => {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (result == null) {
				return;
			}
			resolve(result as ArrayBuffer);
		};
		reader.readAsArrayBuffer(file);
	});
};

export const shpFileToGeojson = async (
	shp: File,
	dbf?: File,
	prjContent?: string
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	const [shpData, dbfData] =
		shp && dbf
			? await Promise.all([loadBinaryFile(shp), loadBinaryFile(dbf)])
			: await Promise.all([loadBinaryFile(shp), null]);

	const geojson =
		prjContent && dbf
			? await shapefile.read(shpData, dbfData, {
					encoding: 'shift-jis'
				})
			: await shapefile.read(shpData);

	if (!prjContent || !dbf || isWgs84Prj(prjContent)) {
		return geojson;
	}

	const geojsonWGS84 = await transformGeoJSONParallel(geojson, prjContent);

	if (!geojsonWGS84) {
		showNotification('座標系の変換に失敗しました。', 'error');
		return geojson;
	}

	return geojsonWGS84;
};
