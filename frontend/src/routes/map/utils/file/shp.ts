import type { FeatureCollection } from '$routes/map/types/geojson';
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
): Promise<FeatureCollection> => {
	const [shpData, dbfData] =
		shp && dbf
			? await Promise.all([loadBinaryFile(shp), loadBinaryFile(dbf)])
			: await Promise.all([loadBinaryFile(shp), null]);
	if (!shpData) {
		throw new Error('Failed to load .shp file');
	}

	if (!dbfData) {
		throw new Error('Failed to load .dbf file');
	}

	const geojson =
		prjContent && dbf
			? await shapefile.read(shpData, dbfData, {
					encoding: 'shift-jis'
				})
			: await shapefile.read(shpData);
	if (!geojson) {
		throw new Error('Failed to convert SHP to GeoJSON');
	}

	if (!prjContent || !dbf || isWgs84Prj(prjContent)) {
		return geojson as FeatureCollection;
	}

	const geojsonWGS84 = await transformGeoJSONParallel(geojson, prjContent);

	if (!geojsonWGS84) {
		throw new Error('Failed to convert SHP to GeoJSON');
	}

	if (!geojsonWGS84) {
		showNotification('座標系の変換に失敗しました。', 'error');
		return geojson as FeatureCollection;
	}

	return geojsonWGS84 as FeatureCollection;
};
