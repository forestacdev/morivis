import { decompressRobloxChunk } from './compression';
import {
	instancesToWorld,
	type RobloxInstance,
	type RobloxVector,
	supportedClasses,
	textureClasses
} from './world';

const decoder = new TextDecoder();
const signature = [60, 114, 111, 98, 108, 111, 120, 33, 137, 255, 13, 10, 26, 10];
const fail = (message: string): never => {
	throw new Error(`RBXL: ${message}`);
};
const reader = (bytes: Uint8Array) => {
	let offset = 0;
	const take = (size: number) => {
		if (size < 0 || !Number.isSafeInteger(size) || offset + size > bytes.length) {
			fail('データが途中で終わっています。');
		}
		const slice = bytes.subarray(offset, offset + size);
		offset += size;
		return slice;
	};
	const view = (size: number) => {
		const data = take(size);
		return new DataView(data.buffer, data.byteOffset, size);
	};
	const u8 = () => take(1)[0];
	const u16 = () => view(2).getUint16(0, true);
	const u32 = () => view(4).getUint32(0, true);
	const f32 = () => view(4).getFloat32(0, true);
	const f64 = () => view(8).getFloat64(0, true);
	const stringBytes = () => take(u32());
	const string = () => decoder.decode(stringBytes());
	const integers = (count: number) => {
		const data = take(count * 4);
		return Array.from(
			{ length: count },
			(_, i) =>
				(data[i] << 24 | data[count + i] << 16 | data[2 * count + i] << 8
					| data[3 * count + i]) >>> 0
		);
	};
	const floats = (count: number) => {
		const scratch = new DataView(new ArrayBuffer(4));
		return integers(count).map(value => {
			scratch.setUint32(0, value >>> 1 | value << 31, true);
			return scratch.getFloat32(0, true);
		});
	};
	const referents = (count: number) => {
		let total = 0;
		return integers(count).map(value => {
			total += (value >>> 1) ^ -(value & 1);
			return total;
		});
	};
	const vectors = (count: number): RobloxVector[] => {
		const x = floats(count), y = floats(count), z = floats(count);
		return x.map((value, i) => [value, y[i], z[i]]);
	};
	return {
		take,
		u8,
		u16,
		u32,
		f32,
		f64,
		stringBytes,
		string,
		integers,
		floats,
		referents,
		vectors,
		remaining: () => bytes.length - offset,
		finish: () => {
			if (offset !== bytes.length) fail('チャンクに余分なデータがあります。');
		}
	};
};
type Reader = ReturnType<typeof reader>;

/** 24通りの直交回転。IDは右軸と上軸の方向番号から決まる。 */
export const readBasicRotation = (id: number): number[] => {
	const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]];
	const x = axes[Math.floor((id - 1) / 6)], y = axes[(id - 1) % 6];
	if (!x || !y || x.some((value, i) => value !== 0 && y[i] !== 0)) {
		return fail('CFrameの回転IDが不正です。');
	}
	const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
	return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

