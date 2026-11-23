import geojsonVt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { thumbnailStyle } from './thumbnail';

export const createTestMvt = () => {
	const source = thumbnailStyle.sources['test-vector'];
	if (source.type !== 'geojson' || typeof source.data === 'string') {
		throw new Error('Invalid fixture');
	}
	const tile = geojsonVt(source.data, { maxZoom: 0 }).getTile(0, 0, 0)!;
	return new Uint8Array(vtpbf.fromGeojsonVt({
		'test-features': tile as unknown as ReturnType<typeof geojsonVt>
	}));
};

/** z=0の人工タイル1枚を持つ、無圧縮のPMTiles v3。 */
export const createTestPmtiles = (tile: Uint8Array, tileType = 1) => {
	const length: number[] = [];
	let value = tile.length;
	while (value > 127) {
		length.push((value & 127) | 128);
		value >>>= 7;
	}
	length.push(value);
	const directory = new Uint8Array([1, 0, 1, ...length, 1]);
	const metadata = new TextEncoder().encode('{}');
	const tileOffset = 127 + directory.length + metadata.length;
	const bytes = new Uint8Array(tileOffset + tile.length);
	bytes.set(new TextEncoder().encode('PMTiles'));
	bytes[7] = 3;
	const header = new DataView(bytes.buffer);
	for (
		const [offset, value] of [
			[8, 127],
			[16, directory.length],
			[24, 127 + directory.length],
			[32, metadata.length],
			[56, tileOffset],
			[64, tile.length],
			[72, 1],
			[80, 1],
			[88, 1]
		]
	) header.setBigUint64(offset, BigInt(value), true);
	bytes.set([1, 1, 1, tileType], 96);
	for (const [offset, value] of [[102, -180], [106, -85], [110, 180], [114, 85]]) {
		header.setInt32(offset, value * 1e7, true);
	}
	bytes.set(directory, 127);
	bytes.set(metadata, 127 + directory.length);
	bytes.set(tile, tileOffset);
	return bytes;
};
