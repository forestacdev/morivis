import type { FeatureCollection } from '$routes/map/types/geojson';
import { geojson as fgb } from 'flatgeobuf';

/** fgbファイルをGeoJSONで返す */
export const fgbFileToGeojson = async (file: File, index?: number): Promise<FeatureCollection> => {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const stream = new Response(arrayBuffer).body;

		if (!stream) throw new Error('ReadableStreamが作成できませんでした');

		const featureIterator = fgb.deserialize(stream);

		const geojson: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};

		if (index !== undefined) {
			let featureIndex = 0;
			for await (const feature of featureIterator) {
				if (featureIndex === index) {
					geojson.features.push(feature);
					break;
				}
				featureIndex++;
			}
		} else {
			for await (const feature of featureIterator) {
				geojson.features.push(feature);
			}
		}

		return geojson;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse FGB file');
	}
};
