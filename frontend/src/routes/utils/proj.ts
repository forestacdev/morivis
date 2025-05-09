import { geojson } from 'flatgeobuf';
import proj4 from 'proj4';

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

// 座標系変換関数
export const convertCoordinates = (
	coordinates: Array<Array<number>>,
	firstProjectionDefinition: string, // PROJ.4 または WKT 文字列
	secondProjection = 'EPSG:4326'
) => {
	return coordinates.map((coordinate) => {
		if (Array.isArray(coordinate[0])) {
			return convertCoordinates(coordinate, firstProjectionDefinition, secondProjection);
		} else {
			return proj4(firstProjectionDefinition, secondProjection, coordinate);
		}
	});
};

export const flattenCoordinates = (coordinates: any, flattened: number[] = []) => {
	coordinates.forEach((coord: any) => {
		if (Array.isArray(coord[0])) {
			flattenCoordinates(coord, flattened);
		} else {
			flattened.push(...coord);
		}
	});
	return flattened;
};

export const unflattenCoordinates = (flattened: number[], originalStructure: any): any => {
	const result: any = [];
	let index = 0;

	const unflattenRecursive = (structure: any) => {
		return structure.map((item: any) => {
			if (Array.isArray(item[0])) {
				return unflattenRecursive(item);
			} else {
				const coord = flattened.slice(index, index + item.length);
				index += item.length;
				return coord;
			}
		});
	};

	return unflattenRecursive(originalStructure);
};
