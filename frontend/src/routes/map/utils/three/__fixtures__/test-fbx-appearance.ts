import JSZip from 'jszip';

type Node = { name: string; values?: Array<string | number | bigint>; children?: Node[]; };

export const TEST_ASSET_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_IMAGE_ID = '00000000-0000-4000-8000-000000000002';
export const TEST_MASK_ID = '00000000-0000-4000-8000-000000000003';

const join = (parts: Uint8Array[]) => {
	const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let offset = 0;
	parts.forEach((part) => {
		result.set(part, offset);
		offset += part.length;
	});
	return result;
};

const property = (value: string | number | bigint) => {
	if (typeof value === 'string') {
		const bytes = new TextEncoder().encode(value);
		const result = new Uint8Array(bytes.length + 5);
		result[0] = 83;
		new DataView(result.buffer).setUint32(1, bytes.length, true);
		result.set(bytes, 5);
		return result;
	}
	const result = new Uint8Array(9);
	result[0] = typeof value === 'bigint' ? 76 : 68;
	const view = new DataView(result.buffer);
	if (typeof value === 'bigint') view.setBigInt64(1, value, true);
	else view.setFloat64(1, value, true);
	return result;
};

export const createTestFbxAppearance = (version = 7700, materialName = 'test-color') => {
	const width = version >= 7500 ? 8 : 4;
	const headerLength = width * 3 + 1;
	const encode = (node: Node, offset: number): Uint8Array => {
		const name = new TextEncoder().encode(node.name);
		const values = join((node.values ?? []).map(property));
		let end = offset + headerLength + name.length + values.length;
		const children = (node.children ?? []).map((child) => {
			const bytes = encode(child, end);
			end += bytes.length;
			return bytes;
		});
		end += headerLength;
		const header = new Uint8Array(headerLength);
		const view = new DataView(header.buffer);
		[end, node.values?.length ?? 0, values.length].forEach((value, index) => {
			if (width === 8) view.setBigUint64(index * width, BigInt(value), true);
			else view.setUint32(index * width, value, true);
		});
		header[headerLength - 1] = name.length;
		return join([header, name, values, ...children, new Uint8Array(headerLength)]);
	};
	const nodes: Node[] = [
		{
			name: 'Objects',
			children: [
				{ name: 'Model', values: [1n, 'test-curve', 'NurbsCurve'] },
				{ name: 'Model', values: [2n, 'test-surface', 'Mesh'] },
				{ name: 'Model', values: [3n, 'test-untextured-surface', 'Mesh'] },
				{
					name: 'Material',
					values: [10n, materialName, ''],
					children: [{
						name: 'Properties70',
						children: [{
							name: 'P',
							values: ['DiffuseColor', 'Color', '', 'A', 0.25, 0.75, 0.5]
						}]
					}]
				},
				{
					name: 'Object',
					values: [20n, 'ProxyObject_test', ''],
					children: [{
						name: 'Properties70',
						children: [{
							name: 'P',
							values: ['ADSKAssetReferenceID', 'KString', '', '', TEST_ASSET_ID]
						}]
					}]
				}
			]
		},
		{
			name: 'Connections',
			children: [
				{ name: 'C', values: ['OO', 10n, 1n] },
				{ name: 'C', values: ['OO', 20n, 2n] },
				{ name: 'C', values: ['OP', 20n, 3n, 'test-property'] }
			]
		}
	];
	const header = new Uint8Array(27);
	header.set(new TextEncoder().encode('Kaydara FBX Binary  '));
	header.set([0, 0x1a, 0], 20);
	new DataView(header.buffer).setUint32(23, version, true);
	let offset = header.length;
	const body = nodes.map((node) => {
		const bytes = encode(node, offset);
		offset += bytes.length;
		return bytes;
	});
	return join([header, ...body, new Uint8Array(headerLength)]).buffer;
};

// 画像デコードはテストで差し替える。内容も識別子も実データを使わない。
export const appendTestFbxPackage = async (buffer: ArrayBuffer, cutout = false) => {
	const zip = new JSZip();
	zip.file(
		'test/AssetData/InstanceProperties.bin',
		`${TEST_ASSET_ID}\0${cutout ? TEST_MASK_ID : TEST_IMAGE_ID}`
	);
	zip.file(`test/Resources/${TEST_IMAGE_ID}/test-b_color_png`, new Uint8Array([1, 2, 3]));
	if (cutout) {
		zip.file(`test/Resources/${TEST_MASK_ID}/test-cutout_color_png`, new Uint8Array([4, 5, 6]));
	}
	const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
	// ZIP以降にFBXノード等が続いても読み取れるようにする。
	return join([new Uint8Array(buffer), bytes, new Uint8Array(32)]).buffer;
};
