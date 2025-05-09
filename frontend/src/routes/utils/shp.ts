import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import * as shapefile from 'shapefile';
import {
	convertCoordinates,
	flattenCoordinates,
	getProj4,
	unflattenCoordinates
} from '$routes/utils/proj';
import proj4 from 'proj4';

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
	const shpData = await loadBinaryFile(shp);
	const dbfData = await loadBinaryFile(dbf);
	const prjContent = await getProj4(prj);
	const geojson = await shapefile.read(shpData, dbfData, {
		encoding: 'shift-jis'
	});

	geojson.features.forEach((feature) => {
		const originalCoordinates = JSON.parse(JSON.stringify(feature.geometry.coordinates)); // 元の構造を保持
		const flattenedCoordinates = flattenCoordinates(feature.geometry.coordinates);
		const convertedFlattened = [];
		for (let i = 0; i < flattenedCoordinates.length; i += 2) {
			const converted = proj4(prjContent, 'EPSG:4326', [
				flattenedCoordinates[i],
				flattenedCoordinates[i + 1]
			]);
			convertedFlattened.push(...converted);
		}
		feature.geometry.coordinates = unflattenCoordinates(convertedFlattened, originalCoordinates);
	});

	// geojson.features.forEach((feature) => {
	// 	feature.geometry.coordinates = convertCoordinates(feature.geometry.coordinates, prjContent);
	// });
	return geojson;
};
