/** Java版のbig-endian NBT。long arrayはビット列のまま保持し、精度を落とさない。 */
export interface NbtLongArray {
	kind: 'long-array';
	view: DataView;
	length: number;
}
export type NbtValue =
	| number
	| bigint
	| string
	| Uint8Array
	| Int32Array
	| NbtLongArray
	| NbtValue[]
	| NbtCompound;
export interface NbtCompound {
	[key: string]: NbtValue;
}

export const asCompound = (value: NbtValue | undefined): NbtCompound | undefined =>
	value !== null && typeof value === 'object' && !Array.isArray(value)
		&& !ArrayBuffer.isView(value) && !('kind' in value)
		? value as NbtCompound
		: undefined;

export const MAX_NBT_BYTES = 32 * 1024 * 1024;

export const readNbt = (bytes: Uint8Array): NbtCompound => {
	if (bytes.byteLength > MAX_NBT_BYTES) {
		throw new Error('チャンクの展開サイズが上限を超えています');
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const decoder = new TextDecoder();
	let offset = 0;
	let nodes = 0;
	const take = (size: number) => {
		if (!Number.isSafeInteger(size) || size < 0 || offset + size > view.byteLength) {
			throw new Error('NBTデータが途中で切れているか、長さが不正です');
		}
		const start = offset;
		offset += size;
		return start;
	};
	const byte = () => view.getUint8(take(1));
	const string = () => {
		const size = view.getUint16(take(2));
		return decoder.decode(bytes.subarray(take(size), offset));
	};
	const count = (stride: number) => {
		const length = view.getInt32(take(4));
		if (length < 0 || length * stride > view.byteLength - offset) {
			throw new Error('NBT配列の長さが不正です');
		}
		return length;
	};
	const payload = (type: number, depth: number): NbtValue => {
		if (++nodes > 1_000_000 || depth > 64) throw new Error('NBTの構造が大きすぎます');
		switch (type) {
			case 1:
				return view.getInt8(take(1));
			case 2:
				return view.getInt16(take(2));
			case 3:
				return view.getInt32(take(4));
			case 4:
				return view.getBigInt64(take(8));
			case 5:
				return view.getFloat32(take(4));
			case 6:
				return view.getFloat64(take(8));
			case 7: {
				const size = count(1);
				return bytes.subarray(take(size), offset);
			}
			case 8:
				return string();
			case 9: {
				const elementType = byte();
				const size = count(1);
				if (size > 1_000_000 - nodes || (size > 0 && elementType === 0)) {
					throw new Error('NBTリストの長さまたは型が不正です');
				}
				return Array.from({ length: size }, () => payload(elementType, depth + 1));
			}
			case 10: {
				const result: NbtCompound = Object.create(null);
				for (let childType = byte(); childType !== 0; childType = byte()) {
					const name = string();
					if (Object.hasOwn(result, name)) {
						throw new Error('NBTに同名のタグが重複しています');
					}
					result[name] = payload(childType, depth + 1);
				}
				return result;
			}
			case 11: {
				const size = count(4);
				return Int32Array.from({ length: size }, () => view.getInt32(take(4)));
			}
			case 12: {
				const size = count(8);
				return {
					kind: 'long-array',
					view: new DataView(bytes.buffer, bytes.byteOffset + take(size * 8), size * 8),
					length: size
				};
			}
			default:
				throw new Error(`未対応のNBTタグです（${type}）`);
		}
	};
	if (byte() !== 10) throw new Error('チャンクのNBTルートがcompoundではありません');
	string();
	const root = payload(10, 0) as NbtCompound;
	if (offset !== bytes.byteLength) throw new Error('NBTの末尾に不正なデータがあります');
	return root;
};