const partProperties = new Set([
	'Material',
	'MaterialVariant',
	'MaterialVariantSerialized',
	'size',
	'Size',
	'CFrame',
	'Color3uint8',
	'Color',
	'shape',
	'Shape',
	'Transparency',
	'BrickColor',
	'MeshId',
	'TextureID',
	'TextureContent'
]);
const textureProperties = new Set([
	'Name',
	'BaseMaterial',
	'StudsPerTile',
	'MaterialPattern',
	'AlphaMode',
	'NormalMap',
	'NormalMapContent',
	'RoughnessMap',
	'RoughnessMapContent',
	'MetalnessMap',
	'MetalnessMapContent',
	'Texture',
	'TextureContent',
	'ColorMap',
	'ColorMapContent',
	'Color3',
	'Color',
	'Transparency',
	'Face',
	'StudsPerTileU',
	'StudsPerTileV',
	'OffsetStudsU',
	'OffsetStudsV',
	'ZIndex'
]);
const stringKeys = {
	Name: 'name',
	MaterialVariant: 'materialVariant',
	MaterialVariantSerialized: 'materialVariant',
	NormalMap: 'normalMap',
	NormalMapContent: 'normalMap',
	RoughnessMap: 'roughnessMap',
	RoughnessMapContent: 'roughnessMap',
	MetalnessMap: 'metalnessMap',
	MetalnessMapContent: 'metalnessMap',
	Texture: 'texture',
	TextureContent: 'texture',
	MeshId: 'meshId',
	TextureID: 'textureId',
	ColorMap: 'colorMap',
	ColorMapContent: 'colorMap'
} as const;
const numberKeys = {
	Material: 'material',
	BaseMaterial: 'material',
	StudsPerTile: 'studsPerTile',
	MaterialPattern: 'materialPattern',
	AlphaMode: 'alphaMode',
	Face: 'face',
	StudsPerTileU: 'tileU',
	StudsPerTileV: 'tileV',
	OffsetStudsU: 'offsetU',
	OffsetStudsV: 'offsetV',
	ZIndex: 'zIndex'
} as const;
const terrainProperties = new Set(['SmoothGrid', 'ClusterGrid', 'PhysicsGrid']);
const applyProperty = (
	data: Reader,
	name: string,
	type: number,
	nodes: RobloxInstance[],
	sharedLengths: number[]
) => {
	const count = nodes.length;
	if (nodes[0]?.className === 'MaterialService') {
		if (name === 'Use2022Materials' && type === 0x02) {
			for (const node of nodes) node.use2022Materials = data.u8() !== 0;
		} else if (name.endsWith('Name') && type === 0x01) {
			for (const node of nodes) (node.materialOverrides ??= {})[name] = data.string();
		} else fail(`MaterialService.${name} のプロパティ型 ${type} は未対応です。`);
	} else if (name in stringKeys) {
		const key = name === 'TextureContent' && nodes[0]?.className === 'MeshPart'
			? 'textureId'
			: stringKeys[name as keyof typeof stringKeys];
		if (type === 0x01) {
			for (const node of nodes) node[key] = data.string();
		} else if (type === 0x22) {
			const sources = data.integers(count);
			const uriCount = data.u32();
			if (uriCount > count) fail('ContentのURI数が不正です。');
			const uris = Array.from({ length: uriCount }, () => data.string());
			data.referents(data.u32());
			data.referents(data.u32());
			let uri = 0;
			sources.forEach((source, i) => {
				if (source === 1) {
					if (uri >= uris.length) fail('ContentのURIが不足しています。');
					nodes[i][key] = uris[uri++];
				}
			});
			if (uri !== uris.length) fail('ContentのURI数が一致しません。');
		} else fail(`${name} のプロパティ型 ${type} は未対応です。`);
	} else if (name in numberKeys) {
		const key = numberKeys[name as keyof typeof numberKeys];
		const values = type === 0x04
			? data.floats(count)
			: type === 0x12
			? data.integers(count)
			: type === 0x03
			? data.integers(count).map(v => (v >>> 1) ^ -(v & 1))
			: fail(`${name} のプロパティ型 ${type} は未対応です。`);
		values.forEach((value, i) => {
			nodes[i][key] = value;
		});
	} else if (terrainProperties.has(name)) {
		if (type === 0x01) {
			for (const node of nodes) {
				const hasData = data.stringBytes().length > 0;
				node.terrainData = node.terrainData || hasData;
			}
		} else if (type === 0x1c) {
			data.integers(count).forEach((index, i) => {
				if (sharedLengths[index] === undefined) fail('共有文字列の参照先がありません。');
				nodes[i].terrainData ||= sharedLengths[index] > 0;
			});
		} else fail(`Terrainのプロパティ型 ${type} は未対応です。`);
	} else if (name === 'CFrame' && type === 0x10) {
		for (const node of nodes) {
			const id = data.u8();
			node.rotation = id === 0
				? Array.from({ length: 9 }, () => data.f32())
				: readBasicRotation(id);
		}
		data.vectors(count).forEach((position, i) => {
			nodes[i].position = position;
		});
	} else if ((name === 'size' || name === 'Size') && type === 0x0e) {
		data.vectors(count).forEach((size, i) => {
			nodes[i].size = size;
		});
	} else if ((name === 'Color3uint8' || name === 'Color') && type === 0x1a) {
		const r = data.take(count), g = data.take(count), b = data.take(count);
		for (let i = 0; i < count; i++) nodes[i].color = [r[i] / 255, g[i] / 255, b[i] / 255];
	} else if ((name === 'Color' || name === 'Color3uint8' || name === 'Color3') && type === 0x0c) {
		data.vectors(count).forEach((color, i) => {
			nodes[i].color = color;
		});
	} else if ((name === 'shape' || name === 'Shape') && type === 0x12) {
		data.integers(count).forEach((shape, i) => {
			nodes[i].shape = shape;
		});
	} else if (name === 'Transparency' && (type === 0x04 || type === 0x05)) {
		const values = type === 0x04
			? data.floats(count)
			: Array.from({ length: count }, () => data.f64());
		values.forEach((transparency, i) => {
			nodes[i].transparency = transparency;
		});
	} else if (name === 'BrickColor' && (type === 0x0b || type === 0x03)) {
		data.take(count * 4);
		nodes.forEach(node => {
			node.legacyColor = true;
		});
	} else fail(`${name} のプロパティ型 ${type} は未対応です。`);
	data.finish();
};

