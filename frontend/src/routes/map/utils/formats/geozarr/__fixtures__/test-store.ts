/** 人工の4×4格子。実データの配列・座標を含まない。 */
export const createTestZarrStore = (version: 2 | 3, transpose = false, rootArray = false) => {
	const files = new Map<string, Uint8Array>();
	const json = (path: string, value: unknown) =>
		files.set(path, new TextEncoder().encode(JSON.stringify(value)));
	const metadata: Record<string, unknown> = { '.zgroup': { zarr_format: 2 }, '.zattrs': {} };
	const array = (
		path: string,
		shape: number[],
		dims: string[],
		values: number[],
		attrs: Record<string, unknown> = {}
	) => {
		const prefix = path ? `${path}/` : '';
		const chunks = shape;
		if (version === 3) {
			json(`${prefix}zarr.json`, {
				zarr_format: 3,
				node_type: 'array',
				shape,
				data_type: 'float32',
				dimension_names: dims,
				chunk_grid: { name: 'regular', configuration: { chunk_shape: chunks } },
				chunk_key_encoding: { name: 'default', configuration: { separator: '/' } },
				fill_value: 0,
				codecs: [{ name: 'bytes', configuration: { endian: 'little' } }],
				attributes: attrs
			});
		} else {
			const meta = {
				zarr_format: 2,
				shape,
				chunks,
				dtype: '<f4',
				compressor: null,
				filters: null,
				fill_value: 0,
				order: 'C'
			};
			json(`${prefix}.zarray`, meta);
			json(`${prefix}.zattrs`, { ...attrs, _ARRAY_DIMENSIONS: dims });
			metadata[`${prefix}.zarray`] = meta;
			metadata[`${prefix}.zattrs`] = { ...attrs, _ARRAY_DIMENSIONS: dims };
		}
		const data = new Uint8Array(values.length * 4), view = new DataView(data.buffer);
		values.forEach((value, i) => view.setFloat32(i * 4, value, true));
		files.set(
			`${prefix}${version === 3 ? 'c/' : ''}${
				shape.map(() => '0').join(version === 3 ? '/' : '.')
			}`,
			data
		);
	};
	const values = Array.from({ length: 16 }, (_, i) => i === 0 ? -999 : i - 1);
	const stored = transpose
		? values.map((_, i) => values[(i % 4) * 4 + Math.floor(i / 4)])
		: values;
	array(
		rootArray ? '' : 'test-values',
		[4, 4],
		transpose ? ['lon', 'lat'] : ['lat', 'lon'],
		stored,
		{
			_FillValue: -999,
			scale_factor: 2,
			add_offset: 1,
			...(rootArray ? { bbox: [-20, 40, 20, 80] } : {})
		}
	);
	if (!rootArray) {
		array('lon', [4], ['lon'], [-15, -5, 5, 15]);
		array('lat', [4], ['lat'], [45, 55, 65, 75]);
		if (version === 2) {
			json('.zgroup', { zarr_format: 2 });
			json('.zattrs', {});
			json('.zmetadata', { zarr_consolidated_format: 1, metadata });
		} else {
			const consolidated: Record<string, unknown> = {};
			for (const [key, data] of files) {
				if (key.endsWith('/zarr.json')) {
					consolidated[key.slice(0, -10)] = JSON.parse(new TextDecoder().decode(data));
				}
			}
			json('zarr.json', {
				zarr_format: 3,
				node_type: 'group',
				attributes: {},
				consolidated_metadata: {
					kind: 'inline',
					must_understand: false,
					metadata: consolidated
				}
			});
		}
	}
	return files;
};
