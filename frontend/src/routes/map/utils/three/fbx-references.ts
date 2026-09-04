const BINARY_HEADER_PREFIX = 'Kaydara FBX Binary  ';
const PATH_PROPERTY_NAMES = new Set(['RelativeFilename', 'FileName', 'Filename']);

const normalizeReferencePath = (value: string) => value.replace(/\\/g, '/').trim();

const collectTextReferences = (text: string) => {
	const relativePaths = new Set<string>();
	const filePaths = new Set<string>();
	const pattern = /^\s*(RelativeFilename|FileName|Filename)\s*:\s*"([^"]+)"/gim;

	for (const match of text.matchAll(pattern)) {
		const path = normalizeReferencePath(match[2] ?? '');
		if (!path) continue;
		if (match[1] === 'RelativeFilename') relativePaths.add(path);
		else filePaths.add(path);
	}

	return relativePaths.size > 0 ? relativePaths : filePaths;
};

const collectBinaryReferences = (buffer: ArrayBuffer) => {
	if (buffer.byteLength < 27) return new Set<string>();
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	const decoder = new TextDecoder();
	const version = view.getUint32(23, true);
	const nodeHeaderLength = version >= 7500 ? 25 : 13;
	const relativePaths = new Set<string>();
	const filePaths = new Set<string>();
	const hasBytes = (offset: number, length: number, limit: number) =>
		Number.isSafeInteger(offset) &&
		Number.isSafeInteger(length) &&
		offset >= 0 &&
		length >= 0 &&
		offset + length <= limit &&
		offset + length <= buffer.byteLength;
	const readString = (offset: number, length: number) => decoder.decode(bytes.subarray(offset, offset + length));

	const skipProperty = (offset: number, limit: number): [string | null, number] => {
		if (!hasBytes(offset, 1, limit)) return [null, limit];
		const type = String.fromCharCode(view.getUint8(offset));
		offset += 1;
		if (type === 'S') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const length = view.getUint32(offset, true);
			if (!hasBytes(offset + 4, length, limit)) return [null, limit];
			return [readString(offset + 4, length), offset + 4 + length];
		}
		const scalarLengths: Record<string, number> = { C: 1, Y: 2, I: 4, F: 4, D: 8, L: 8 };
		if (type in scalarLengths) {
			const length = scalarLengths[type] ?? 0;
			return hasBytes(offset, length, limit) ? [null, offset + length] : [null, limit];
		}
		if ('fdilb'.includes(type)) {
			if (!hasBytes(offset, 12, limit)) return [null, limit];
			const byteLength = view.getUint32(offset + 8, true);
			return hasBytes(offset + 12, byteLength, limit) ? [null, offset + 12 + byteLength] : [null, limit];
		}
		if (type === 'R') {
			if (!hasBytes(offset, 4, limit)) return [null, limit];
			const byteLength = view.getUint32(offset, true);
			return hasBytes(offset + 4, byteLength, limit) ? [null, offset + 4 + byteLength] : [null, limit];
		}
		return [null, limit];
	};

	const parseNode = (offset: number): number => {
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
		const name = readString(nameOffset, nameLength);
		let cursor = nameOffset + nameLength;
		const propertyEnd = cursor + propertyLength;
		if (!Number.isSafeInteger(propertyEnd) || propertyEnd > end) return end;
		const strings: string[] = [];
		while (cursor < propertyEnd) {
			const [value, next] = skipProperty(cursor, propertyEnd);
			if (value) strings.push(value);
			if (next <= cursor) return end;
			cursor = next;
		}
		if (PATH_PROPERTY_NAMES.has(name)) {
			strings.map(normalizeReferencePath).filter(Boolean).forEach((path) => {
				if (name === 'RelativeFilename') relativePaths.add(path);
				else filePaths.add(path);
			});
		}
		while (cursor + nodeHeaderLength <= end) {
			const nextOffset = parseNode(cursor);
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

	return relativePaths.size > 0 ? relativePaths : filePaths;
};

export const inspectFbxTextureReferences = async (file: File) => {
	const buffer = await file.arrayBuffer();
	const header = new TextDecoder().decode(
		new Uint8Array(buffer).subarray(0, BINARY_HEADER_PREFIX.length)
	);
	const paths = header === BINARY_HEADER_PREFIX
		? collectBinaryReferences(buffer)
		: collectTextReferences(new TextDecoder().decode(buffer));
	return [...paths];
};