/** Binary version 0。チャンクごとに展開し、描画用プロパティ以外の型は解釈せずスキップする。 */
export const parseRbxl = async (bytes: Uint8Array) => {
	const file = reader(bytes);
	if (!file.take(14).every((byte, i) => byte === signature[i])) {
		fail('Robloxのバイナリ形式ではありません。');
	}
	if (file.u16() !== 0) fail('このバイナリバージョンは未対応です。');
	const classCount = file.u32(), instanceCount = file.u32();
	file.take(8);
	const classes = new Map<number, RobloxInstance[]>();
	const instances = new Map<number, RobloxInstance>();
	const parents = new Map<number, number>();
	const sharedLengths: number[] = [];
	let hasEnd = false, hasParents = false;
	while (file.remaining()) {
		const kind = decoder.decode(file.take(4)).replace(/\0/g, '');
		const compressedSize = file.u32(), size = file.u32();
		file.take(4);
		const payload = file.take(compressedSize || size);
		if (!['INST', 'PROP', 'PRNT', 'SSTR', 'END'].includes(kind)) continue;
		const data = reader(compressedSize ? await decompressRobloxChunk(payload, size) : payload);
		if (kind === 'INST') {
			const id = data.u32(),
				className = data.string(),
				service = data.u8(),
				count = data.u32();
			if (
				classes.has(id) || classes.size >= classCount
				|| count > instanceCount - instances.size || service > 1
			) fail('クラスまたはインスタンス数が不正です。');
			const nodes = data.referents(count).map(ref => {
				if (ref < 0 || ref > 0x7fffffff || instances.has(ref)) {
					return fail('インスタンスの参照IDが不正です。');
				}
				const node: RobloxInstance = { className, children: [] };
				instances.set(ref, node);
				return node;
			});
			if (service) data.take(count);
			data.finish();
			classes.set(id, nodes);
		} else if (kind === 'PROP') {
			const id = data.u32(), name = data.string(), type = data.u8();
			const nodes = classes.get(id);
			if (!nodes) fail('プロパティのクラスが見つかりません。');
			const className = nodes![0]?.className;
			if (
				className
				&& ((supportedClasses.has(className) && partProperties.has(name))
					|| (textureClasses.has(className) && textureProperties.has(name))
					|| (className === 'MaterialService'
						&& (name === 'Use2022Materials' || name.endsWith('Name')))
					|| (className === 'Terrain' && terrainProperties.has(name)))
			) applyProperty(data, name, type, nodes!, sharedLengths);
		} else if (kind === 'PRNT') {
			if (hasParents || data.u8() !== 0) fail('親子関係のバージョンが不正です。');
			hasParents = true;
			const count = data.u32();
			if (count !== instanceCount) fail('親子関係の件数が一致しません。');
			const children = data.referents(count), refs = data.referents(count);
			children.forEach((ref, i) => {
				if (
					!instances.has(ref) || parents.has(ref)
					|| (refs[i] !== -1 && !instances.has(refs[i]))
				) fail('親子関係の参照先が不正です。');
				parents.set(ref, refs[i]);
			});
			data.finish();
		} else if (kind === 'SSTR') {
			if (sharedLengths.length || data.u32() !== 0) {
				fail('共有文字列のバージョンが不正です。');
			}
			const count = data.u32();
			if (count > data.remaining() / 20) fail('共有文字列の件数が不正です。');
			for (let i = 0; i < count; i++) {
				data.take(16);
				sharedLengths.push(data.stringBytes().length);
			}
			data.finish();
		} else {
			if (compressedSize || decoder.decode(data.take(9)) !== '</roblox>') {
				fail('終端チャンクが不正です。');
			}
			data.finish();
			hasEnd = true;
			file.finish();
			break;
		}
	}
	if (!hasEnd || !hasParents || classes.size !== classCount || instances.size !== instanceCount) {
		fail('ワールドのチャンクが不足しています。');
	}
	// 一度解決した経路は再走査せず、閉路も検出して不正な階層での無限ループを防ぐ。
	const resolved = new Set<number>();
	for (const ref of instances.keys()) {
		const chain = new Set<number>();
		let current = ref;
		while (current !== -1 && !resolved.has(current)) {
			if (chain.has(current)) fail('親子関係が循環しています。');
			chain.add(current);
			current = parents.get(current)!;
		}
		for (const item of chain) resolved.add(item);
	}
	const roots: RobloxInstance[] = [];
	for (const [ref, node] of instances) {
		const parent = parents.get(ref)!;
		if (parent === -1) roots.push(node);
		else instances.get(parent)!.children.push(node);
	}
	return instancesToWorld(roots);
};
