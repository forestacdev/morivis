export type FbxAttributeValue = string | number | boolean | Array<string | number | boolean>;
export type FbxModelAttributes = Record<string, FbxAttributeValue>;

const BINARY_HEADER_PREFIX = 'Kaydara FBX Binary  ';

export const parseFbxModelAttributes = (
	buffer: ArrayBuffer
): Record<string, FbxModelAttributes> => {
	const bytes = new Uint8Array(buffer);
	if (
		new TextDecoder().decode(bytes.subarray(0, BINARY_HEADER_PREFIX.length))
			!== BINARY_HEADER_PREFIX
	) {
		return {};
	}
	const view = new DataView(buffer);
	const decoder = new TextDecoder();
	const getString = (offset: number, length: number) =>
		decoder.decode(bytes.subarray(offset, offset + length));
	const readProperty = (offset: number): [FbxAttributeValue | null, number] => {
		const type = String.fromCharCode(view.getUint8(offset));
		offset += 1;
		if (type === 'C') return [view.getUint8(offset) !== 0, offset + 1];
		if (type === 'I') return [view.getInt32(offset, true), offset + 4];
		if (type === 'F') return [view.getFloat32(offset, true), offset + 4];
		if (type === 'D') return [view.getFloat64(offset, true), offset + 8];
		if (type === 'L') return [Number(view.getBigInt64(offset, true)), offset + 8];
		if (type === 'S') {
			const length = view.getUint32(offset, true);
			return [getString(offset + 4, length), offset + 4 + length];
		}
		if ('fdilb'.includes(type)) {
			const length = view.getUint32(offset + 8, true);
			return [null, offset + 12 + length];
		}
		if (type === 'Y') return [view.getInt16(offset, true), offset + 2];
		return [null, offset];
	};
	const attributes: Record<string, FbxModelAttributes> = {};
	const parseNode = (offset: number, modelId?: string): number => {
		if (offset + 25 > buffer.byteLength) return buffer.byteLength;
		const end = Number(view.getBigUint64(offset, true));
		if (end === 0) return offset + 25;
		if (end <= offset || end > buffer.byteLength) return buffer.byteLength;
		const propertyLength = Number(view.getBigUint64(offset + 16, true));
		const nameLength = view.getUint8(offset + 24);
		const name = getString(offset + 25, nameLength);
		let cursor = offset + 25 + nameLength;
		const propertyEnd = cursor + propertyLength;
		const values: (FbxAttributeValue | null)[] = [];
		while (cursor < propertyEnd) {
			const [value, next] = readProperty(cursor);
			values.push(value);
			cursor = next;
		}
		const currentModelId = name === 'Model' && values[0] != null ? String(values[0]) : modelId;
		if (name === 'P' && currentModelId && typeof values[0] === 'string') {
			const propertyValues = values.slice(4).filter((item): item is FbxAttributeValue =>
				item != null
			);
			const value = propertyValues.length === 1
				? propertyValues[0]
				: propertyValues.map(String).join(', ');
			if (value !== '') (attributes[currentModelId] ??= {})[values[0]] = value;
		}
		while (cursor + 25 <= end) {
			const nextOffset = parseNode(cursor, currentModelId);
			if (nextOffset <= cursor) break;
			cursor = nextOffset;
		}
		return end;
	};
	let offset = 27;
	while (offset + 25 <= buffer.byteLength) {
		const nextOffset = parseNode(offset);
		if (nextOffset <= offset) break;
		offset = nextOffset;
	}
	return attributes;
};
