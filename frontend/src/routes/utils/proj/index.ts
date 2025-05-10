import proj4 from 'proj4';
import { coordEach } from '@turf/meta';
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

const readPrjFileBrowser = async (file: File) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (result == null || typeof result !== 'string') {
				return;
			}
			resolve(result.trim());
		};
		reader.onerror = (error) => {
			reject(error);
		};
		reader.readAsText(file);
	});
};

export const getProj4 = async (prjFile: File) => {
	const prjContent = await readPrjFileBrowser(prjFile);

	if (typeof prjContent !== 'string') {
		throw new Error('Invalid PRJ file content');
	}

	return prjContent;
};

export const convertCoordinatesToGeojson = async (
	geojson: FeatureCollection<Geometry, GeoJsonProperties>,
	prjContent: string
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (event) => {
			resolve(event.data as FeatureCollection<Geometry, GeoJsonProperties>);
			worker.terminate(); // Worker を終了
			return geojson;
		};

		worker.onerror = (error) => {
			reject(error);
			worker.terminate(); // Worker を終了
		};

		// Worker に処理に必要なデータを送信
		worker.postMessage({ geojson, prjContent });
	});
};

// 座標系変換関数
// export const convertCoordinates = (
// 	coordinates: Array<Array<number>>,
// 	firstProjectionDefinition: string, // PROJ.4 または WKT 文字列
// 	secondProjection = 'EPSG:4326'
// ) => {
// 	return coordinates.map((coordinate) => {
// 		if (Array.isArray(coordinate[0])) {
// 			return convertCoordinates(coordinate, firstProjectionDefinition, secondProjection);
// 		} else {
// 			return proj4(firstProjectionDefinition, secondProjection, coordinate);
// 		}
// 	});
// };
