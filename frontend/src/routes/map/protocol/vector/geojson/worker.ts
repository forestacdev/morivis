import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';

self.onmessage = async (e) => {
	const { id, z, x, y, geojson } = e.data;

	try {
		const tileIndex = geojsonvt(geojson, {
			maxZoom: 22,
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

			self.postMessage({ id: id, buffer: pbf });
		} else {
			self.postMessage({ id: id, error: 'Tile not found' });
		}
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'AbortError') {
				self.postMessage({ id: id, error: 'Request aborted' });
			} else {
				self.postMessage({ id: id, error: error.message });
			}
		}
	}
};
