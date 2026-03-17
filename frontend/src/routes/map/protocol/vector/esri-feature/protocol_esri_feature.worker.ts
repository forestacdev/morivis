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
				{ geojsonLayer: tile as any },
				{
					version: 2
				}
			);

			self.postMessage({ id, buffer: pbf });
		} else {
			self.postMessage({ id, error: 'Tile not found' });
		}
	} catch (error) {
		if (error instanceof Error) {
			self.postMessage({ id, error: error.message });
		}
	}
};
