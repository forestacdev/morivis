/** 2つの離れた架空地域。地域索引の構造だけを手作業で作る。 */
export const createTestRegionalZarr = () => {
	const files = new Map<string, Uint8Array>();
	const json = (path: string, value: unknown) =>
		files.set(path, new TextEncoder().encode(JSON.stringify(value)));
	json('zarr.json', {
		zarr_format: 3,
		node_type: 'group',
		attributes: {
			gpm: {
				version: 3,
				dtype: 'float32-le',
				order: 'x-fastest',
				noData: -1,
				max: 8,
				levels: { overview: { dimensions: [1, 1, 1] }, detail: { dimensions: [2, 2, 2] } },
				tiles: [
					{
						index: 0,
						bounds: {
							west: -40,
							south: 40,
							east: -20,
							north: 60,
							minHeight: 0,
							maxHeight: 2000
						}
					},
					{
						index: 1,
						bounds: {
							west: 20,
							south: 40,
							east: 40,
							north: 60,
							minHeight: 0,
							maxHeight: 2000
						}
					}
				]
			}
		}
	});
	for (
		const [name, dims, chunks] of [
			['overview', [1, 1, 1], [[2], [6]]],
			['detail', [2, 2, 2], [[-1, 0, 1, 2, -1, 4, -1, 3], [8, 0, 0, 0, 2, 5, 1, 0]]]
		] as const
	) {
		const shape = [...dims].reverse();
		json(`${name}/zarr.json`, {
			zarr_format: 3,
			node_type: 'array',
			shape: [2, ...shape],
			data_type: 'float32',
			chunk_grid: { name: 'regular', configuration: { chunk_shape: [1, ...shape] } },
			chunk_key_encoding: { name: 'default', configuration: { separator: '/' } },
			fill_value: -1,
			codecs: [{ name: 'bytes', configuration: { endian: 'little' } }],
			attributes: {},
			dimension_names: ['tile', 'height', 'latitude', 'longitude']
		});
		chunks.forEach((values, index) => {
			const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer);
			values.forEach((value, i) => view.setFloat32(i * 4, value, true));
			files.set(`${name}/c/${index}/0/0/0`, bytes);
		});
	}
	return files;
};
