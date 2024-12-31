import { GeoDataEntry } from '$map/data';

/**
 * minからmaxまでを指定した分割数で分割し、数値の配列を生成する関数
 *
 * @param min 最小値
 * @param max 最大値
 * @param divisions 分割数
 * @returns 数値の配列
 */
function generateNumberMap(min: number, max: number, divisions: number): number[] {
	if (divisions <= 0) {
		throw new Error('divisions must be greater than 0');
	}

	const step = (max - min) / divisions; // 分割ごとの間隔
	const result: number[] = [];

	for (let i = 0; i <= divisions; i++) {
		result.push(min + step * i);
	}

	return result;
}

const min = 0;
const max = 100;
const divisions = 5;

const numberMap = generateNumberMap(min, max, divisions);
// console.log(numberMap); // [ 0, 20, 40, 60, 80, 100 ]

function dynamicTemplate(template: string, data: Record<string, any>): string {
	return template.replace(/{([^{}]+)}/g, (_, key) => {
		return data[key] !== undefined ? data[key] : `{${key}}`;
	});
}

const template = '{小林班ID}の土地で面積は{面積}です';
const data = {
	面積: 20,
	小林班ID: 6
};

const result = dynamicTemplate(template, data);
console.log(result);

export const createSourceItems = (dataEntries: GeoDataEntry) => {
	const sourceItems: { [_: string]: SourceSpecification } = {};

	return sourceItems;

	layerDataEntries.forEach((layerEntry) => {
		const sourceId = `${layerEntry.id}_source`;

		if (layerEntry.dataType === 'raster') {
			if (layerEntry.geometryType === 'raster') {
				sourceItems[sourceId] = {
					type: 'raster',
					tiles: [layerEntry.url],
					maxzoom: layerEntry.sourceMaxZoom ? layerEntry.sourceMaxZoom : 24,
					minzoom: layerEntry.sourceMinZoom ? layerEntry.sourceMinZoom : 0,
					tileSize: 256,
					attribution: layerEntry.attribution,
					bounds: layerEntry.bbox ?? [-180, -85.051129, 180, 85.051129]
				};
			} else if (layerEntry.geometryType === 'dem') {
				const demData = demLayers.find((layer) => layer.id === layerEntry.tileId);
				if (!demData) {
					console.warn(`Unknown: ${layerEntry.tileId}`);
					return;
				}
				demEntry.name = demData.name;
				demEntry.url = demData.tiles[0];
				demEntry.demType = demData.demType;
				demEntry.sourceMaxZoom = demData.maxzoom;
				demEntry.sourceMinZoom = demData.minzoom;
				demEntry.attribution = demData.attribution;
				demEntry.location = demData.location;
				demEntry.bbox = demData.bbox ?? [-180, -85.051129, 180, 85.051129];
				demEntry.tileId = demData.id;

				sourceItems[sourceId] = {
					type: 'raster',
					tiles: [`${layerEntry.protocolKey}://${demData.tiles[0]}`],
					maxzoom: demData.maxzoom ? demData.maxzoom : 24,
					minzoom: demData.minzoom ? demData.minzoom : 0,
					tileSize: 256,
					attribution: demData.attribution,
					bounds: demData.bbox ?? [-180, -85.051129, 180, 85.051129]
				};
			}
		} else if (layerEntry.dataType === 'vector') {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.url],
				maxzoom: layerEntry.sourceMaxZoom ? layerEntry.sourceMaxZoom : 24,
				minzoom: layerEntry.sourceMinZoom ? layerEntry.sourceMinZoom : 0,
				attribution: layerEntry.attribution,
				promoteId: layerEntry.idField ?? undefined
			};
		} else if (layerEntry.dataType === 'geojson') {
			sourceItems[sourceId] = {
				type: 'geojson',
				data: layerEntry.url,
				generateId: true,
				attribution: layerEntry.attribution
			};
		} else {
			console.warn(`Unknown layer: ${sourceId}`);
		}
	});

	return sourceItems;
};
