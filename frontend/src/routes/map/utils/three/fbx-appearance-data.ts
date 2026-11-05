type FbxValue = string | number | null;

interface FbxNode {
	name: string;
	values: FbxValue[];
	children: FbxNode[];
}

export interface FbxAppearanceData {
	colorsByModel: Map<string, [number, number, number]>;
	assetsByModel: Map<string, string>;
}

// 形状・画像の配列は展開せず、材質と接続だけを読む。
const readNodes = (buffer: ArrayBuffer): FbxNode[] => {
	const bytes = new Uint8Array(buffer);
	const decoder = new TextDecoder();
	if (bytes.length < 27 || decoder.decode(bytes.subarray(0, 20)) !== 'Kaydara FBX Binary  ') {
		return [];
	}
	const view = new DataView(buffer);
	const wide = view.getUint32(23, true) >= 7500;
	const width = wide ? 8 : 4;
	const header = width * 3 + 1;
	const readOffset = (offset: number) =>
		wide
			? Number(view.getBigUint64(offset, true))
			: view.getUint32(offset, true);
	const parse = (start: number, limit: number, depth: number): FbxNode[] => {
		const nodes: FbxNode[] = [];
		if (depth > 16) return nodes;
		let offset = start;
		while (offset + header <= limit) {
			const end = readOffset(offset);
			if (!end) break;
			const nameEnd = offset + header + bytes[offset + header - 1];
			const propertyEnd = nameEnd + readOffset(offset + width * 2);
			if (!Number.isSafeInteger(end) || end <= offset || end > limit || propertyEnd > end) {
				break;
			}
			const name = decoder.decode(bytes.subarray(offset + header, nameEnd));
			if (
				!['Objects', 'Connections', 'Model', 'Material', 'Object', 'Properties70', 'P', 'C']
					.includes(name)
			) {
				offset = end;
				continue;
			}
			const values: FbxValue[] = [];
			let cursor = nameEnd;
			const requireBytes = (length: number) => {
				if (cursor + length > propertyEnd) throw new Error('Truncated FBX property');
			};
			while (cursor < propertyEnd) {
				const type = String.fromCharCode(bytes[cursor++]);
				const sizes: Record<string, number> = { Y: 2, C: 1, I: 4, F: 4, D: 8, L: 8 };
				if (type in sizes) {
					requireBytes(sizes[type]);
					const value = type === 'L'
						? String(view.getBigInt64(cursor, true))
						: type === 'D'
						? view.getFloat64(cursor, true)
						: type === 'F'
						? view.getFloat32(cursor, true)
						: type === 'I'
						? view.getInt32(cursor, true)
						: type === 'Y'
						? view.getInt16(cursor, true)
						: view.getUint8(cursor);
					values.push(value);
					cursor += sizes[type];
				} else if (type === 'S' || type === 'R') {
					requireBytes(4);
					const length = view.getUint32(cursor, true);
					cursor += 4;
					requireBytes(length);
					values.push(
						type === 'S'
							? decoder.decode(bytes.subarray(cursor, cursor + length))
							: null
					);
					cursor += length;
				} else if ('fdilbc'.includes(type)) {
					requireBytes(12);
					const length = view.getUint32(cursor + 8, true);
					cursor += 12;
					requireBytes(length);
					cursor += length;
					values.push(null);
				} else {
					break;
				}
			}
			nodes.push({ name, values, children: parse(propertyEnd, end, depth + 1) });
			offset = end;
		}
		return nodes;
	};
	try {
		return parse(27, bytes.length, 0);
	} catch {
		return [];
	}
};

/** FBXLoaderが曲線に適用しない材質色と、Navisworksの画像アセット接続。 */
export const parseFbxAppearanceData = (buffer: ArrayBuffer): FbxAppearanceData => {
	const nodes = readNodes(buffer);
	const models = new Set<string>();
	const colors = new Map<string, [number, number, number]>();
	const assets = new Map<string, string>();
	for (const node of nodes.find((node) => node.name === 'Objects')?.children ?? []) {
		const id = String(node.values[0]);
		if (node.name === 'Model') models.add(id);
		const properties = node.children.find((child) => child.name === 'Properties70')?.children
			?? [];
		if (node.name === 'Material') {
			const rgb = properties.find((p) => p.values[0] === 'DiffuseColor')?.values.slice(4, 7);
			if (
				rgb?.length === 3
				&& rgb.every((value) => typeof value === 'number' && Number.isFinite(value))
			) {
				colors.set(id, rgb as [number, number, number]);
			}
		}
		if (node.name === 'Object' && String(node.values[1]).startsWith('ProxyObject')) {
			const asset = properties.find((p) => p.values[0] === 'ADSKAssetReferenceID')?.values[4];
			if (typeof asset === 'string' && asset) assets.set(id, asset.toUpperCase());
		}
	}
	const colorsByModel: FbxAppearanceData['colorsByModel'] = new Map();
	const assetsByModel = new Map<string, string>();
	for (const connection of nodes.find((node) => node.name === 'Connections')?.children ?? []) {
		const [kind, child, parent] = connection.values;
		if (connection.name !== 'C' || kind !== 'OO' || !models.has(String(parent))) continue;
		const color = colors.get(String(child));
		if (color && !colorsByModel.has(String(parent))) colorsByModel.set(String(parent), color);
		const asset = assets.get(String(child));
		if (asset) assetsByModel.set(String(parent), asset);
	}
	return { colorsByModel, assetsByModel };
};
