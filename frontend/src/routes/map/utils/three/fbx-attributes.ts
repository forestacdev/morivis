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
	const version = view.getUint32(23, true);
	const nodeHeaderLength = version >= 7500 ? 25 : 13;
	const getString = (offset: number, length: number) =>
		decoder.decode(bytes.subarray(offset, offset + length));
	const hasBytes = (offset: number, length: number, limit: number) =>
		Number.isSafeInteger(offset) &&
		Number.isSafeInteger(length) &&
		offset >= 0 &&
		length >= 0 &&
		offset + length <= limit &&
		offset + length <= buffer.byteLength;
	const readProperty = (offset: number, limit: number): [FbxAttributeValue | null, number] => {
		if (!hasBytes(offset, 1, limit)) return [null, limit];
		const type = String.fromCharCode(view.getUint8(offset));
		offset += 1;
		if (type === 'C' && hasBytes(offset, 1, limit)) return [view.getUint8(offset) !== 0, offset + 1];
		if (type === 'I' && hasBytes(offset, 4, limit)) return [view.getInt32(offset, true), offset + 4];
		if (type === 'F' && hasBytes(offset, 4, limit)) return [view.getFloat32(offset, true), offset + 4];
		if (type === 'D' && hasBytes(offset, 8, limit)) return [view.getFloat64(offset, true), offset + 8];
		if (type === 'L' && hasBytes(offset, 8, limit)) return [Number(view.getBigInt64(offset, true)), offset + 8];
		if (type === 'S') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const length = view.getUint32(offset, true);
			if (!hasBytes(offset + 4, length, limit)) return [null, limit];
			return [getString(offset + 4, length), offset + 4 + length];
		}
		if ('fdilb'.includes(type)) {
			if (!hasBytes(offset, 12, limit)) return [null, limit];
			const length = view.getUint32(offset + 8, true);
			return hasBytes(offset + 12, length, limit) ? [null, offset + 12 + length] : [null, limit];
		}
		if (type === 'Y' && hasBytes(offset, 2, limit)) return [view.getInt16(offset, true), offset + 2];
		return [null, limit];
	};
	const attributes: Record<string, FbxModelAttributes> = {};
	const parseNode = (offset: number, modelId?: string): number => {
		if (!hasBytes(offset, nodeHeaderLength, buffer.byteLength)) return buffer.byteLength;
		const end = version >= 7500
			? Number(view.getBigUint64(offset, true))
			: view.getUint32(offset, true);
		if (end === 0) return offset + nodeHeaderLength;
		if (end <= offset || end > buffer.byteLength) return buffer.byteLength;
		const propertyLength = version >= 7500
			? Number(view.getBigUint64(offset + 16, true))
			: view.getUint32(offset + 8, true);
		const nameLength = view.getUint8(offset + nodeHeaderLength - 1);
		const nameOffset = offset + nodeHeaderLength;
		if (!hasBytes(nameOffset, nameLength, end)) return end;
		const name = getString(nameOffset, nameLength);
		let cursor = nameOffset + nameLength;
		const propertyEnd = cursor + propertyLength;
		if (!Number.isSafeInteger(propertyEnd) || propertyEnd > end) return end;
		const values: (FbxAttributeValue | null)[] = [];
		while (cursor < propertyEnd) {
			const [value, next] = readProperty(cursor, propertyEnd);
			values.push(value);
			if (next <= cursor) return end;
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
		while (cursor + nodeHeaderLength <= end) {
			const nextOffset = parseNode(cursor, currentModelId);
			if (nextOffset <= cursor) break;
			cursor = nextOffset;
		}
		return end;
	};
	let offset = 27;
	while (offset + nodeHeaderLength <= buffer.byteLength) {
		const nextOffset = parseNode(offset);
		if (nextOffset <= offset) break;
		offset = nextOffset;
	}
	return attributes;
};
