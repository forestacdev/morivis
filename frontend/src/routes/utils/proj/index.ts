import proj4 from 'proj4';
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

export const readPrjFileContent = async (prjFile: File) => {
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

export const isWgs84Prj = (prjContent: string): boolean => {
	if (!prjContent) {
		return false;
	}

	const prjContentUpper = prjContent.toUpperCase();

	// WKT 形式の可能性をチェック
	if (
		prjContentUpper.includes('GCS_WGS_1984') &&
		prjContentUpper.includes('D_WGS_1984') &&
		prjContentUpper.includes('WGS_1984') &&
		prjContentUpper.includes('PRIMEM["GREENWICH"') &&
		prjContentUpper.includes('UNIT["DEGREE"')
	) {
		return true;
	}

	// PROJ.4 形式の可能性をチェック
	if (prjContentUpper.includes('+PROJ=LONGLAT') && prjContentUpper.includes('+DATUM=WGS84')) {
		return true;
	}

	return false;
};

export const isWgs84Crs = (crs: any): boolean => {
	if (!crs) {
		return false; // CRS 情報がない場合
	}

	if (crs.type === 'name' && crs.properties && crs.properties.name) {
		const name = crs.properties.name;
		// よく使われる CRS 名を proj4 の定義に変換
		if (name === 'urn:ogc:def:crs:EPSG::4326' || name === 'EPSG:4326') {
			return true; // WGS84
		}
		// 他の CRS 名に対応する場合はここに追加
		// 例: if (name === 'urn:ogc:def:crs:OGC:1.3:CRS84') { ... }
	} else if (crs.type === 'proj4') {
		// PROJ.4 形式の場合
		const proj4Definition = crs.proj4;
		if (proj4Definition.includes('+proj=longlat') && proj4Definition.includes('+datum=WGS84')) {
			return true; // WGS84
		}
	} else if (crs.type === 'wkt') {
		// WKT 形式の場合
		const wktDefinition = crs.wkt;
		if (wktDefinition.includes('GCS_WGS_1984') && wktDefinition.includes('D_WGS_1984')) {
			return true; // WGS84
		}
	}
	// 他の CRS タイプに対応する場合はここに追加

	return false; // WGS84 ではない
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
