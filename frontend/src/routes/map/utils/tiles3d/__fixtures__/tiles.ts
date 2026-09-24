export const createMetadataGlb = (batched = false) => {
	const binary = new Uint8Array(72);
	new Float32Array(binary.buffer, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
	binary.set(new TextEncoder().encode('test-atest-b'), 36);
	new Uint32Array(binary.buffer, 48, 3).set([0, 6, 12]);
	new Uint32Array(binary.buffer, 60, 2).set([0, 2]);
	const metadata = {
		schema: { classes: { test: { properties: { labels: { type: 'STRING', array: true } } } } },
		propertyTables: [{
			class: 'test',
			count: 1,
			properties: { labels: { values: 1, stringOffsets: 2, arrayOffsets: 3 } }
		}]
	};
	const json = JSON.stringify({
		asset: { version: '2.0' },
		extensionsUsed: ['EXT_structural_metadata', 'EXT_mesh_features'],
		extensions: { EXT_structural_metadata: metadata },
		buffers: [{ byteLength: binary.length }],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 36 },
			{ buffer: 0, byteOffset: 36, byteLength: 12 },
			{ buffer: 0, byteOffset: 48, byteLength: 12 },
			{ buffer: 0, byteOffset: 60, byteLength: 8 },
			{ buffer: 0, byteOffset: 68, byteLength: 3 }
		],
		accessors: [{
			bufferView: 0,
			componentType: 5126,
			count: 3,
			type: 'VEC3',
			min: [0, 0, 0],
			max: [1, 1, 0]
		}, { bufferView: 4, componentType: 5121, count: 3, type: 'SCALAR' }],
		materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] } }],
		meshes: [{
			primitives: [{
				attributes: { POSITION: 0, _FEATURE_ID_0: 1, _BATCHID: 1 },
				material: 0,
				extensions: batched
					? undefined
					: {
						EXT_mesh_features: {
							featureIds: [{ attribute: 0, featureCount: 1, propertyTable: 0 }]
						}
					}
			}]
		}],
		nodes: [{ mesh: 0 }],
		scenes: [{ nodes: [0] }],
		scene: 0
	});
	const chunk = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
	const glb = new Uint8Array(28 + chunk.length + binary.length);
	const header = new DataView(glb.buffer);
	[0x46546c67, 2, glb.length, chunk.length, 0x4e4f534a].forEach((value, index) =>
		header.setUint32(index * 4, value, true)
	);
	glb.set(chunk, 20);
	header.setUint32(20 + chunk.length, binary.length, true);
	header.setUint32(24 + chunk.length, 0x004e4942, true);
	glb.set(binary, 28 + chunk.length);
	return { buffer: glb.buffer, metadata };
};

export const createBatchedTile = () => {
	const { buffer } = createMetadataGlb(true);
	const encodePadded = (value: unknown, start: number) => {
		const json = JSON.stringify(value);
		return new TextEncoder().encode(
			json.padEnd(Math.ceil((start + json.length) / 8) * 8 - start, ' ')
		);
	};
	const featureTable = encodePadded({ BATCH_LENGTH: 1 }, 28);
	const batchTable = encodePadded(
		{ name: ['test-building'], height: [12] },
		28 + featureTable.length
	);
	const tileBytes = new Uint8Array(
		28 + featureTable.length + batchTable.length + buffer.byteLength
	);
	const header = new DataView(tileBytes.buffer);
	[0x6d643362, 1, tileBytes.length, featureTable.length, 0, batchTable.length, 0].forEach((
		value,
		index
	) => header.setUint32(index * 4, value, true));
	tileBytes.set(featureTable, 28);
	tileBytes.set(batchTable, 28 + featureTable.length);
	tileBytes.set(new Uint8Array(buffer), 28 + featureTable.length + batchTable.length);
	return tileBytes.buffer;
};
