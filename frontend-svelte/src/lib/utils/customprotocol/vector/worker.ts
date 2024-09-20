import turfBbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import tilebelt from '@mapbox/tilebelt';

self.onmessage = async (e) => {
	const { url } = e.data;

	try {
		const regex = /(\d+)\/(\d+)\/(\d+)\.pbf/;
		const match = url.match(regex);

		if (!match) return;
		const z: number = parseInt(match[1], 10);
		const x: number = parseInt(match[2], 10);
		const y: number = parseInt(match[3], 10);

		const childrenTiles = tilebelt.getChildren([x, y, z]);

		const geojson = {
			type: 'FeatureCollection',
			features: childrenTiles.map((tile: number[]) => {
				const bbox = tilebelt.tileToBBOX(tile);
				const feature = bboxPolygon(bbox);
				feature.properties = {
					name: `${tile[2]}/${tile[0]}/${tile[1]}`
				};
				return feature;
			})
		};

		const tileIndex = geojsonvt(geojson, {
			maxZoom: 24,
			tolerance: 3,
			extent: 4096,
			buffer: 64
		});

		const tile = tileIndex.getTile(z, x, y);

		if (tile) {
			const pbf = vtpbf.fromGeojsonVt(
				{ geojsonLayer: tile },
				{
					version: 2
				}
			);

			self.postMessage({ id: url, buffer: pbf });
		} else {
			self.postMessage({ id: url, buffer: new ArrayBuffer(0) });
		}
	} catch (error) {
		self.postMessage({ id: url, buffer: new ArrayBuffer(0) });
	}
};
