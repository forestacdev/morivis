import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import * as shapefile from 'shapefile';
import { readPrjFileContent, isWgs84Prj, transformGeoJSONParallel } from '$routes/map/utils/proj';
import { showNotification } from '$routes/store/notification';

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
	dbf: File,
	prj: File
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	const [shpData, dbfData, prjContent] = await Promise.all([
		loadBinaryFile(shp),
		loadBinaryFile(dbf),
		readPrjFileContent(prj)
	]);

	const geojson = await shapefile.read(shpData, dbfData, {
		encoding: 'shift-jis'
	});

	if (!prjContent) {
		showNotification('.prj ファイルに座標系情報が含まれていません。', 'info');
		return geojson;
	}

	if (!prjContent || isWgs84Prj(prjContent)) {
		return geojson;
	}

	const geojsonWGS84 = await transformGeoJSONParallel(geojson, prjContent);

	if (!geojsonWGS84) {
		showNotification('座標系の変換に失敗しました。', 'error');
		return geojson;
	}

	return geojsonWGS84;
};
